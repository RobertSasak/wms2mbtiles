import { Tile } from './types.js'

export const getTileChildren = ({ x, y, z }: Tile) => {
    const xx = x * 2
    const yy = y * 2
    const zz = z + 1
    return [
        { x: xx, y: yy, z: zz },
        { x: xx + 1, y: yy, z: zz },
        { x: xx, y: yy + 1, z: zz },
        { x: xx + 1, y: yy + 1, z: zz },
    ]
}
