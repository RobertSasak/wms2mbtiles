import { queue } from 'async'

import got from './got.js'
import mbtiles from './mbtiles.js'
import { ImageType, Options, Tile } from './types.js'
import { getTileChildren } from './utils.js'
import { getURL } from './wms.js'
import { getTileURL } from './tile.js'
import { getImageInfo } from './image.js'

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
    let total = 0
    let downloaded = 0
    const q = queue(async ({ x, y, z }: Tile, callback) => {
        if (z > maxZoom) {
            callback()
            return
        }
        total++

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
            console.log(`Tile ${z} ${x} ${y} downloaded ~ ${f?.length} bytes`)

            downloaded++

            await db.put(z, x, y, f)
            return f
        })

        if (d == undefined) {
            callback()
            return
        }

        if (emptyTileSizes.includes(d.length)) {
            callback()
            return
        }

        if (!skipTransparent) {
            q.unshift(getTileChildren({ x, y, z }))
            callback()
            return
        }

        const { fullImage, quartals, symbol } = await getImageInfo(d)

        if (fullImage === ImageType.transparent) {
            callback()
            return
        }

        const children = getTileChildren({ x, y, z })
        if (quartals[0] !== ImageType.transparent) {
            q.unshift(children[0])
        }
        if (quartals[1] !== ImageType.transparent) {
            q.unshift(children[1])
        }
        if (quartals[2] !== ImageType.transparent) {
            q.unshift(children[2])
        }
        if (quartals[3] !== ImageType.transparent) {
            q.unshift(children[3])
        }

        callback()
    }, concurrency)

    q.push(startTile)

    await q.drain().finally(db.stopWriting)
    console.log('Downloaded tiles:', downloaded)
    console.log('Total tiles:', total)
}

export default manager
