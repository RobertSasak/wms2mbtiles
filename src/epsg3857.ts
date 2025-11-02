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

const EARTH_RADIUS = 6378137
const MAX_COORD = EARTH_RADIUS * Math.PI

export const getMercCoords = (
    x: number,
    y: number,
    z: number,
    tileSize = 512,
): [number, number] => {
    const resolution = (2 * Math.PI * 6378137) / tileSize / Math.pow(2, z)
    const mercX = x * resolution - MAX_COORD
    const mercY = y * resolution - MAX_COORD
    return [mercX, mercY]
}
