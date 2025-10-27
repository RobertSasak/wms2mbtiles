// https://github.com/mapbox/whoots-js

import { getTileBBox } from './utils.js'

export interface WMSOptions {
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

export const getWMSURL = (
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
    }: WMSOptions,
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
