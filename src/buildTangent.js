var turf = {
  lineDistance: require('@turf/line-distance'),
  along: require('@turf/along')
}

/**
 * create a tangent at a specific position on the way
 * @param {GeoJSON} way
 * @param {number} position (km)
 * @param {number} length (px)
 * @param {L.map} map
 * @return {L.polyline}
 */
function buildTangent (way, position, length, map) {
  var wayLength = turf.lineDistance(way, 'kilometers')

  var l1 = position > 0.001 ? position - 0.001 : 0
  var l2 = position < wayLength - 0.001 ? position + 0.001 : wayLength
  var p1 = turf.along(way, l1, 'kilometers')
  p1 = [ p1.geometry.coordinates[1], p1.geometry.coordinates[0] ]
  var p2 = turf.along(way, l2, 'kilometers')
  p2 = [ p2.geometry.coordinates[1], p2.geometry.coordinates[0] ]

  var origin = map.getPixelOrigin()
  var px1 = map.project(p1, map.getZoom())
  px1 = { x: px1.x - origin.x, y: px1.y - origin.y }
  var px2 = map.project(p2, map.getZoom())
  px2 = { x: px2.x - origin.x, y: px2.y - origin.y }
  var cl = Math.sqrt(Math.pow(px1.x - px2.x, 2) + Math.pow(px1.y - px2.y, 2))
  var d = { x: (px2.x - px1.x) / cl, y: (px2.y - px1.y) / cl }

  var p = turf.along(way, position, 'kilometers')
  p = [ p.geometry.coordinates[1], p.geometry.coordinates[0] ]
  p = map.project(p, map.getZoom())
  p = { x: p.x - origin.x, y: p.y - origin.y }

  var d1 = { x: p.x - d.x * length / 2, y: p.y - d.y * length / 2 }
  var d2 = { x: p.x + d.x * length / 2, y: p.y + d.y * length / 2 }

  var e1 = map.layerPointToLatLng(d1)
  var e2 = map.layerPointToLatLng(d2)
  
  return [ e1, e2 ]
}

module.exports = buildTangent
