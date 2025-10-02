import sharp from 'sharp'
import { ImageInfo, ImageType } from './types.js'

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
    0: '⠀',
    1: '▗',
    2: '▖',
    3: '▄',
    4: '▝',
    5: '▐',
    6: '▞',
    7: '▟',
    8: '▘',
    9: '▚',
    10: '▌',
    11: '▙',
    12: '▀',
    13: '▜',
    14: '▛',
    15: '█',
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
