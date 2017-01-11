var OverpassFrontend = require('overpass-frontend')
var async = require('async')
var moment = require('moment')
var events = require('events')
var Promise = require('promise');
/* global overpassFrontend */

var Route = require('./Route')
var SharedRouteWay = require('./SharedRouteWay')
var StopArea = require('./StopArea')
var BoundingBox = require('boundingbox')
var Environment = require('./Environment')

/**
 * A public transport map
 * @constructor
 */
function PTMap (map, env) {
  events.EventEmitter.call(this)

  this.map = map
  if (env) {
    this.env = env
  } else {
    this.env = new Environment()
  }
  this.env.on('updateMinute', this.checkUpdateMap.bind(this))

  this.map.attributionControl.setPrefix('<a href="https://github.com/plepe/ptmap">PTMap</a>')

  this.currentStopAreas = []
  this.currentSharedRouteWays = []
  this.loadingState = 0
  this.updateMapRequested = false
  this.highlight = null
  this.path = null

  this.routes = Route.factory(this)
  this.sharedRouteWays = SharedRouteWay.factory(this)
  this.stopAreas = StopArea.factory(this)
  this.notFoundIds = {}

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
        this.path = e.popup.path

        this.updateState()
      }
    }.bind(this))
    this.map.on('popupclose', function (e) {
      if (this.closeOverride) {
        this.closeOverride = false
        return
      }

      this.path = null
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

  if (this.path) {
    ret.q = this.path
  }

  ret.zoom = this.map.getZoom()
  ret.lat = this.map.getCenter().lat.toFixed(5)
  ret.lon = this.map.getCenter().lng.toFixed(5)

  if (fullState) {
    ret.date = moment(this.env.date()).format()
  }

  return ret
}

/**
 * get an object
 * @param {string|number} id - ID of the object (e.g. r910886)
 * @param {object} options - reserved for future use
 * @param {function} callback - callback which will be passed the result
 * @param {string|null} callback.error - if an error occured
 * @param {Route|null} callback.result - Route object
 */
PTMap.prototype.get = function (id, options, callback) {
  if (id in this.notFoundIds) {
    async.setImmediate(function () {
      callback(null, null)
    })
    return
  }

  var found = []
  async.eachOf(
    [ 'routes', 'stopAreas', 'sharedRouteWays' ],
    function (realm, i, callback) {
      this[realm].get(
        id,
        options,
        function (err, ob) {
          if (ob) {
            found[i] = ob
          }

          callback(err)
        }
      )
    }.bind(this),
    function (err) {
      for (var i = 0; i < found.length; i++) {
        if (found[i] !== undefined) {
          callback(err, found[i])
          return
        }
      }

      this.notFoundIds[id] = true
      callback(err, null)
    }.bind(this)
  )
}

/**
 * set map to a specific location
 * @param {object} loc location
 * @param {number} [loc.lat] Latitude of new location, if undefined map center might not be changed
 * @param {number} [loc.lon] Longitude of new location, if undefined map center might not be changed
 * @param {number} [loc.zoom] New zoom level, if undefined zoom level might not be changed
 * @param {number} [loc.minlat] minlat/minlon/maxlat/maxlon specify bounds which should fit into the map view
 * @param {number} [loc.minlon] minlat/minlon/maxlat/maxlon specify bounds which should fit into the map view
 * @param {number} [loc.maxlat] minlat/minlon/maxlat/maxlon specify bounds which should fit into the map view
 * @param {number} [loc.maxlon] minlat/minlon/maxlat/maxlon specify bounds which should fit into the map view
 */
PTMap.prototype.setMapLocation = function (loc) {
  if (!loc) {
    return
  }

  if ('lat' in loc && 'lon' in loc && 'zoom' in loc) {
    this.map.setView([ loc.lat, loc.lon ], loc.zoom)
  } else if ('lat' in loc && 'lon' in loc) {
    this.map.panTo([ loc.lat, loc.lon ])
  } else if ('zoom' in loc) {
    this.map.setZoom(loc.zoom)
  } else if ('minlat' in loc && 'maxlat' in loc && 'minlon' in loc && 'maxlon' in loc) {
    this.map.fitBounds(new BoundingBox(loc).toLeaflet())
  }
}

PTMap.prototype.setState = function (state) {
  var loc = null // new map location

  if ('date' in state) {
    this.env.setDate(state.date)
  }

  if ('q' in state && this.path !== state.q) {
    if (this.highlight) {
      this.highlight.close()
      this.highlight = null
    }

    this.closeOverride = true
    this.map.closePopup()
    this.setLoading()

    this.path = state.q

    var pathParts = this.path.split('/')
    var highlightLocationResolve = null
    loc = new Promise(function (resolve, reject) {
      highlightLocationResolve = function (loc) {
        resolve(loc)
      }
    })

    this.get(
      pathParts[0],
      {},
      function (err, ob) {
        if (ob === null) {
          highlightLocationResolve(null)

          alert('object not found!')
          return
        }

        this.highlight = ob
        ob.open(
          {
            path: pathParts.slice(1)
          },
          function (err, mapLocation) {
            highlightLocationResolve(mapLocation)
            this.unsetLoading()
          }.bind(this)
        )
      }.bind(this)
    )
  }
  if (!('q' in state) && this.path) {
    if (this.highlight) {
      this.highlight.close()
      this.highlight = null
    }

    this.closeOverride = true
    this.map.closePopup()
  }

  if ('lat' in state && 'lon' in state && 'zoom' in state) {
    loc = {
      lat: state.lat,
      lon: state.lon,
      zoom: state.zoom
    }
  } else if ('lat' in state && 'lon' in state) {
    loc = {
      lat: state.lat,
      lon: state.lon
    }
  } else if ('zoom' in state) {
    loc = {
      zoom: state.zoom,
      weight: -1
    }
  }

  loc = Promise.resolve(loc)
  loc.then(function (value) {
    this.setMapLocation(value)
    this.updateState()
  }.bind(this))
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

    for(i = 0; i < this.currentSharedRouteWays.length; i++) {
      var ob = this.currentSharedRouteWays[i]
      if (ob.intersects(bbox)) {
        ob.update()
      } else {
        this.currentSharedRouteWays.splice(i, 1)
        ob.hide()
      }
    }

    for(i = 0; i < this.currentStopAreas.length; i++) {
      var ob = this.currentStopAreas[i]
      if (ob.intersects(bbox)) {
        ob.update()
      } else {
        this.currentStopAreas.splice(i, 1)
        ob.hide()
      }
    }
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
  if (!Array.isArray(ids)) {
    ids = [ ids ]
  }

  async.each(
    ids,
    function (id, callback) {
      this.routes.get(id, {}, function (err, ob) {
        featureCallback(err, ob)
        callback()
      })
    }.bind(this),
    function () {
      finalCallback()
    }
  )
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
