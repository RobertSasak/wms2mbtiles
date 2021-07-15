#!/usr/bin/env node

import meow from 'meow'
import manager from './manager.js'

const cli = meow(
    `  Usage
    $ wms2mbtiles <wmsUrl> <layer> <output.mbtiles>

  Options
    --maxZoom, -m     maximal zoom to download, default 3
    --concurrency, -c number of concurrent downloads, defaukt 2
    --tileSize, -t    tile size in pixels, default 512
    Coordinates of a starting tile
    -z                zoom, default 0
    -x                x, default 0
    -y                y, default 0

  Examples
    $ wms2mbtiles https://mywmsserver.com roads output.mbtiles
    $ wms2mbtiles https://mywmsserver.com roads output.mbtiles
      --maxZoom 5\\
      --concurrency 2\\
      --tileSize 256
`,
    {
        importMeta: import.meta,
        flags: {
            maxZoom: {
                type: 'number',
                alias: 'm',
            },
            concurrency: {
                type: 'number',
                alias: 'c',
            },
            tileSize: {
                type: 'number',
                alias: 't',
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
            emptyTileSize: {
                type: 'number',
                isMultiple: true,
            },
        },
    },
)
if (cli.input.length === 0) {
    cli.showHelp()
} else if (cli.input.length != 3) {
    console.error(
        'You need to provide these three parameters: wmsUrl, layer and output files',
    )
} else {
    const [wmsUrl, layer, outputFile] = cli.input
    const { z, x, y } = cli.flags
    const startTile = {
        z,
        x,
        y,
    }
    manager(wmsUrl, layer, outputFile, {
        ...cli.flags,
        startTile,
    })
}
