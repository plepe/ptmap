/* global L:false */
var natsort = require('natsort')
var async = require('async')
var arrayEquals = require('array-equal')
var BoundingBox = require('boundingbox')
var OverpassFrontend = require('overpass-frontend')

var cmpScaleCategory = require('./cmpScaleCategory')

/**
 * A link to the routes of the shared route way
 * @typedef {Object} SharedRouteWay.Link
 * @property {string} role OSM role of the way inside the Route
 * @property {string} wayId Stop ID, e.g. 'n1234'
 * @property {OSMObject|false|null} way OSM way object. false, when not loaded yet. null, when not existant.
 * @property {string} routeId Route ID, e.g. 'r910886'
 * @property {OSMObject} route OSM route object.
 * @property {SharedRouteWay} sharedRouteWay SharedRouteWay where this way has been added to.
 * @property {string} dir Direction of route in relation to way. Either null (unknown), 'forward' (same direction), 'backward' (opposite direction).
 * @property {OSMObject|false|null} prevWay previous way.
 * @property {boolean|null} prevConnected Is the way properly connected to the previous way? true=yes, false=no, null=unknown.
 * @property {OSMObject|false|null} nextWay next way.
 * @property {boolean|null} nextConnected Is the way properly connected to the next way? true=yes, false=no, null=unknown.
 * @property {Stop.Link[]} stops List of stops in this link
 */

/**
 * A link to the stops on the shared route way
 * @typedef {object[]} SharedRouteWay.stopsReturn
 * @property {string} stopId ID of the stop
 * @property {OSMObject} stop OSM object
 * @property {number} stopIndexOnWay nth node of the way
 * @property {Stop.Link[]} links links to the routes
 */

/**
 * A way which is used by one or several routes.
 * @constructor
 * @param {PTMap} ptmap Public transport map object - for accessing PTMap properties (e.g. map, environment, ...)
 * @property {string} id ID of the way (equals the OSM way id).
 * @property {OSMObject} way OSM object.
 * @property {SharedRouteWay.Link[]} links Links to the routes of the shared route way.
 */
function SharedRouteWay (ptmap, way) {
  this.ptmap = ptmap
  this.way = way
  this.id = way.id
  this.links = []
  this.updateNeeded = true
}

// TODO: not implemented yet
SharedRouteWay.prototype.getUrl = function () {
  return {}
}

/**
 * highlight object and show popup
 * @param {object} options for future use
 * @param {function} [callback] will be called when highlighting finished. The callback will be passed an err argument and a new map location.
 */
SharedRouteWay.prototype.open = function (options, callback) {
  if (callback) {
    async.setImmediate(function () {
      callback(null, this.way.bounds)
    }.bind(this))
  }
}

SharedRouteWay.prototype.close = function () {
}

SharedRouteWay.prototype.intersects = function (bbox) {
  return this.way.intersects(bbox)
}

SharedRouteWay.prototype.requestUpdate = function () {
  this.ptmap.sharedRouteWays.requestUpdate(this)
  this.updateNeeded = true
}

SharedRouteWay.prototype.addLink = function (link) {
  this.links.push(link)
}

SharedRouteWay.prototype.routes = function (filter) {
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
 * return list of loaded stops on the way
 * @return {SharedRouteWay.stopsReturn[]}
 */
SharedRouteWay.prototype.stops = function () {
  var ret = []
  var index = {}

  for (var i = 0; i < this.links.length; i++) {
    var link = this.links[i]

    for (var j = 0; j < link.stops.length; j++) {
      var r = {}
      var stopLink = link.stops[j]

      if (stopLink.stopId in index) {
        r = index[stopLink.stopId]
      } else {
        r.stop = stopLink.stop
        r.stopIndexOnWay = stopLink.stopIndexOnWay
        r.stopId = stopLink.stopId
        r.links = []
        index[stopLink.stopId] = r
        ret.push(r)
      }

      r.links.push(stopLink)
    }
  }

  return ret
}

SharedRouteWay.prototype.topRoute = function () {
  var routes = this.routes()

  routes.sort(function (a, b) {
    return cmpScaleCategory(a.scaleCategory(), b.scaleCategory())
  })

  if (routes.length) {
    return routes[0]
  }

  return null
}

SharedRouteWay.prototype.scaleCategory = function () {
  var topRoute = this.topRoute()

  if (topRoute === null) {
    return null
  }

  return topRoute.scaleCategory()
}

SharedRouteWay.prototype.getStyle = function () {
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
      }
    }
  }
}

SharedRouteWay.prototype.isActive = function () {
  return !!this.routes().length
}

SharedRouteWay.prototype.build_label = function () {
  var ret = ''
  var refBoth = []
  var refForward = []
  var refBackward = []
  var refUnknown = []

  if (!this.links.length) {
    return ''
  }

  for (var i = 0; i < this.links.length; i++) {
    var link = this.links[i]
    var route = link.route

    if (!route.isActive()) {
      continue
    }

    var ref = route.ref()

    if (ref !== null) {
      if (link.dir === null) {
        if (refUnknown.indexOf(ref) === -1) {
          refUnknown.push(ref)
        }
      } else if (refBoth.indexOf(ref) !== -1) {
        // already seen in both directions -> ignore
      } else if (link.dir === 'backward') {
        if (refForward.indexOf(ref) !== -1) {
          refForward.splice(refForward.indexOf(ref), 1)
          refBoth.push(ref)
        } else if (refBackward.indexOf(ref) === -1) {
          refBackward.push(ref)
        }
      } else if (link.dir === 'forward') {
        if (refBackward.indexOf(ref) !== -1) {
          refBackward.splice(refBackward.indexOf(ref), 1)
          refBoth.push(ref)
        } else if (refForward.indexOf(ref) === -1) {
          refForward.push(ref)
        }
      }
    }
  }

  var sortParam = {
    insensitive: true
  }
  refBoth.sort(natsort(sortParam))
  refForward.sort(natsort(sortParam))
  refBackward.sort(natsort(sortParam))
  refUnknown.sort(natsort(sortParam))

  ret = '   '
  if (refBackward.length) {
    ret += ' ⬅ ' + refBackward.join(', ') + '   '
  }

  if (refBoth.length) {
    ret += refBoth.join(', ') + '   '
  }

  if (refForward.length) {
    ret += refForward.join(', ') + ' ➡   '
  }

  if (refUnknown.length) {
    ret += refUnknown.join(', ')
  }

  return ret + '             '
}

SharedRouteWay.prototype.buildPopup = function () {
  var ret = "<ul>\n"
  var r = []
  var i

  var routes = this.routes()

  for (i = 0; i < routes.length; i++) {
    r.push({
      ref: routes[i].ref(),
      text: "<li><a href='#q=" + routes[i].id + "'>" + routes[i].title() + "</a></li>"
    })
  }

  r = weightSort(r, {
    key: 'ref',
    compareFunction: natsort()
  })

  for (i = 0; i < r.length; i++) {
    ret += r[i].text
  }

  ret += "</ul>"

  return ret
}

SharedRouteWay.prototype.update = function (force) {
  if (typeof L === 'undefined') {
    return
  }

  var routes = this.routes()

  if (!routes.length) {
    return this.hide()
  }

  var style = this.getStyle()

  // popup
  if (!this.featurePopup) {
    this.featurePopup = L.popup()
    this.featurePopup.object = this
    this.featurePopup.path = this.id
  }
  this.featurePopup.setContent(this.buildPopup())

  // line
  if (style.line) {
    if (this.feature) {
      this.feature.setStyle(style.line)
    }
    else {
      this.feature = L.polyline(this.way.geometry, style.line).addTo(this.ptmap.map)
      this.feature.bindPopup(this.featurePopup)
    }
  } else if (this.feature) {
    this.ptmap.map.removeLayer(this.feature)
    delete this.feature
  }

  // text
  if (this.feature) {
    this.feature.setText(null)
  }

  if (style.text && this.feature) {
    this.feature.setText(this.build_label(), {
      repeat: true,
      offset: style.text.offset,
      attributes: style.text
    })
  }

  this.shown = true
  this.updateNeeded = false
}

SharedRouteWay.prototype.show = SharedRouteWay.prototype.update

SharedRouteWay.prototype.hide = function () {
  if (this.feature) {
    this.ptmap.map.removeLayer(this.feature)
    delete this.feature
  }

  this.shown = false
}

// Factory
SharedRouteWay.factory = function (ptmap) {
  var sharedRouteWays = {}
  var updateRequested = []

  return {
    add: function (way) {
      if (!(way.id in sharedRouteWays)) {
        sharedRouteWays[way.id] = new SharedRouteWay(ptmap, way)
      }

      return sharedRouteWays[way.id]
    },
    all: function () {
      return sharedRouteWays
    },
    requestUpdate: function (sharedRouteWay) {
      if (!updateRequested.length) {
        async.setImmediate(this.update.bind(this))
      }

      updateRequested.push(sharedRouteWay)
    },
    update: function (force) {
      var toUpdate = updateRequested
      updateRequested = []

      if (force) {
        toUpdate = []
        for (var k in sharedRouteWays) {
          toUpdate.push(sharedRouteWays[k])
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
        console.log('PTMap.getSharedRouteWays.abort called')
      }.bind(request)

      request.requests.push(ptmap.getRoutes(
        filter,
        function (err, route) {
          stackRoutes++

          request.requests.push(route.routeWays(
            filter,
            function (err, routeWay, wayIndex) {
              if (routeWay.wayId in done) {
                return
              }

              if (routeWay.way && routeWay.way.intersects(bbox)) {
                done[routeWay.wayId] = true
                featureCallback(null, routeWay.sharedRouteWay)
              }
            },
            function (err, routeWays) {
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

      if (!id.match(/^w[0-9]+/)) {
        async.setImmediate(function () {
          callback(null, null)
        })

        // return fake request object
        return {
          abort: function () {}
        }
      }

      if (id in sharedRouteWays) {
        async.setImmediate(function () {
          callback(null, sharedRouteWays[id])
        })

        // return fake request object
        return {
          abort: function () {}
        }
      }

      return overpassFrontend.get(
        [ id ],
        {
          properties: OverpassFrontend.BBOX
        },
        function (err, feature) {
          found = true

          var ob = null
          if (feature && feature.type === 'way') {
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

module.exports = SharedRouteWay
