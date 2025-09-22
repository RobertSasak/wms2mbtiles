// https://github.com/mapbox/whoots-js

export interface GetUrlOptions {
    format?: string
    tileSize?: number
    service?: string
    version?: string
    request?: string
    srs?: string
    width?: number
    height?: number
    transparent?: boolean
}

export const getURL = (
    baseUrl: string,
    layer: string,
    x: number,
    y: number,
    z: number,
    {
        format = 'image/png',
        service = 'WMS',
        version = '1.1.1',
        request = 'GetMap',
        tileSize = 512,
        srs = 'EPSG:3857',
        width = 512,
        height = 512,
        transparent = true,
    }: GetUrlOptions,
): string => {
    const url =
        baseUrl +
        '?' +
        [
            'bbox=' + getTileBBox(x, y, z, tileSize),
            'format=' + format,
            'service=' + service,
            'version=' + version,
            'request=' + request,
            'srs=' + srs,
            'width=' + width,
            'height=' + height,
            'layers=' + layer,
            'transparent=' + transparent,
        ].join('&')

    return url
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
