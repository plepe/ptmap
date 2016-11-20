var OverpassFrontend = require('overpass-frontend')
var async = require('async')
var moment = require('moment')
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

PTMap.prototype.getState = function () {
  var ret = {}

  ret.zoom = this.map.getZoom()
  ret.lat = this.map.getCenter().lat.toFixed(5)
  ret.lon = this.map.getCenter().lng.toFixed(5)
  ret.date = moment(this.env.date()).format()

  return ret
}

PTMap.prototype.setState = function (state) {
  if ('lat' in state && 'lon' in state && 'zoom' in state) {
    this.map.setView([ state.lat, state.lon ], state.zoom)
  } else if ('lat' in state && 'lon' in state) {
    this.map.panTo([ state.lat, state.lon ])
  } else if ('zoom' in state) {
    this.map.setZoom(state.zoom)
  }

  if ('date' in state) {
    this.env.setDate(state.date)
  }
}

PTMap.prototype.checkUpdateMap = function () {
  if (this.updateMapActive) {
    return
  }

  this.updateMapActive = true

  var loadingIndicator = document.getElementById('loadingIndicator')
  if (loadingIndicator) {
    loadingIndicator.style.visibility = 'visible';
  }

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

    if (loadingIndicator) {
      loadingIndicator.style.visibility = 'hidden';
    }
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
