import { Tile } from './types.js'

export const getTileChildren = ({
    x,
    y,
    z,
}: Tile): [Tile, Tile, Tile, Tile] => {
    const xx = x * 2
    const yy = y * 2
    const zz = z + 1
    return [
        { x: xx, y: yy, z: zz },
        { x: xx + 1, y: yy, z: zz },
        { x: xx, y: yy + 1, z: zz },
        { x: xx + 1, y: yy + 1, z: zz },
    ]
}

export const getMaxMosaicWidth = (
    z: number,
    x: number,
    y: number,
    maxZoom: number,
    maxWidth: number,
    tileSize: number,
) => {
    let width = tileSize
    while (z < maxZoom && width < maxWidth) {
        ;({ z, x, y } = getTileChildren({ x, y, z })[0])
        width *= 2
    }
    return { z, x, y, width }
}
