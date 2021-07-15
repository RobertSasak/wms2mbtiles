import { queue } from 'async'

import got from './got.js'
import mbtiles from './mbtiles.js'
import { Options, Tile } from './types.js'
import { getTileChildren } from './utils.js'
import { getURL } from './wms.js'

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
        emptyTileSizes = [334, 1096, 582],
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
            const url = getURL(baseUrl, layer, x, y, z, {
                tileSize,
                width: tileSize,
                height: tileSize,
            })
            console.log(z, x, y, 'Downloading')
            return await got(url, {
                resolveBodyOnly: true,
                responseType: 'buffer',
            }).catch((error) => {
                console.log(z, x, y, error)
                return undefined
            })
        })
        if (d !== undefined) {
            db.put(z, x, y, d)
            if (emptyTileSizes.every((a) => a !== d.length)) {
                q.unshift(getTileChildren({ x, y, z }))
            }
        }
        callback()
    }, concurrency)

    q.push(startTile)

    await q.drain().finally(db.stopWriting)
}

export default manager
