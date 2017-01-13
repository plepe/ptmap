var OverpassFrontend = require('overpass-frontend')
var async = require('async')
var moment = require('moment')
var events = require('events')
/* global overpassFrontend */

var Route = require('./Route')
var SharedRouteWay = require('./SharedRouteWay')
var StopArea = require('./StopArea')
var BoundingBox = require('boundingbox')
var Environment = require('./Environment')

function PTMap (map, env) {
  events.EventEmitter.call(this)

  this.map = map
  if (env) {
    this.env = env
  } else {
    this.env = new Environment()
  }
  this.env.on('updateMinute', this.checkUpdateMap.bind(this))

  this.currentStopAreas = []
  this.currentSharedRouteWays = []
  this.loadingState = 0
  this.updateMapRequested = false
  this.highlight = null

  this.routes = Route.factory(this)
  this.sharedRouteWays = SharedRouteWay.factory(this)
  this.stopAreas = StopArea.factory(this)

  if (this.map) {
    this.map.createPane('stopArea')
    this.map.getPane('stopArea').style.zIndex = 402

    this.map.createPane('highlightRouteWays')
    this.map.getPane('highlightRouteWays').style.zIndex = 401

    this.map.on('moveend', function (e) {
      this.updateState()

      this.checkUpdateMap()
    }.bind(this))

    this.map.on('popupopen', function (e) {
      if ('object' in e.popup && 'getUrl' in e.popup.object) {
        if (this.highlight) {
          this.highlight.close()
        }
        this.highlight = e.popup.object

        this.updateState()
      }
    }.bind(this))
    this.map.on('popupclose', function (e) {
      if (this.closeOverride) {
        this.closeOverride = false
        return
      }

      if (this.highlight) {
        this.highlight.close()
        this.highlight = null
      }

      this.updateState()
    }.bind(this))
    this.state = {}

    async.setImmediate(function () {
      this.checkUpdateMap()
    }.bind(this))
  }
}

PTMap.prototype.__proto__ = events.EventEmitter.prototype

PTMap.prototype.getState = function (fullState) {
  var ret = {}

  if (this.highlight) {
    ret = this.highlight.getUrl()
  }

  ret.zoom = this.map.getZoom()
  ret.lat = this.map.getCenter().lat.toFixed(5)
  ret.lon = this.map.getCenter().lng.toFixed(5)

  if (fullState) {
    ret.date = moment(this.env.date()).format()
  }

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
    this.closeOverride = true
    this.map.closePopup()
    this.setLoading()

    this.stopAreas.get(state.stopArea, function (err, ob) {
      if (ob) {
        this.highlight = ob
        ob.open()
      }

      this.unsetLoading()
    }.bind(this))
  } else if (this.highlight && this.highlight.constructor.name == 'StopArea') {
    this.highlight.close()
    this.highlight = null
    this.map.closePopup(this.featurePopup)
  }

  if ('route' in state) {
    this.closeOverride = true
    this.map.closePopup()
    this.setLoading()

    this.routes.get(
      state.route,
      function (err, ob) {
        if (ob) {
          this.highlight = ob
          ob.open(function () {
            this.unsetLoading()
          }.bind(this))
        }
      }.bind(this),
      function () {}
    )
  } else if (this.highlight && this.highlight.constructor.name == 'Route') {
    this.highlight.close()
    this.highlight = null
    this.map.closePopup(this.featurePopup)
  }
}

PTMap.prototype.updateState = function () {
  this.state = this.getState()

  this.emit('updateState', this.state)
}

PTMap.prototype.setLoading = function () {
  this.loadingState++

  if (typeof document !== 'undefined') {
    var loadingIndicator = document.getElementById('loadingIndicator')
    if (loadingIndicator) {
      loadingIndicator.style.visibility = 'visible';
    }
  }
}

PTMap.prototype.unsetLoading = function () {
  this.loadingState--

  if (this.loadingState < 0) {
    console.log('loadingState', this.loadingState)
    this.loadingState = 0
  }

  if (typeof document !== 'undefined') {
    var loadingIndicator = document.getElementById('loadingIndicator')
    if (loadingIndicator && this.loadingState <= 0) {
      loadingIndicator.style.visibility = 'hidden';
    }
  }

  if (this.updateMapRequested && this.loadingState <= 0) {
    this.checkUpdateMap()
  }
}

PTMap.prototype.checkUpdateMap = function () {
  console.log('checkUpdateMap')
  if (this.checkUpdateMapRequest && !this.checkUpdateMapRequest.finished) {
    this.checkUpdateMapRequest.abort()
  } else if (this.loadingState) {
    this.updateMapRequested = true
    return
  }

  this.updateMapRequested = false

  this.setLoading()

  var bbox = new BoundingBox(this.map.getBounds())
  var filter = {
    bbox: bbox,
    minScaleCategory: 1,
    priority: 1
  }

  async.setImmediate(function () {
    var i

    var newSharedRouteWays = []
    for(i = 0; i < this.currentSharedRouteWays.length; i++) {
      var ob = this.currentSharedRouteWays[i]
      if (ob.intersects(bbox)) {
        newSharedRouteWays.push(ob)
        ob.update()
      } else {
        ob.hide()
      }
    }
    this.currentSharedRouteWays = newSharedRouteWays

    var newStopAreas = []
    for(i = 0; i < this.currentStopAreas.length; i++) {
      var ob = this.currentStopAreas[i]
      if (ob.intersects(bbox)) {
        newStopAreas.push(ob)
        ob.update()
      } else {
        ob.hide()
      }
    }
    this.currentStopAreas = newStopAreas
  }.bind(this))

  var request = {
    stopAreas: null,
    sharedRouteWays: null,
    finished: false
  }
  request.abort = function () {
    this.finished = true
    if (this.stopAreas) {
      this.stopAreas.abort()
    }

    if (this.sharedRouteWays) {
      this.sharedRouteWays.abort()
    }

  }.bind(request)

  this.checkUpdateMapRequest = request

  async.setImmediate(function () {
    async.parallel([
      function (callback) {
        request.stopAreas = this.getStopAreas(
          filter,
          function (err, stopArea) {
            if (this.currentStopAreas.indexOf(stopArea) === -1) {
              this.currentStopAreas.push(stopArea)
            }

            stopArea.show()
          }.bind(this),
          function (err) {
            request.stopAreas = null
            callback()
          }.bind(this)
        )
      }.bind(this),
      function (callback) {
        request.sharedRouteWays = this.getSharedRouteWays(
          filter,
          function (err, sharedRouteWay) {
            if (this.currentSharedRouteWays.indexOf(sharedRouteWay) === -1) {
              this.currentSharedRouteWays.push(sharedRouteWay)
            }

            sharedRouteWay.show()
          }.bind(this),
          function (err) {
            request.sharedRouteWays = null
            callback()
          }.bind(this)
        )
      }.bind(this)
    ], function (request) {
      this.unsetLoading()
      request.finished = true
    }.bind(this, request))
  }.bind(this))

  return request
}

PTMap.prototype.update = function (force) {
  this.stopAreas.update(force)
  this.sharedRouteWays.update(force)
}

PTMap.prototype.getRouteById = function (ids, featureCallback, finalCallback) {
  return this.routes.get(ids, featureCallback, finalCallback)
}

PTMap.prototype.getRoutes = function (filter, featureCallback, finalCallback) {
  return this.routes.query(filter, featureCallback, finalCallback)
}

PTMap.prototype.getSharedRouteWays = function (filter, featureCallback, finalCallback) {
  return this.sharedRouteWays.query(filter, featureCallback, finalCallback)
}

PTMap.prototype.getStopAreas = function (filter, featureCallback, finalCallback) {
  return this.stopAreas.query(filter, featureCallback, finalCallback)
}

module.exports = PTMap
