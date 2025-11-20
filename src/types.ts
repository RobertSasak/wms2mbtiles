export interface Options {
    maxZoom?: number
    concurrency?: number
    tileSize?: number
    upscale?: boolean
    emptyTileSizes?: number[]
    skipTransparent?: boolean
    skipMonochromatic?: boolean
    monoThreshold?: number
    serverType?: ServerType
    verbose?: boolean
    startTile?: Tile
    // wms options
    mosaicDownload?: boolean
    maxWidth?: number
    transparent?: boolean
    format?: string
    dpi?: number
    mapResolution?: number
    formatOptions?: string
    // compression options
    compression?: CompressionType
    quality?: number
}

export interface Tile {
    x: number
    y: number
    z: number
}

export interface TileWithImage extends Tile {
    image: Buffer
    last: boolean
}

export type ServerType = 'wms' | 'tile' | 'arcgis'

export interface ImageInfo {
    fullImage: ImageType
    quartals: ImageComposition[]
    symbol: string
}

export interface ImageComposition {
    type: ImageType
    color?: string
}

export enum ImageType {
    transparent = 'transparent',
    solid = 'solid',
    mixed = 'mixed',
    monochromatic = 'monochromatic',
}

export enum CompressionType {
    none = 'none',
    webp = 'webp',
    png = 'png',
}
