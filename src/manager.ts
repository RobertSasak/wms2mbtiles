import { queue } from 'async'

import got from './got.js'
import mbtiles from './mbtiles.js'
import {
    CompressionType,
    ImageType,
    Options,
    Tile,
    WMSOptions,
} from './types.js'
import { getMaxMosaicWidth, getTileChildren } from './utils.js'
import { getURL } from './wms.js'
import { getTileURL } from './tile.js'
import { compressTile, getImageInfo, sliceMosaic } from './image.js'

const downloadUrl = async (url: string) => {
    return await got(url, {
        resolveBodyOnly: true,
        responseType: 'buffer',
        timeout: {
            response: 60000,
            socket: 60000,
        },
    }).catch((error) => {
        console.log('Download error:', error.message)
        return undefined
    })
}

const manager = async (
    baseUrl: string,
    layer: string,
    mbtilesFile: string,
    {
        maxZoom = 3,
        concurrency = 2,
        tileSize = 512,
        emptyTileSizes = [],
        serverType = 'wms',
        skipTransparent = false,
        verbose = false,
        startTile = {
            x: 0,
            y: 0,
            z: 0,
        },
        // WMS options
        mosaicDownload = false,
        maxWidth = 2048,
        transparent = true,
        format = 'image/png',
        // compression
        compression = CompressionType.none,
        quality = 80,
    }: Options,
) => {
    const wmsOptions: WMSOptions = {
        tileSize,
        width: tileSize,
        height: tileSize,
        transparent,
        format,
    }
    const db = await mbtiles(`${mbtilesFile}?mode=rwc`)
    await db.startWriting()
    let total = 0,
        skipped = 0,
        downloaded = 0,
        downloadedData = 0,
        mosaicImages = 0
    const q = queue(async ({ x, y, z }: Tile, callback) => {
        if (z > maxZoom) {
            callback()
            return
        }
        total++
        let url
        let cached = true
        const d = await db
            .get(z, x, y)
            .then((d) => {
                skipped++
                return d
            })
            .catch(async () => {
                cached = false
                url =
                    serverType == 'wms'
                        ? getURL(baseUrl, layer, x, y, z, wmsOptions)
                        : getTileURL(baseUrl, x, y, z)
                const f = await downloadUrl(url)
                if (f) {
                    downloaded++
                    downloadedData += f.length
                    await db.put(
                        z,
                        x,
                        y,
                        await compressTile(f, compression, quality),
                    )
                }
                return f
            })

        if (verbose && !cached) {
            console.log(url)
        }

        if (d == undefined) {
            console.log(`Tile ${z} ${x} ${y} failed to download ${url}`)
            callback()
            return
        }

        if (emptyTileSizes.includes(d.length)) {
            console.log(
                `Empty tile ${z} ${x} ${y} downloaded ~`,
                d.length,
                `bytes`,
            )
            callback()
            return
        }

        if (!skipTransparent) {
            q.unshift(getTileChildren({ x, y, z }))
            console.log(`Tile `, z, x, y, ` downloaded ~`, d.length, `bytes`)
            callback()
            return
        }

        const { fullImage, quartals, symbol } = await getImageInfo(d)

        if (!cached) {
            console.log(
                `${symbol} Tile `,
                z,
                x,
                y,
                'downloaded ~',
                d.length,
                'bytes',
            )
        } else if (verbose) {
            console.log(
                `${symbol} Tile`,
                z,
                x,
                y,
                'cached ~',
                d.length,
                'bytes',
            )
        }

        if (
            mosaicDownload &&
            fullImage === ImageType.solid &&
            serverType == 'wms' &&
            z < maxZoom
        ) {
            const {
                z: mz,
                x: mx,
                y: my,
                width: mosaicSize,
            } = getMaxMosaicWidth(z, x, y, maxZoom, maxWidth, tileSize)
            if (!(await db.get(mz, mx, my).catch(() => false))) {
                const url = getURL(baseUrl, layer, x, y, z, {
                    ...wmsOptions,
                    tileSize: mosaicSize,
                    width: mosaicSize,
                    height: mosaicSize,
                })
                const mosaic = await downloadUrl(url)
                console.log(
                    'Downloading mosaic',
                    z,
                    x,
                    y,
                    'tile of size',
                    mosaicSize,
                    'px ~',
                    mosaic?.length,
                    'bytes',
                )
                if (verbose) {
                    console.log(url)
                }
                if (mosaic) {
                    downloadedData += mosaic.length
                    const tiles = await sliceMosaic(
                        mosaic,
                        tileSize,
                        compression,
                        quality,
                    )
                    for (let { tile, dx, dy } of tiles) {
                        mosaicImages++
                        if (verbose) {
                            console.log(
                                `- mosaic tile`,
                                mz,
                                mx + dx,
                                my + dy,
                                '~',
                                tile.length,
                                'bytes',
                            )
                        }
                        await db.put(mz, mx + dx, my + dy, tile)
                    }
                    await db._commit()
                }
            }
        }

        const children = getTileChildren({ x, y, z })
        for (let i = 3; i >= 0; i--) {
            if (quartals[i] !== ImageType.transparent) {
                q.unshift(children[i])
            }
        }

        callback()
    }, concurrency)

    q.push(startTile)

    await q.drain().finally(db.stopWriting)
    console.log('Downloaded tiles:', downloaded)
    console.log('Downloaded data:', downloadedData, 'bytes')
    console.log('Total tiles:', total)
    if (mosaicDownload) {
        console.log('Mosaic tiles:', mosaicImages)
        console.log('Skipped tiles:', skipped)
    }
}

export default manager
