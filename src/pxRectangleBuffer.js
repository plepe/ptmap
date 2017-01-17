/**
 * create a buffer around a rectangle by specifying pixels
 * @param {BoundingBox} bounds
 * @param {number} dist (px)
 * @param {L.map} map
 * @return {BoundingBox} bounds
 */
function pxRectangleBuffer (bounds, dist, map) {
  var sw = [ bounds.minlat, bounds.minlon ]
  var ne = [ bounds.maxlat, bounds.maxlon ]

  sw = map.project(sw, map.getZoom())
  ne = map.project(ne, map.getZoom())

  sw.x -= dist
  sw.y += dist
  ne.x += dist
  ne.y -= dist

  sw = map.unproject(sw, map.getZoom())
  ne = map.unproject(ne, map.getZoom())

  return new BoundingBox({
    minlat: sw.lat,
    minlon: sw.lng,
    maxlat: ne.lat,
    maxlon: ne.lng
  })
}

module.exports = pxRectangleBuffer
