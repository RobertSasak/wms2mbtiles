import sharp from 'sharp'
import { CompressionType, ImageInfo, ImageType } from './types.js'

const checkRectagle = (
    data: Buffer<ArrayBufferLike>,
    width: number,
    height: number,
    channels: number,
    xStart: number,
    yStart: number,
    xEnd: number,
    yEnd: number,
) => {
    let transparent = true
    let solid = true
    for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
            const i = (y * width + x) * channels
            const alpha = data[i + 3]
            if (alpha === 0) {
                solid = false
            } else {
                transparent = false
            }
            if (!solid && !transparent) {
                return ImageType.mixed
            }
        }
    }
    return solid ? ImageType.solid : ImageType.transparent
}

const symbolMap: { [key: number]: string } = {
    0: '⠀', // 0000
    1: '▘', // 0001
    2: '▝', // 0010
    3: '▀', // 0011
    4: '▖', // 0100
    5: '▌', // 0101
    6: '▞', // 0110
    7: '▛', // 0111
    8: '▗', // 1000
    9: '▚', // 1001
    10: '▐', // 1010
    11: '▜', // 1011
    12: '▄', // 1100
    13: '▙', // 1101
    14: '▟', // 1110
    15: '█', // 1111
}

const getSymbol = (quadrants: ImageType[]) => {
    const q = quadrants
    const q3 = q[3] === ImageType.transparent ? 0 : 1
    const q2 = q[2] === ImageType.transparent ? 0 : 1
    const q1 = q[1] === ImageType.transparent ? 0 : 1
    const q0 = q[0] === ImageType.transparent ? 0 : 1
    const index = q3 * 8 + q2 * 4 + q1 * 2 + q0 * 1
    return symbolMap[index] || ' '
}

export const getImageInfo = async (buffer: Buffer): Promise<ImageInfo> => {
    const image = sharp(buffer)
    const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true })

    const { channels, width, height } = info

    if (channels < 3) {
        throw new Error('Unsupported number of channels')
    } else if (channels === 3) {
        return {
            fullImage: ImageType.solid,
            quartals: [
                ImageType.solid,
                ImageType.solid,
                ImageType.solid,
                ImageType.solid,
            ],
            symbol: '█',
        }
    }
    const quartals = [
        checkRectagle(
            data,
            width,
            height,
            channels,
            0,
            0,
            width / 2,
            height / 2,
        ),
        checkRectagle(
            data,
            width,
            height,
            channels,
            width / 2,
            0,
            width,
            height / 2,
        ),
        checkRectagle(
            data,
            width,
            height,
            channels,
            0,
            height / 2,
            width / 2,
            height,
        ),
        checkRectagle(
            data,
            width,
            height,
            channels,
            width / 2,
            height / 2,
            width,
            height,
        ),
    ]
    const symbol = getSymbol(quartals)
    let fullImage: ImageType
    if (quartals.includes(ImageType.mixed)) {
        fullImage = ImageType.mixed
    } else if (quartals.includes(ImageType.solid)) {
        fullImage = ImageType.solid
    } else {
        fullImage = ImageType.transparent
    }
    return {
        fullImage,
        quartals,
        symbol,
    }
}

export const sliceMosaic = async (
    buffer: Buffer,
    tileWidth: number,
    compression: CompressionType,
    quality: number,
) => {
    const image = sharp(buffer)
    const { width, height } = await image.metadata()
    let tiles = []
    for (let dy = 0; dy * tileWidth < width; dy++) {
        for (let dx = 0; dx * tileWidth < height; dx++) {
            const t = sharp(buffer).extract({
                left: dx * tileWidth,
                top: dy * tileWidth,
                width: tileWidth,
                height: tileWidth,
            })
            if (compression === CompressionType.webp) {
                t.webp({
                    quality,
                    alphaQuality: 0,
                    effort: 6,
                })
            } else if (compression === CompressionType.png) {
                t.png({
                    compressionLevel: 9,
                    effort: 10,
                    adaptiveFiltering: true,
                    quality: 100,
                    progressive: true,
                    palette: true,
                    force: true,
                })
            }
            tiles.push(
                t.toBuffer().then((tile) => ({
                    dx,
                    dy,
                    tile,
                })),
            )
        }
    }
    return Promise.all(tiles)
}

const compressTile = async (
    buffer: Buffer,
    compression: CompressionType,
    quality: number,
) => {
    if (compression === CompressionType.webp) {
        buffer = await sharp(buffer)
            .webp({
                quality,
                alphaQuality: 0,
                effort: 6,
            })
            .toBuffer()
    } else if (compression === CompressionType.png) {
        buffer = await sharp(buffer)
            .png({
                quality,
                compressionLevel: 9,
                effort: 10,
                palette: true,
            })
            .toBuffer()
    }
    return buffer
}
