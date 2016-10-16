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
