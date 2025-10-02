import { queue } from 'async'

import got from './got.js'
import mbtiles from './mbtiles.js'
import { Options, Tile } from './types.js'
import { getTileChildren } from './utils.js'
import { getURL } from './wms.js'
import { getTileURL } from './tile.js'
import { isEmptyImage } from './image.js'

const manager = async (
    baseUrl: string,
    layer: string,
    mbtilesFile: string,
    {
        startTile = {
            x: 0,
            y: 0,
            z: 0,
        },
        maxZoom = 3,
        concurrency = 2,
        tileSize = 512,
        emptyTileSizes = [],
        skipTransparent = false,
        serverType = 'wms',
        transparent = true,
        format = 'image/png',
        verbose = false,
    }: Options,
) => {
    const db = await mbtiles(`${mbtilesFile}?mode=rwc`)
    await db.startWriting()
    const q = queue(async (tile: Tile, callback) => {
        const { x, y, z } = tile
        if (z > maxZoom) {
            callback()
            return
        }
        const d = await db.get(z, x, y).catch(async () => {
            const url =
                serverType == 'wms'
                    ? getURL(baseUrl, layer, x, y, z, {
                          tileSize,
                          width: tileSize,
                          height: tileSize,
                          transparent,
                          format,
                      })
                    : getTileURL(baseUrl, x, y, z)
            if (verbose) {
                console.log(url)
            }
            const f = await got(url, {
                resolveBodyOnly: true,
                responseType: 'buffer',
            }).catch((error) => {
                console.log(z, x, y, error)
                return undefined
            })

            if (f == undefined) {
                return undefined
            }

            const isTransparent = skipTransparent
                ? await isEmptyImage(f)
                : undefined

            console.log(
                z,
                x,
                y,
                'Downloaded',
                f?.length,
                'bytes',
                skipTransparent
                    ? isTransparent
                        ? 'transparent'
                        : 'not transparent'
                    : '',
            )
            await db.put(z, x, y, f)
            return f
        })

        if (d != undefined && !emptyTileSizes.includes(d.length)) {
            q.unshift(getTileChildren({ x, y, z }))
        }

        callback()
    }, concurrency)

    q.push(startTile)

    await q.drain().finally(db.stopWriting)
}

export default manager
