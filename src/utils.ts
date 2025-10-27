import { Tile } from './types.js'

export const getTileChildren = ({ x, y, z }: Tile) => {
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

export const getTileBBox = (
    x: number,
    y: number,
    z: number,
    tileSize = 512,
): string => {
    y = Math.pow(2, z) - y - 1

    const min = getMercCoords(x * tileSize, y * tileSize, z, tileSize)
    const max = getMercCoords(
        (x + 1) * tileSize,
        (y + 1) * tileSize,
        z,
        tileSize,
    )

    return `${min[0]},${min[1]},${max[0]},${max[1]}`
}

export const getMercCoords = (
    x: number,
    y: number,
    z: number,
    tileSize = 512,
): [number, number] => {
    const resolution = (2 * Math.PI * 6378137) / tileSize / Math.pow(2, z)
    const mercX = x * resolution - (2 * Math.PI * 6378137) / 2.0
    const mercY = y * resolution - (2 * Math.PI * 6378137) / 2.0

    return [mercX, mercY]
}
