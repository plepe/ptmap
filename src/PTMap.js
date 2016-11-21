var OverpassFrontend = require('overpass-frontend')
var async = require('async')
var moment = require('moment')
var events = require('events')
/* global overpassFrontend */

var Route = require('./Route')
var SharedRouteWay = require('./SharedRouteWay')
var StopArea = require('./StopArea')
var BoundingBox = require('boundingbox')

function PTMap (map, env) {
  events.EventEmitter.call(this)

  this.map = map
  this.env = env
  this.env.on('updateMinute', this.checkUpdateMap.bind(this))

  this.map.createPane('stopArea')
  map.getPane('stopArea').style.zIndex = 401

  this.currentStopAreas = []
  this.currentSharedRouteWays = []
  this.loadingState = 0
  this.updateMapRequested = false

  this.routes = Route.factory(this)
  this.sharedRouteWays = SharedRouteWay.factory(this)
  this.stopAreas = StopArea.factory(this)

  this.map.on('moveend', function (e) {
    this.checkUpdateMap()
  }.bind(this))

  this.map.on('popupopen', function (e) {
    if ('object' in e.popup && 'getUrl' in e.popup.object) {
      this.updateState(e.popup.object.getUrl())
    }
  }.bind(this))
  this.map.on('popupclose', function (e) {
    this.updateState({})
  }.bind(this))
  this.state = {}

  async.setImmediate(function () {
    this.checkUpdateMap()
  }.bind(this))
}

PTMap.prototype.__proto__ = events.EventEmitter.prototype

PTMap.prototype.getState = function () {
  var ret = JSON.parse(JSON.stringify(this.state))

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

  if ('stopArea' in state) {
    this.setLoading()

    this.stopAreas.get(state.stopArea, function (err, ob) {
      if (ob) {
        ob.open()
      }

      this.unsetLoading()
    }.bind(this))
  }
}

PTMap.prototype.updateState = function (state) {
  this.state = state
  this.emit('updateState', state)
}

PTMap.prototype.setLoading = function () {
  var loadingIndicator = document.getElementById('loadingIndicator')
  this.loadingState++
  if (loadingIndicator) {
    loadingIndicator.style.visibility = 'visible';
  }
}

PTMap.prototype.unsetLoading = function () {
  var loadingIndicator = document.getElementById('loadingIndicator')
  this.loadingState--
  if (loadingIndicator && this.loadingState <= 0) {
    loadingIndicator.style.visibility = 'hidden';

    if (this.updateMapRequested) {
      this.checkUpdateMap()
    }
  }
}

PTMap.prototype.checkUpdateMap = function () {
  if (this.loadingState) {
    this.updateMapRequested = true
    return
  }

  this.updateMapRequested = false

  this.setLoading()

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

          console.log('callback sharedroute')
          callback()
        }.bind(this)
      )
    }.bind(this)
  ], function () {
    this.unsetLoading()
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

  var route = this.routes.add(result)

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
