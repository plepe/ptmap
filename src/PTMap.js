var OverpassFrontend = require('overpass-frontend')
var async = require('async')
/* global overpassFrontend */

var Route = require('./Route')
var SharedRouteWay = require('./SharedRouteWay')
var StopArea = require('./StopArea')
var BoundingBox = require('boundingbox')

function PTMap (map, env) {
  this.map = map
  this.env = env
  this.env.on('updateMinute', this.checkUpdateMap.bind(this))

  this.map.createPane('stopArea')
  map.getPane('stopArea').style.zIndex = 401

  this.currentStopAreas = []
  this.currentSharedRouteWays = []

  this.routes = Route.factory(this)
  this.sharedRouteWays = SharedRouteWay.factory(this)
  this.stopAreas = StopArea.factory(this)
}

PTMap.prototype.checkUpdateMap = function () {
  if (this.updateMapActive) {
    return
  }

  this.updateMapActive = true

  var filter = {
    bbox: this.map.getBounds()
  }

  async.setImmediate(function () {
    for(var i = 0; i < this.currentSharedRouteWays.length; i++) {
      this.currentSharedRouteWays[i].update()
    }
    for(var i = 0; i < this.currentStopAreas.length; i++) {
      this.currentStopAreas[i].update()
    }
  }.bind(this))

  async.parallel([
    function (callback) {
      var newStopAreas = []

      this.getStopAreas(
        filter,
        function (err, stopArea) {
          newStopAreas.push(stopArea)
          stopArea.show()
        }.bind(this),
        function (err) {
          for (var i = 0; i < this.currentStopAreas.length; i++) {
            if (newStopAreas.indexOf(this.currentStopAreas[i]) === -1) {
              this.currentStopAreas[i].hide(this.map)
            }
          }
          this.currentStopAreas = newStopAreas

          callback()
        }.bind(this)
      )
    }.bind(this),
    function (callback) {
      var newSharedRouteWays = []

      this.getSharedRouteWays(
        filter,
        function (err, sharedRouteWay) {
          newSharedRouteWays.push(sharedRouteWay)
          sharedRouteWay.show()
        }.bind(this),
        function (err) {
          for (var i = 0; i < this.currentSharedRouteWays.length; i++) {
            if (newSharedRouteWays.indexOf(this.currentSharedRouteWays[i]) === -1) {
              this.currentSharedRouteWays[i].hide(this.map)
            }
          }
          this.currentSharedRouteWays = newSharedRouteWays

          callback()
        }.bind(this)
      )
    }.bind(this)
  ], function () {
    this.updateMapActive = false
  }.bind(this))
}

PTMap.prototype.update = function (force) {
  this.stopAreas.update(force)
  this.sharedRouteWays.update(force)
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
  var query = []
  for (var type in config.routes) {
    query.push(overpassFrontend.regexpEscape(type))
  }

  overpassFrontend.BBoxQuery(
    'relation[type=route][route~"^(' + query.join('|') + ')$"]',
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

  var route = this.routes.get(result)

  if (!route.isActive()) {
    return
  }

  featureCallback(null, route)
}

PTMap.prototype.getSharedRouteWays = function (filter, featureCallback, finalCallback) {
  var done = {}
  var bbox = new BoundingBox(filter.bbox)
  var stackRoutes = 0
  var finishedRoutes = false

  this.getRoutes(
    filter,
    function (err, route) {
      stackRoutes++

      route.routeWays(
        filter.bbox,
        function (err, routeWays) {
          for (var i = 0; i < routeWays.length; i++) {
            if (routeWays[i].wayId in done) {
              continue
            }

            if (routeWays[i].way && routeWays[i].way.intersects(bbox)) {
              done[routeWays[i].wayId] = true
              featureCallback(null, routeWays[i].sharedRouteWay)
            }
          }


          stackRoutes--
          if (stackRoutes === 0 && finishedRoutes) {
            finalCallback(err)
          }
        }
      )
    }.bind(this),
    function (err) {
      finishedRoutes = true
    }
  )
}

PTMap.prototype.getStopAreas = function (filter, featureCallback, finalCallback) {
  var done = []
  var bbox = new BoundingBox(filter.bbox)
  var stackRoutes = 0
  var finishedRoutes = false

  this.getRoutes(
    filter,
    function (err, route) {
      stackRoutes++

      route.stops(
        filter.bbox,
        function (err, stops) {
          for (var i = 0; i < stops.length; i++) {
            if (done.indexOf(stops[i].stopArea) !== -1) {
              continue
            }

            if (stops[i].node && stops[i].node.intersects(bbox)) {
              done.push(stops[i].stopArea)
              featureCallback(null, stops[i].stopArea)
            }
          }


          stackRoutes--
          if (stackRoutes === 0 && finishedRoutes) {
            finalCallback(err)
          }
        }
      )
    }.bind(this),
    function (err) {
      finishedRoutes = true
    }
  )
}

module.exports = PTMap
