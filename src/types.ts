export interface Options {
    maxZoom?: number
    concurrency?: number
    tileSize?: number
    emptyTileSizes?: number[]
    skipTransparent?: boolean
    serverType?: ServerType
    verbose?: boolean
    startTile?: Tile
    // wms options
    mosaicDownload?: boolean
    maxWidth?: number
    transparent?: boolean
    format?: string
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
    quartals: ImageType[]
    symbol: string
}

export enum ImageType {
    transparent = 'transparent',
    solid = 'solid',
    mixed = 'mixed',
}

export enum CompressionType {
    none = 'none',
    webp = 'webp',
    png = 'png',
}
