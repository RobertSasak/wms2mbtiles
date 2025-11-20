import { queue } from 'async'
import terminalLink from 'terminal-link'

import got from './got.js'
import mbtiles from './mbtiles.js'
import { CompressionType, ImageType, Options, Tile } from './types.js'
import { getMaxMosaicWidth, getTileChildren } from './utils.js'
import { getWMSURL, WMSOptions } from './wms.js'
import { ArgisOptions, getArcgisURL } from './arcgis.js'
import { getTileURL } from './tile.js'
import {
    compressTile,
    createMosaic,
    createSolidTile,
    getImageInfo,
    sliceMosaic,
} from './image.js'

const downloadUrl = async (url: string): Promise<Buffer | undefined> => {
    return await got(url, {
        resolveBodyOnly: true,
        responseType: 'buffer',
        timeout: {
            response: 60000,
            socket: 60000,
        },
    }).catch((error) => {
        console.log(url)
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
        upscale = false,
        emptyTileSizes = [],
        serverType = 'wms',
        skipTransparent = false,
        skipSolid = false,
        solidThreshold = 0,
        skipMixed = 30,
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
        dpi,
        mapResolution,
        formatOptions,
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
        dpi,
        mapResolution,
        formatOptions,
    }
    const arcgisOptions: ArgisOptions = {
        tileSize,
        width: tileSize,
        height: tileSize,
        format,
    }

    const getUrl =
        serverType == 'wms'
            ? (x: number, y: number, z: number) =>
                  getWMSURL(baseUrl, layer, x, y, z, wmsOptions)
            : serverType == 'arcgis'
            ? (x: number, y: number, z: number) =>
                  getArcgisURL(baseUrl, x, y, z, arcgisOptions)
            : (x: number, y: number, z: number) => getTileURL(baseUrl, x, y, z)
    const db = await mbtiles(`${mbtilesFile}?mode=rwc`)
    await db.startWriting()
    let total = 0,
        skipped = 0,
        downloaded = 0,
        downloadedData = 0,
        mosaicImages = 0,
        solidTiles = 0,
        mixedSkipped = 0
    const q = queue(async ({ x, y, z }: Tile, callback) => {
        if (z > maxZoom) {
            callback()
            return
        }
        total++
        let url
        let cached = true
        let downloadedSize
        const d = await db
            .get(z, x, y)
            .then((d) => {
                skipped++
                return d
            })
            .catch(async () => {
                cached = false
                let f: Buffer | undefined
                if (upscale) {
                    const urls = getTileChildren({ x, y, z }).map(
                        ({ z, x, y }) => getUrl(x, y, z),
                    )
                    url = urls.join('\n')
                    const buffers = urls.map((u) => downloadUrl(u))
                    const quads = (await Promise.all(buffers)) as [
                        Buffer | undefined,
                        Buffer | undefined,
                        Buffer | undefined,
                        Buffer | undefined,
                    ]
                    downloaded += 4
                    downloadedSize = quads.reduce(
                        (p, v) => p + (v?.length || 0),
                        0,
                    )
                    downloadedData += downloadedSize
                    if (quads.some((a) => a === undefined)) {
                        f = undefined
                    }
                    const mosaic = createMosaic(quads, tileSize)
                    f = await compressTile(mosaic, compression, quality)
                } else {
                    url = getUrl(x, y, z)
                    f = await downloadUrl(url)
                    if (f) {
                        downloaded++
                        downloadedSize = f.length
                        downloadedData += downloadedSize

                        if (z >= skipMixed) {
                            const { fullImage } = await getImageInfo(
                                f,
                                solidThreshold,
                            )
                            if (fullImage === ImageType.mixed) {
                                mixedSkipped++
                                const solid = createSolidTile(
                                    tileSize,
                                    '#00000000',
                                )
                                f = await compressTile(solid, compression, 1)
                            }
                        } else {
                            f = await compressTile(f, compression, quality)
                        }
                    }
                }
                if (f) {
                    await db.put(z, x, y, f)
                }
                return f
            })

        if (verbose && !cached && url) {
            console.log(url)
        }

        if (d == undefined) {
            console.log('Tile ', z, x, y, 'failed to download', url)
            callback()
            return
        }

        if (emptyTileSizes.includes(d.length)) {
            console.log('E Tile', z, x, y, 'downloaded ~', d.length, 'bytes')
            callback()
            return
        }

        if (!skipTransparent) {
            q.unshift(getTileChildren({ x, y, z }))
            console.log('Tile', z, x, y, 'downloaded ~', d.length, 'bytes')
            callback()
            return
        }

        const { fullImage, quartals, symbol } = await getImageInfo(
            d,
            solidThreshold,
        )

        if (!cached) {
            console.log(
                symbol,
                terminalLink('Tile', url ?? '', { fallback: () => 'Tile' }),
                fullImage.padEnd(11),
                z,
                x,
                y,
                'downloaded ~',
                d.length,
                'bytes compressed ~',
                downloadedSize,
                'bytes',
            )
        } else if (verbose) {
            console.log(symbol, 'Tile', z, x, y, 'cached ~', d.length, 'bytes')
        }

        if (mosaicDownload && fullImage === ImageType.opaque && z < maxZoom) {
            const {
                z: mz,
                x: mx,
                y: my,
                width: mosaicSize,
            } = getMaxMosaicWidth(z, x, y, maxZoom, maxWidth, tileSize)
            if (!(await db.get(mz, mx, my).catch(() => false))) {
                const url =
                    serverType === 'wms'
                        ? getWMSURL(baseUrl, layer, x, y, z, {
                              ...wmsOptions,
                              tileSize: mosaicSize,
                              width: mosaicSize,
                              height: mosaicSize,
                          })
                        : getArcgisURL(baseUrl, x, y, z, {
                              ...arcgisOptions,
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
                    const parallel = tiles.map(async ({ tile, dx, dy }) => {
                        if (verbose) {
                            console.log(
                                '- mosaic tile',
                                mz,
                                mx + dx,
                                my + dy,
                                '~',
                                tile.length,
                                'bytes',
                            )
                        }
                        mosaicImages++
                        await db.put(mz, mx + dx, my + dy, tile)
                    })
                    await Promise.all(parallel)
                    await db._commit()
                }
            }
        }

        const children = getTileChildren({ x, y, z })
        if (z < maxZoom) {
            let mustCommit = false
            const parallel = children.map(async (c, i) => {
                const { type, color } = quartals[i]
                const { z, x, y } = c
                if (skipSolid && color) {
                    mustCommit = true
                    solidTiles++
                    const exists = await db
                        .get(z, x, y)
                        .then(() => true)
                        .catch(() => false)
                    if (!exists) {
                        const solidImage = createSolidTile(
                            upscale ? tileSize * 2 : tileSize,
                            color,
                        )
                        const compressed = await compressTile(
                            solidImage,
                            compression,
                            100,
                            false,
                        )
                        await db.put(z, x, y, compressed)
                    }
                }
                if (type !== ImageType.transparent) {
                    q.unshift(c)
                }
            })
            await Promise.all(parallel)
            if (mustCommit) {
                await db._commit()
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
    }
    if (skipSolid) {
        console.log('Solid tiles:', solidTiles)
    }
    if (skipMixed) {
        console.log('Skipped mixed tiles:', mixedSkipped)
    }
    console.log('Skipped tiles:', skipped)
}

export default manager
