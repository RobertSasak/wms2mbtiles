export interface Options {
    startTile?: Tile
    maxZoom?: number
    tileSize?: number
    concurrency?: number
    emptyTileSizes?: number[]
    serverType?: ServerType
    transparent?: boolean
    format?: string
    verbose?: boolean
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

export type ServerType = 'wms' | 'tile'
