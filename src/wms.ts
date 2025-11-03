// https://github.com/mapbox/whoots-js

import { getTileBBox } from './epsg3857.js'

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
    styles?: string
    dpi?: number
    mapResolution?: number
    formatOptions?: string
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
        styles = '',
        dpi,
        mapResolution,
        formatOptions,
    }: WMSOptions,
): string => {
    const url =
        baseUrl +
        '?' +
        [
            ['bbox', getTileBBox(x, y, z, tileSize)],
            ['format', format],
            ['service', service],
            ['version', version],
            ['request', request],
            ['srs', srs],
            ['width', width],
            ['height', height],
            ['layers', layer],
            ['transparent', transparent],
            ['styles', styles],
            ['dpi', dpi],
            ['map_resolution', mapResolution],
            ['format_options', formatOptions],
        ]
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => k + '=' + v)
            .join('&')

    return url
}
