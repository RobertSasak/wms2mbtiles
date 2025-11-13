import sharp, { PngOptions, Sharp, WebpOptions } from 'sharp'
import {
    CompressionType,
    ImageComposition,
    ImageInfo,
    ImageType,
} from './types.js'

const WEBP_OPTIONS: WebpOptions = {
    alphaQuality: 0,
    effort: 6,
}

const PNG_OPTIONS: PngOptions = {
    compressionLevel: 9,
    effort: 10,
    palette: true,
    adaptiveFiltering: true,
    progressive: true,
    force: true,
}

const checkRectagle = (
    data: Buffer<ArrayBufferLike>,
    channels: number,
    width: number,
    xStart: number,
    yStart: number,
    xEnd: number,
    yEnd: number,
): ImageComposition => {
    let transparent = true
    let solid = true
    let firstColor: string | undefined
    let isMonochromatic = true

    for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
            const i = (y * width + x) * channels
            const alpha = data[i + channels - 1]
            if (channels > 3 && alpha !== 255) {
                solid = false
                isMonochromatic = false
            } else {
                transparent = false
                const r = data[i]
                const g = data[i + 1]
                const b = data[i + 2]
                const color =
                    '#' +
                    r.toString(16).padStart(2, '0') +
                    g.toString(16).padStart(2, '0') +
                    b.toString(16).padStart(2, '0')

                if (!firstColor) {
                    firstColor = color
                } else if (color !== firstColor) {
                    isMonochromatic = false
                }
            }

            if (!solid && !transparent && !isMonochromatic) {
                return {
                    type: ImageType.mixed,
                }
            }
        }
    }

    if (transparent) {
        return { type: ImageType.transparent }
    }
    if (isMonochromatic) {
        return {
            type: ImageType.monochromatic,
            color: firstColor,
        }
    }
    return { type: ImageType.solid }
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

const getSymbol = (quadrants: ImageComposition[]) => {
    const q = quadrants
    const q3 = q[3].type === ImageType.transparent ? 0 : 1
    const q2 = q[2].type === ImageType.transparent ? 0 : 1
    const q1 = q[1].type === ImageType.transparent ? 0 : 1
    const q0 = q[0].type === ImageType.transparent ? 0 : 1
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
    }
    const quartals = [
        checkRectagle(data, channels, width, 0, 0, width / 2, height / 2),
        checkRectagle(data, channels, width, width / 2, 0, width, height / 2),
        checkRectagle(data, channels, width, 0, height / 2, width / 2, height),
        checkRectagle(
            data,
            channels,
            width,
            width / 2,
            height / 2,
            width,
            height,
        ),
    ]
    const symbol = getSymbol(quartals)
    let fullImage: ImageType
    if (quartals.every((q) => q.type === ImageType.mixed)) {
        fullImage = ImageType.transparent
    } else if (quartals.every((q) => q.type === ImageType.solid)) {
        fullImage = ImageType.solid
    } else {
        fullImage = ImageType.mixed
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
                    ...WEBP_OPTIONS,
                })
            } else if (compression === CompressionType.png) {
                t.png({
                    quality,
                    ...PNG_OPTIONS,
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

export const compressTile = async (
    buffer: Buffer,
    compression: CompressionType,
    quality: number,
): Promise<Buffer> => {
    if (compression === CompressionType.none) {
        return buffer
    }
    let s = await sharp(buffer)
    return compress(s, compression, quality)
}

export const createSolidTile = (
    width: number,
    compression: CompressionType,
    background: string,
): Promise<Buffer> => {
    const s = sharp({
        create: {
            width,
            height: width,
            background,
            channels: 3,
        },
    })
    return compress(s, compression, 1)
}

export const createMosaic = async (
    quads: [
        Buffer | undefined,
        Buffer | undefined,
        Buffer | undefined,
        Buffer | undefined,
    ],
    tileSize: number,
    compression: CompressionType,
    quality: number,
): Promise<Buffer> => {
    const compositeImages: sharp.OverlayOptions[] = [
        { input: quads[0], top: 0, left: 0 },
        { input: quads[1], top: 0, left: tileSize },
        { input: quads[2], top: tileSize, left: 0 },
        { input: quads[3], top: tileSize, left: tileSize },
    ].filter((a) => a.input)

    const s = await sharp({
        create: {
            width: tileSize * 2,
            height: tileSize * 2,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    }).composite(compositeImages)

    return compress(s, compression, quality)
}

const compress = (s: Sharp, compression: CompressionType, quality: number) => {
    if (compression === CompressionType.webp) {
        s.webp({ ...WEBP_OPTIONS, quality })
    } else if (compression === CompressionType.png) {
        s.png({ ...PNG_OPTIONS, quality })
    }
    return s.toBuffer()
}
