#!/usr/bin/env node

import meow from 'meow'
import manager from './manager.js'

const cli = meow(
    `  Usage
    $ wms2mbtiles <wmsUrl> <layer> <output.mbtiles>

  Options
    --maxZoom, -m        maximal zoom to download, default 3
    --concurrency, -c    number of concurrent downloads, defaukt 2
    --tileSize, -t       tile size in pixels, default 512
    --emptyTileSizes, -e size of empty tile in bytes, default 334
                         use it multiple times to set multiple sizes
    Coordinates of a starting tile
    -z                   zoom, default 0
    -x                   x, default 0
    -y                   y, default 0
    

  Examples WMS
    $ wms2mbtiles https://mywmsserver.com roads output.mbtiles
    $ wms2mbtiles https://mywmsserver.com roads output.mbtiles
      --maxZoom 5 \\
      --concurrency 2 \\
      --tileSize 256 \\
      --emptyTileSizes 123 \\
      --emptyTileSizes 456

  Examples Tile server
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
                choices: ['wms', 'tile'],
                default: 'wms',
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
        },
    },
)
if (cli.input.length === 0) {
    cli.showHelp()
} else if (cli.input.length === 1) {
    console.error(
        'You need to provide at least two parameters: url and output file',
    )
} else {
    const serverType = cli.flags.serverType as 'wms' | 'tile'
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
        serverType,
        startTile,
    })
}
