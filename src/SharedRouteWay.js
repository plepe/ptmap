var sharedRouteWays = {}

function SharedRouteWay (way) {
  this.way = way
  this.id = way.id
  this.links = []
}

SharedRouteWay.prototype.addLink = function (link) {
  this.links.push(link)
}

SharedRouteWay.prototype.routes = function () {
  var ret = []

  for (var i = 0; i < this.links.length; i++) {
    var link = this.links[i]

    ret.push(link.route)
  }

  return ret
}

SharedRouteWay.prototype.update = function () {
}

SharedRouteWay.prototype.show = function (map) {
  var line = []

  for (var k = 0; k < this.way.geometry.length; k++) {
    var g = this.way.geometry[k]
    line.push([ g.lat, g.lon ])
  }

  var route_conf = {
    color: 'black',
    priority: 0
  }

  if (this.feature) {
    this.feature.setLatLngs(line)
  } else {
    this.feature = L.polyline(line, {
      color: route_conf.color,
      opacity: 1
    }).addTo(map)
  }

  this.shown = true
}

SharedRouteWay.prototype.hide = function (map) {
  if (this.feature) {
    map.removeLayer(this.feature)
    delete this.feature
  }

  this.shown = false
}

// global functions
SharedRouteWay.get = function (way) {
  if (!(way.id in sharedRouteWays)) {
    sharedRouteWays[way.id] = new SharedRouteWay(way)
  }

  return sharedRouteWays[way.id]
}

SharedRouteWay.all = function () {
  return sharedRouteWays
}

module.exports = SharedRouteWay
