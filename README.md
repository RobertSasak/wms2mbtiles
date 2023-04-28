# wms2mbtiles

Download maps from WMS server and save it into mbtiles. Instead of selecting an area and then download it this library starts with a top tile. Then download 4 subtiles. Everytime it encounters en empty/transparent map tile this area is skipped. This is more suitable for sparse maps.

## Install

```sh
yarn global add wms2mbtiles
# or
npm add -g wms2mbtiles
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
    --maxZoom, -m       maximal zoom to download, default 3
    --concurrency, -c   number of concurrent downloads, defaukt 2
    --tileSize, -t      tile size in pixels, default 512
    --emptyTileSize, -e size of empty tile in bytes, default 334, 1096, 582
                        use it multiple times to set multiple sizes
    Coordinates of a starting tile
    -z                  zoom, default 0
    -x                  x, default 0
    -y                  y, default 0


  Examples
    $ wms2mbtiles https://mywmsserver.com roads output.mbtiles
    $ wms2mbtiles https://mywmsserver.com roads output.mbtiles
      --maxZoom 5 \
      --concurrency 2 \
      --tileSize 256 \
      --emptyTileSize 132 \
      --emptyTileSize 456
```
