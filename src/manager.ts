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

const OFF_ZOOM = 30

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
        skipSolid = OFF_ZOOM,
        solidThreshold = 0,
        skipMixed = OFF_ZOOM,
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
    const transparentTile = await createSolidTile(
        tileSize * 2,
        '#00000000',
        compression,
    )
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
                    if (quads.every((a) => a === undefined)) {
                        return undefined
                    }
                    const mosaic = createMosaic(quads, tileSize)
                    f = await compressTile(mosaic, compression, quality)
                } else {
                    url = getUrl(x, y, z)
                    f = await downloadUrl(url)
                    if (!f) {
                        return undefined
                    }
                    downloaded++
                    downloadedSize = f?.length ?? 0
                    downloadedData += downloadedSize
                }
                if (z < skipMixed) {
                    f = await compressTile(f, compression, quality)
                } else {
                    const { fullImage } = await getImageInfo(f, solidThreshold)
                    if (fullImage === ImageType.mixed) {
                        mixedSkipped++
                        f = transparentTile
                    } else {
                        f = await compressTile(f, compression, quality)
                    }
                }
                await db.put(z, x, y, f)
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
                downloadedSize,
                'bytes | compressed ~',
                d.length,
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
                if (type === ImageType.transparent) {
                    return undefined
                } else if (z >= skipSolid && color) {
                    mustCommit = true
                    solidTiles++
                    const solidImage = await createSolidTile(
                        upscale ? tileSize * 2 : tileSize,
                        color,
                        compression,
                    )
                    const recursive = async (t: Tile) => {
                        if (t.z > maxZoom) {
                            return
                        }
                        await db.put(t.z, t.x, t.y, solidImage)
                        const children = getTileChildren(t)
                        for (const c of children) {
                            await recursive(c)
                        }
                    }
                    await recursive(c)
                }
                return c
            })
            const a = await Promise.all(parallel)
            q.unshift(a.filter((b): b is Tile => b !== undefined))
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
    if (skipSolid < OFF_ZOOM) {
        console.log('Solid tiles:', solidTiles)
    }
    if (skipMixed) {
        console.log('Skipped mixed tiles:', mixedSkipped)
    }
    console.log('Skipped tiles:', skipped)
}

export default manager
