import sharp from 'sharp'

export const isEmptyImage = async (buffer: Buffer) => {
    const image = sharp(buffer)
    const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true })

    const { channels } = info

    if (channels != 3 && channels != 4) {
        throw new Error('Unsupported number of channels')
    }
    for (let i = 0; i < data.length; i += channels) {
        if (channels === 4 && data[i + 3] !== 0) {
            return false
        } else if (
            channels === 3 &&
            (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255)
        ) {
            return false
        }
    }
    return true
}
