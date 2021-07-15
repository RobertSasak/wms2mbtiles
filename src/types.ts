export interface Options {
    startTile?: Tile
    maxZoom?: number
    tileSize?: number
    concurrency?: number
    emptyTileSizes?: number[]
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
