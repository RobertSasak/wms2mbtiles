#!/usr/bin/env node

import meow from 'meow'

import manager from './manager.js'
import { CompressionType, ServerType } from './types.js'

const cli = meow(
    `  Usage
    $ wms2mbtiles <wmsUrl> <layer> <output.mbtiles>

  Options
    --maxZoom, -m        maximal zoom to download, default 3
    --concurrency, -c    number of concurrent downloads, defaukt 2
    --tileSize, -t       tile size in pixels, default 512
    --emptyTileSizes, -e size of empty tile in bytes, default 334
                         use it multiple times to set multiple sizes
    --serverType, -s     server type, wms or tile, default wms
    --skipTransparent    skip tiles that are fully transparent, default false
    --skipMonochromatic  skip tiles contain only single color, default false
    --verbose, -v        verbose output, default false
    Coordinates of a starting tile
    -z                   zoom, default 0
    -x                   x, default 0
    -y                   y, default 0
    WMS server options
    --mosaicDownload     faster downloading of of tiles by combining multiple
                         tiles into one request, default false
    --maxWidth           when mosaicDownload is set, maximal width of the
                         mosaic in pixels, default 2048
    --transparent        request transparent tiles, default true
    --format             image format, default image/png
    --dpi                number, default omit
    --mapResolution      number, default omit
    --formatOptions      string, default omit
    Tile compression
    --compression        compress tiles, options: none, png, webp. Need to be 
                         provided when mosaicDownload is used, default none
    --quality            quality for compression, 0-100, default 80

  Example for a WMS
    $ wms2mbtiles https://mywmsserver.com roads output.mbtiles
    $ wms2mbtiles https://mywmsserver.com roads output.mbtiles
      --maxZoom 5 \\
      --concurrency 2 \\
      --tileSize 256 \\
      --transparent false \\
      --format image/png;mode=8bit \\
      --verbose \\
      --emptyTileSizes 123 \\
      --emptyTileSizes 456

  Example for a Tile server
    $ wms2mbtiles https://mywmsserver.com/{z}/{x}/{y} output.mbtiles
      --serverType tile \\
      --maxZoom 5 \\
      --concurrency 2 \\
      --emptyTileSizes 123 \\
      --emptyTileSizes 456
`,
    {
        importMeta: import.meta,
        flags: {
            maxZoom: {
                type: 'number',
                shortFlag: 'm',
                default: 3,
            },
            concurrency: {
                type: 'number',
                shortFlag: 'c',
            },
            tileSize: {
                type: 'number',
                shortFlag: 't',
            },
            emptyTileSizes: {
                type: 'number',
                shortFlag: 'e',
                isMultiple: true,
            },
            serverType: {
                type: 'string',
                shortFlag: 's',
                choices: ['wms', 'tile', 'arcgis'],
                default: 'wms',
            },
            skipTransparent: {
                type: 'boolean',
                default: false,
            },
            skipMonochromatic: {
                type: 'boolean',
                default: false,
            },
            verbose: {
                type: 'boolean',
                default: false,
                shortFlag: 'v',
            },
            x: {
                type: 'number',
                default: 0,
            },
            y: {
                type: 'number',
                default: 0,
            },
            z: {
                type: 'number',
                default: 0,
            },
            mosaicDownload: {
                type: 'boolean',
                default: false,
            },
            maxWidth: {
                type: 'number',
                default: 2048,
            },
            transparent: {
                type: 'boolean',
                default: true,
            },
            dpi: {
                type: 'number',
            },
            mapResolution: {
                type: 'number',
            },
            formatOptions: {
                type: 'string',
            },
            format: {
                type: 'string',
                default: 'image/png',
            },
            compression: {
                type: 'string',
                choices: ['none', 'png', 'webp'],
                default: 'none',
            },
            quality: {
                type: 'number',
                default: 80,
            },
        },
    },
)
if (cli.input.length === 0) {
    cli.showHelp()
} else if (cli.input.length === 1) {
    console.error(
        'You need to provide at least two parameters: url and output file',
    )
} else if (cli.flags.mosaicDownload && cli.flags.serverType === 'tile') {
    console.error('Mosaic download works only with server type WMS or Arcgis')
} else {
    const serverType = cli.flags.serverType as ServerType
    const compression = cli.flags.compression as CompressionType

    let [wmsUrl, layer, outputFile] = cli.input

    if (cli.input.length === 2) {
        outputFile = layer
    }
    const { z, x, y } = cli.flags
    const startTile = {
        z,
        x,
        y,
    }
    manager(wmsUrl, layer, outputFile, {
        ...cli.flags,
        compression,
        serverType,
        startTile,
    })
}
