var OverpassFrontend = require('overpass-frontend')
/* global overpassFrontend */

var Route = require('./Route')

function PTMap () {
  this.routes = {}
}

PTMap.prototype.checkUpdateMap = function (map) {
  this.map = map
}

PTMap.prototype.getRouteById = function (ids, featureCallback, finalCallback) {
  overpassFrontend.get(
    ids,
    {
      properties: OverpassFrontend.TAGS | OverpassFrontend.MEMBERS | OverpassFrontend.BBOX
    },
    this._loadRoute.bind(this, featureCallback),
    function (err) {
      finalCallback(err)
    }
  )
}

PTMap.prototype.getRoutes = function (filter, featureCallback, finalCallback) {
  overpassFrontend.BBoxQuery(
    'relation[type=route][route=bus]',
    filter.bbox,
    {
      properties: OverpassFrontend.TAGS | OverpassFrontend.MEMBERS | OverpassFrontend.BBOX
    },
    this._loadRoute.bind(this, featureCallback),
    function (err) {
      finalCallback(err)
    }
  )
}

PTMap.prototype._loadRoute = function (featureCallback, err, result) {
  if (err) {
    console.log('Error should not happen')
    return
  }

  if (!(result.id in this.routes)) {
    this.routes[result.id] = new Route(result)
  }

  featureCallback(null, this.routes[result.id])
}

module.exports = PTMap
