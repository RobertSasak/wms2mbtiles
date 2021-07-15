// TODO: Add types to https://github.com/sindresorhus/is-jpg

export default (buffer: Buffer) => {
    if (!buffer || buffer.length < 3) {
        return false
    }

    return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
}
