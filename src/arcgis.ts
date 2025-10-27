import { getTileBBox } from './utils.js'

export interface ArgisOptions {
    format?: string
    bboxSR?: string
    f?: string
    width?: number
    height?: number
    tileSize?: number
    transparent?: boolean
}

export const getArcgisURL = (
    baseUrl: string,
    x: number,
    y: number,
    z: number,
    {
        format = 'png',
        bboxSR = '3857',
        f = 'image',
        width = 512,
        height = 512,
        tileSize = 512,
        transparent = true,
    }: ArgisOptions,
): string => {
    const url =
        baseUrl +
        '?' +
        [
            'bbox=' + getTileBBox(x, y, z, tileSize),
            'format=' + format,
            'size=' + width + ',' + height,
            'bboxSR=' + bboxSR,
            'transparent=' + transparent,
            'f=' + f,
        ].join('&')

    return url
}
