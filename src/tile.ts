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
}

export const getTileURL = (
    baseUrl: string,
    x: number,
    y: number,
    z: number,
): string => {
    return baseUrl
        .replace('{x}', x.toString())
        .replace('{y}', y.toString())
        .replace('{z}', z.toString())
}
