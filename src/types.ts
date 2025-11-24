export interface Options {
    maxZoom?: number
    concurrency?: number
    tileSize?: number
    upscale?: boolean
    emptyTileSizes?: number[]
    skipTransparent?: boolean
    skipMixed?: number
    skipSolid?: number
    solidThreshold?: number
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

export interface Color {
    r: number
    g: number
    b: number
    a?: number
}

export interface ImageComposition {
    type: ImageType
    color?: Color
}

export enum ImageType {
    transparent = 'transparent',
    opaque = 'opaque',
    mixed = 'mixed',
    solid = 'solid',
}

export enum CompressionType {
    none = 'none',
    webp = 'webp',
    png = 'png',
}
