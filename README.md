# wms2mbtiles

Download maps from WMS server and save it into mbtiles. Instead of selecting an area and then download it this library starts with a top tile. Then download 4 subtiles. Everytime it encounters en empty/transparent map tile this area is skipped. This is more suitable for sparse maps.

## Features

-   skip (empty) tiles by specifing tile size in bytes and it's children
-   skip transparent tiles and it's children
-   skip monochromatic(images with single background color) tiles and it's children
-   for WMS and Arcgic, speed up by requesting one single mosaic and then slicing it into tiles.
-   compress tiles on the fly to WEBP or PNG

## Install

```sh
yarn global add wms2mbtiles
# or
npm add -g wms2mbtiles
# or simply run without instalation
npx wm2mbtiles
```

## Usage

```sh
$ wms2mbtiles http://wms.server.com satellite satellite.mbtiles -m 2 -c 4
```

## Help

```sh
Download maps from WMS and save it into mbtiles.

  Usage
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
    WMS/Arcgis server options
    --mosaicDownload     faster downloading of of tiles by combining multiple
                         tiles into one request, default false
    --maxWidth           when mosaicDownload is set, maximal width of the
                         mosaic in pixels, default 2048
    --transparent        request transparent tiles, default true
    --format             image format, default image/png
    Tile compression
    --compression        compress tiles, options: none, png, webp. Need to be
                         provided when mosaicDownload is used, default none
    --quality            quality for compression, 0-100, default 80

  Example for a WMS
    $ wms2mbtiles https://mywmsserver.com roads output.mbtiles
    $ wms2mbtiles https://mywmsserver.com roads output.mbtiles
      --maxZoom 5 \
      --concurrency 2 \
      --tileSize 256 \
      --transparent false \
      --format image/png;mode=8bit \
      --verbose \
      --emptyTileSizes 123 \
      --emptyTileSizes 456

  Example for a Tile server
    $ wms2mbtiles https://mywmsserver.com/{z}/{x}/{y} output.mbtiles
      --serverType tile \
      --maxZoom 5 \
      --concurrency 2 \
      --emptyTileSizes 123 \
      --emptyTileSizes 456
```
