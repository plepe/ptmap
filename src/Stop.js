/* global L:false */
var async = require('async')
/**
 * A link to a stop of a route 
 * @typedef {Object} Stop.Link
 * @property {string} role OSM role of the stop inside the Route
 * @property {string} stopId Stop ID, e.g. 'n1234'
 * @property {number} stopIndex nth stop (starting with 0)
 * @property {Stop|false} stop Stop object. false, when not loaded yet.
 * @property {string} routeId Route ID, e.g. 'r910886'
 * @property {OSMObject} route OSM route object.
 * @property {StopArea} stopArea Stop Area where this stop has been added to.
 * @property {number|null} stopIndexOnWay nth node of the way
 * @property {number|null} stopLocationOnWay location of the stop along the way (km)
 * @property {'forward'|'backward'|'both'|null} wayDir Direction of the way
 * @property {SharedRouteWay.Link|null} wayLink Link to the route's way link the stop is connected to (if it is connected)
 */

/**
 * A stop which is used by one or several routes.
 * @constructor
 * @param {PTMap} ptmap Public transport map object - for accessing PTMap properties (e.g. map, environment, ...)
 * @param {OSMObject} object OSM Object
 * @property {string} id ID of the stop (equals to the OSM node id)
 * @property {OSMObject} object OSM Object
 * @property {Stop.Link[]} links Links to the routes of the stop
 * @property {StopArea} stopArea StopArea this stop belongs to.
 */
function Stop (ptmap, object) {
  this.id = object.id
  this.ptmap = ptmap
  this.object = object
  this.stopArea = null
  this.links = []
  this.updateNeeded = true
}

/**
 * highlight object and show popup
 * @param {object} options for future use
 * @param {function} [callback] will be called when highlighting finished. The callback will be passed an err argument and a new map location.
 */
Stop.prototype.open = function (options, callback) {
  if (callback) {
    async.setImmediate(function () {
      callback(null, this.way.bounds)
    }.bind(this))
  }
}

Stop.prototype.close = function () {
}

Stop.prototype.intersects = function (bbox) {
  return bbox.intersects(this.object.geometry)
}

Stop.prototype.requestUpdate = function () {
  this.ptmap.stops.requestUpdate(this)
  this.updateNeeded = true
}

Stop.prototype.addLink = function (link) {
  link.stop = this

  this.links.push(link)
  this.stopArea = this.ptmap.stopAreas.add(link)
}

/**
 * return routes on this way
 * @param {object} [filter] Filter results
 * @param {boolean} [filter.onlyActive=true] Return only stops of active route
 * @return {Route[]}
 */
Stop.prototype.routes = function (filter) {
  var ret = []

  if (typeof filter === 'undefined') {
    filter = { onlyActive: true }
  }
  if (!('onlyActive' in filter)) {
    filter.onlyActive = true
  }

  for (var i = 0; i < this.links.length; i++) {
    var link = this.links[i]

    if (filter.onlyActive === true && !link.route.isActive()) {
      continue
    }

    ret.push(link.route)
  }

  return ret
}

/**
 * return top route on this way
 * @param {object} [filter] Filter results
 * @param {boolean} [filter.onlyActive=true] Return only stops of active route
 * @return {Route|null}
 */
Stop.prototype.topRoute = function (filter) {
  var routes = this.routes(filter)

  routes.sort(function (a, b) {
    return cmpScaleCategory(a.scaleCategory(), b.scaleCategory())
  })

  if (routes.length) {
    return routes[0]
  }

  return null
}

Stop.prototype.scaleCategory = function () {
  var topRoute = this.topRoute()

  if (topRoute === null) {
    return null
  }

  return topRoute.scaleCategory()
}

Stop.prototype.getStyle = function () {
  var topRoute = this.topRoute()
  var topScale = topRoute.scaleCategory()
  var routeConf = config.routes[topRoute.routeType]

  if (topScale === 0) {
    return {
    }
  } else if (topScale === 1) {
    return {
      line: {
        color: routeConf.color,
        opacity: 1,
        weight: 1,
        dashArray: null
      },
      stop: {
        color: routeConf.color,
        offset: 1,
        weight: 2,
        length: 2,
        lineCap: 'butt'
      }
    }
  } else if (topScale == 2) {
    return {
      line: {
        color: routeConf.color,
        opacity: 1,
        weight: 3,
        dashArray: null
      },
      text: {
        fill: routeConf.color,
        offset: 12,
        'font-weight': 'bold'
      },
      stop: {
        color: routeConf.color,
        offset: 3,
        weight: 5,
        length: 4,
        lineCap: 'butt'
      }
    }
  } else {
    return {
      line: {
        color: routeConf.color,
        opacity: 1,
        weight: 3,
        dashArray: '1,7'
      },
      text: {
        fill: routeConf.color,
        offset: 12,
        'font-weight': 'bold'
      },
      stop: {
        color: routeConf.color,
        offset: 3,
        weight: 5,
        length: 6,
        lineCap: 'butt'
      }
    }
  }
}

Stop.prototype.isActive = function () {
  return !!this.routes().length
}

Stop.prototype.update = function (force) {
  if (typeof L === 'undefined') {
    return
  }

  var routes = this.routes()

  if (!routes.length) {
    return this.hide()
  }

  var style = this.getStyle()
  console.log(this.id, 'update')

  this.shown = true
  this.updateNeeded = false
}

Stop.prototype.show = Stop.prototype.update

Stop.prototype.hide = function () {
  this.shown = false
}

// Factory
Stop.factory = function (ptmap) {
  var stops = {}
  var updateRequested = []

  return {
    add: function (object) {
      if (!(object.id in stops)) {
        stops[object.id] = new Stop(ptmap, object)
      }

      return stops[object.id]
    },
    all: function () {
      return stops 
    },
    requestUpdate: function (stop) {
      if (!updateRequested.length) {
        async.setImmediate(this.update.bind(this))
      }

      updateRequested.push(stop)
    },
    update: function (force) {
      var toUpdate = updateRequested
      updateRequested = []

      if (force) {
        toUpdate = []
        for (var k in stops) {
          toUpdate.push(stops[k])
        }
      }

      for (var i = 0; i < toUpdate.length; i++) {
        toUpdate[i].update(force)
      }
    },

    query: function (filter, featureCallback, finalCallback) {
      var done = {}
      var bbox = new BoundingBox(filter.bbox)
      var stackRoutes = 0
      var finishedRoutes = false
      var isAborted = false
      var request = {
        requests: []
      }
      request.abort = function () {
        for (var i = 0; i < this.requests.length; i++) {
          this.requests[i].abort()
        }
        console.log('Stop.factory.query(): abort called')
      }.bind(request)

      request.requests.push(ptmap.getRoutes(
        filter,
        function (err, route) {
          stackRoutes++

          request.requests.push(route.stops(
            filter,
            function (err, stopLink, stopIndex) {
              if (stopLink.stopId in done) {
                return
              }

              if (stopLink.object && bbox.intersects(stopLink.object.geometry)) {
                done[stopLink.stopId] = true
                featureCallback(null, stopLink.stopObject)
              }
            },
            function (err) {
              stackRoutes--
              if (stackRoutes === 0 && finishedRoutes && !isAborted) {
                finalCallback(err)
              }
            }
          ))
        }.bind(this),
        function (err) {
          finishedRoutes = true
          if (err) {
            isAborted = true
          }
          if (stackRoutes === 0 || err) {
            finalCallback(err)
          }
        }
      ))

      return request
    },

    /**
     * get a shared route way
     * @param {string|number} id - ID of the way
     * @param {object} options - reserved for future use
     * @param {function} callback - callback which will be passed the result
     * @param {string|null} callback.error - if an error occured
     * @param {Route|null} callback.result - Route object
     */
    get: function (id, options, callback) {
      var found = false

      if (!id.match(/^n[0-9]+/)) {
        async.setImmediate(function () {
          callback(null, null)
        })

        // return fake request object
        return {
          abort: function () {}
        }
      }

      if (id in stops) {
        async.setImmediate(function () {
          callback(null, stops[id])
        })

        // return fake request object
        return {
          abort: function () {}
        }
      }

      // temporarily disabled loading
      return {
        abort: function () {}
      }

      return overpassFrontend.get(
        [ id ],
        {
          properties: OverpassFrontend.BBOX
        },
        function (err, feature) {
          found = true

          var ob = null
          if (feature && feature.type === 'node') {
            var ob = this.add(feature)
          }

          callback(null, ob)
        }.bind(this),
        function (err) {
          if (!found) {
            callback(err, null)
          }
        }
      )
    }

  }
}

module.exports = Stop
