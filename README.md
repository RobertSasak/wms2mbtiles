# wms2mbtiles

Download maps from WMS and save it into mbtiles. Instead of selecting an area and then download it this library starts with a top tile. Then download 4 subtiles. Everytime it encounters en empty/transparent map tile this area is skipped. This is more suitable for sparse maps.

## Install

```sh
yarn global add wms2mbtiles
# or
npm add -g wms2mbtiles
```

## Usage

```
$ wms2mbtiles http://wms.server.com satellite satellite.mbtiles -m 2 -c 4
```
