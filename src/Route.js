var async = require('async')
var htmlEscape = require('html-escape')

/* global overpassFrontend:false */
var OverpassFrontend = require('overpass-frontend')
var SharedRouteWay = require('./SharedRouteWay')
var StopArea = require('./StopArea')
var buildTangent = require('./buildTangent')
var OpeningHours = require('opening_hours')
var turf = {
  pointOnLine: require('@turf/point-on-line')
}

var priorityFromScale = [ 0.6, 0.4, 0.1, 0.3 ]

/**
 * A public transport route
 * @constructor
 * @param {PTMap} ptmap - the master ptmap object
 * @object {OverpassObject} object - the OSM object (usually a relation)
 * @property {string} id equals the id of the OSM object (e.g. 'r123')
 * @property {string} routeType type of the route (the value of the tag 'route'), e.g. 'tram'
 * @property {PTMap} ptmap the master ptmap object
 * @property {OverpassObject} object the OSM object (usually a relation)
 */
function Route (ptmap, object) {
  this.ptmap = ptmap
  this.object = object

  this.id = this.object.id
  this.routeType = this.object.tags.route
}

/**
 * return the url parameters to represent this route
 * @return {object}
 */
Route.prototype.getUrl = function () {
  return {
    route: this.id
  }
}

/**
 * title (the name of the route or 'ref to')
 * @return {string}
 */
Route.prototype.title = function () {
  if ('name' in this.object.tags) {
    return this.object.tags.name
  }

  if ('ref' in this.object.tags && 'to' in this.object.tags) {
    return this.object.tags.ref + " " + this.object.tags.to
  }

  if ('ref' in this.object.tags) {
    return this.object.tags.ref
  }

  return 'unknown'
}

/**
 * reference tag (usually 'ref')
 * @return {string}
 */
Route.prototype.ref = function () {
  if ('ref' in this.object.tags) {
    return this.object.tags.ref
  }

  return 'unknown'
}

/**
 * approximate length in pixels - in fact it will calculate the length of the diagonal of the bounding box
 * @return {float}
 */
Route.prototype.approxPxLength = function () {
  var leafletBounds = this.object.bounds.toLeaflet()
  var sw = leafletBounds.getSouthWest()
  var ne = leafletBounds.getNorthEast()

  sw = this.ptmap.map.latLngToLayerPoint(sw)
  ne = this.ptmap.map.latLngToLayerPoint(ne)

  var h = ne.x - sw.x
  var v = ne.y - sw.y

  var d = Math.sqrt(h * h + v * v)

  return d
}

/**
 * approximate distance of stops in pixels - the approximate length in pixels divided by the count of stops - 1
 * @return {float}
 */
Route.prototype.approxPxStopDistance = function () {
  if (!this._stops) {
    this._initStops()
  }

  if (this._stops.length >= 2) {
    return this.approxPxLength() / (this._stops.length - 1)
  }
  else {
    return this.approxPxLength()
  }

  return 0.0
}

/**
 * Scale of a route (avg. approx stop distance) in relation to the current zoom
 * level
 * @return {int}
 *   0 ... "very small" (hidden?)
 *   1 ... "small" (shown as narrow line)
 *   2 ... "perfect for this scale" (thick line)
 *   3 ... "too large" (dotted)
 */
Route.prototype.scaleCategory = function () {
  if (typeof L === 'undefined') {
    return 2
  }

  if (this.lastScaleCategoryZoom === this.ptmap.map.getZoom()) {
    return this.lastScaleCategoryValue
  }

  var approxPxStopDistance = this.approxPxStopDistance()
  var ret

  if (approxPxStopDistance < 20) {
    ret = 0
  } else if (approxPxStopDistance < 70) {
    ret = 1
  } else if (approxPxStopDistance < 1000) {
    ret = 2
  } else {
    ret = 3
  }

  if (this.ptmap.map.getZoom() >= 17) {
    if (ret < 2) {
      ret = 2
    }
  } else if (this.ptmap.map.getZoom() >= 15) {
    if (ret === 0) {
      ret = 1
    }
  }

  this.lastScaleCategoryZoom = this.ptmap.map.getZoom()
  this.lastScaleCategoryValue = ret

  return ret
}

/**
 * highlight object and show popup
 * @param {object} options
 * @param {string[]} path Further path parts - identify stop of route
 * @param {function} [callback] will be called when highlighting finished. The callback will be passed an err argument and a new map location.
 */
Route.prototype.open = function (options, callback) {
  var popupLocation = this.object.bounds.getCenter()
  var mapLocation = this.object.bounds
  var done = 0

  this.highlightPopup = L.popup()
  this.highlightPopup.object = this

  if ('path' in options && options.path.length) {
    var stopId = options.path[0]
    this.highlightPopup.path = this.id + '/' + stopId

    this.getStop(stopId,
      function (err, result, index) {
        if (result) {
          popupLocation = result.stop.object.geometry
          mapLocation = result.stop.object.geometry
        } else {
          alert("Can't find stop " + stopId)
        }

        doneStop.call(this)
      }.bind(this)
    )
  } else {
    this.highlightPopup.path = this.id

    doneStop.call(this)
  }

  function doneStop () {
    this.highlightPopup.setContent(this.buildPopup(options))
    this.highlightPopup.setLatLng(popupLocation)
    this.highlightPopup.openOn(this.ptmap.map)

    if (++done === 2) {
      callback(null, mapLocation)
    }
  }

  this.showHighlight(function () {
    this.highlightPopup.setContent(this.buildPopup())
    document.getElementById('details').innerHTML = this.buildPopup()

    if (++done === 2) {
      callback(null, mapLocation)
    }
  }.bind(this))
}

Route.prototype.buildPopup = function () {
  var ret = ''

  ret = '<h1>' + htmlEscape(this.title()) + '</h1>\n'

  if (this._stops) {
    ret += '<h2>Stops</h2><ul>\n'

    for (var i = 0; i < this._stops.length; i++) {
      var link = this._stops[i]

      ret += '<li>' + '<a href="#q=' + this.id + '/' + link.stopId + '">'
      if (link.stop.object) {
        ret += htmlEscape(link.stop.object.tags.name)
      } else {
        ret += 'unknown'
      }
      ret += '</a></li>\n'
    }

    ret += '</ul>\n'
  }

  return ret
}

Route.prototype.close = function () {
  this.hideHighlight()
}

Route.prototype.showHighlight = function (callback) {
  this.highlightsRouteWays = []
  this.highlightsStops = []

  async.parallel([
    function (callback) {
      this.routeWays({},
        function (err, routeWay, index) {
          if (!routeWay.way) {
            return
          }

          if (!this.highlightsRouteWays[index]) {
            this.highlightsRouteWays[index] =
              L.polyline(routeWay.way.geometry, {
                color: 'black',
                weight: 4,
                opacity: 1,
                pane: 'highlightRouteWays'
              })
          }

          this.highlightsRouteWays[index].addTo(this.ptmap.map)
        }.bind(this),
        function (err) {
          callback()
        }
      )
    }.bind(this),
    function (callback) {
      this.stops({},
        function (err, link, index) {
          var feature
          if (link.wayLink && link.wayLink.way) {
            var geometry = buildTangent(link.wayLink.way.GeoJSON(), link.stopLocationOnWay, 8, this.ptmap.map)
            feature = L.polyline(geometry, {
              color: 'black',
              lineCap: 'butt',
              weight: 7,
              pane: 'highlightRouteWays'
            })
            var dirValue =
              link.wayDir === 'backward' ? -1 :
              link.wayDir === 'forward' ? 1 : 0
            if (dirValue === 0) {
              feature.setStyle({ weight: (7 - 3) * 2 })
            } else {
              feature.setOffset(dirValue * 3)
            }

            // remember for update
            feature.GeoJSON = link.wayLink.way.GeoJSON()
            feature.stopLocationOnWay = link.stopLocationOnWay
            feature.length = 8
          } else {
            feature = L.circleMarker(link.stop.object.geometry, {
              fillColor: 'black',
              radius: 4,
              stroke: false,
              fill: true,
              fillOpacity: 1.0,
              pane: 'highlightRouteWays'
            })
          }

          feature.addTo(this.ptmap.map)
          this.highlightsStops.push(feature)
        }.bind(this),
        function () {
          callback()
        }
      )
    }.bind(this)
  ], function () {
    callback()
  })
}

Route.prototype.updateHighlight = function() {
  for (var i = 0; i < this.highlightsStops.length; i++) {
    var feature = this.highlightsStops[i]

    if ('stopLocationOnWay' in feature) {
      var geometry = buildTangent(feature.GeoJSON, feature.stopLocationOnWay, feature.length, this.ptmap.map)
      feature.setLatLngs(geometry)
    }
  }
}

Route.prototype.hideHighlight = function () {
  var i

  if (this.highlightsRouteWays) {
    for (i = 0; i < this.highlightsRouteWays.length; i++) {
      if (this.highlightsRouteWays[i]) {
        this.ptmap.map.removeLayer(this.highlightsRouteWays[i])
      }
    }
  }

  if (this.highlightsStops) {
    for (i = 0; i < this.highlightsStops.length; i++) {
      if (this.highlightsStops[i]) {
        this.ptmap.map.removeLayer(this.highlightsStops[i])
      }
    }
  }
}

Route.prototype.isActive = function () {
  if (new Date() - this.lastIsActiveTime < 1000) {
    return this.lastIsActiveState
  }

  if (!this.openingHours) {
    var oh = '05:00-00:00'

    if ('opening_hours' in config.default_tags) {
      oh = config.default_tags.opening_hours
    }

    if (this.object.tags.opening_hours) {
      oh = this.object.tags.opening_hours
    }

    // TODO: also pass nominatim_object to get correct holidays etc
    try {
      this.openingHours = new OpeningHours(oh, {
        address: config.nominatim_address
      })
    } catch (e) {
      // this.errors.push("Error parsing opening hours string: " + e)
      this.openingHours = true
      return true
    }
  }

  if (this.openingHours === true) {
    return true
  }

  this.lastIsActiveTime = new Date()
  this.lastIsActiveState = this.openingHours.getState(this.ptmap.env.date());

  return this.lastIsActiveState
}

Route.prototype.routeWays = function (filter, featureCallback, finalCallback) {
  var wayIds = []
  var wayIndexList = []
  var wayIndex = 0
  var init = false

  if (typeof this._routeWays === 'undefined') {
    this._routeWays = []
    init = true
  }
  if (!this._stops) {
    this._initStops()
  }

  for (var i = 0; i < this.object.members.length; i++) {
    var member = this.object.members[i]

    if (member.type === 'way' && ['', 'forward', 'backward'].indexOf(member.role) !== -1) {
      if (init) {
        this._routeWays.push({
          role: member.role,
          wayId: member.id,
          way: false,
          sharedRouteWay: null,
          routeId: this.id,
          route: this,
          dir: null,
          prevWay: null,
          prevConnected: null,
          nextWay: null,
          nextConnected: null,
          stops: null
        })
      }

      if (this._routeWays[wayIndex].way) {
        async.setImmediate(function (wayIndex) {
          featureCallback(null, this._routeWays[wayIndex], wayIndex)
        }.bind(this, wayIndex))
      } else {
        wayIds.push(member.id)
        wayIndexList.push(wayIndex)
      }

      wayIndex++
    }
  }

  var param = {
    bbox: filter.bbox,
    properties: OverpassFrontend.GEOM | OverpassFrontend.MEMBERS,
    priority: 'priority' in filter ? filter.priority : 0
  }
  param.priority += priorityFromScale[this.scaleCategory()]

  return overpassFrontend.get(wayIds,
    param,
    function (wayIndexList, err, result, index) {
      wayIndex = wayIndexList[index]

      if (result !== false && result !== null) {
        this._routeWays[wayIndex].way = result
        this.routeWayCheck(wayIndex)
      }

      featureCallback(err, this._routeWays[wayIndex], wayIndex)
    }.bind(this, wayIndexList),
    function (err) {
      finalCallback(err, this._routeWays)
    }.bind(this)
  )
}

Route.prototype.routeWayCheck = function (wayIndex) {
  var link = this._routeWays[wayIndex]

  if (link.prevWay && link.nextWay) {
    return // already checked
  }

  if (!link.sharedRouteWay) {
    link.sharedRouteWay = this.ptmap.sharedRouteWays.add(link.way)
    link.sharedRouteWay.addLink(link)
  }

  if (link.stops === null) {
    link.stops = []

    for (var i = 0; i < link.way.members.length; i++) {
      var member = link.way.members[i]
      if (member.id in this._stopsIndex) {
        for (var j = 0; j < this._stopsIndex[member.id].length; j++) {
          var stopIndex = this._stopsIndex[member.id][j]
          var stopLink = this._stops[stopIndex]

          stopLink.wayLink = link
          stopLink.stopIndexOnWay = i
          stopLink.stopLocationOnWay = null
          var p = turf.pointOnLine(link.way.GeoJSON(),
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [
                  link.way.geometry[i].lon,
                  link.way.geometry[i].lat
                ]
              }
            },
            'kilometers'
          )
          if (p) {
            stopLink.stopLocationOnWay = p.properties.location
          }

          link.stops.push(stopLink)
        }
      }
    }
  }

  var checkPrevWay = false
  if (!link.prevWay && wayIndex > 0) {
    link.prevWay = this._routeWays[wayIndex - 1].way
    checkPrevWay = !!link.prevWay
  }

  var checkNextWay = false
  if (!link.nextWay && wayIndex < this._routeWays.length - 1) {
    link.nextWay = this._routeWays[wayIndex + 1].way
    checkNextWay = !!link.nextWay
  }

  if (checkPrevWay) {
    link.prevConnected = true
    if (link.prevWay.members[0].id === link.way.members[0].id ||
        link.prevWay.members[link.prevWay.members.length - 1].id === link.way.members[0].id) {
      link.dir = 'forward'
    } else if (link.prevWay.members[0].id === link.way.members[link.way.members.length - 1].id ||
        link.prevWay.members[link.prevWay.members.length - 1].id === link.way.members[link.way.members.length - 1].id) {
      link.dir = 'backward'
    } else {
      link.prevConnected = false
    }

    if (link.prevConnected) {
      this.routeWayCheck(wayIndex - 1)
    }
  }

  if (checkNextWay) {
    link.nextConnected = true
    if (link.nextWay.members[0].id === link.way.members[0].id ||
        link.nextWay.members[link.nextWay.members.length - 1].id === link.way.members[0].id) {
      link.dir = 'backward'
    } else if (link.nextWay.members[0].id === link.way.members[link.way.members.length - 1].id ||
        link.nextWay.members[link.nextWay.members.length - 1].id === link.way.members[link.way.members.length - 1].id) {
      link.dir = 'forward'
    } else {
      link.nextConnected = false
    }

    if (link.nextConnected) {
      this.routeWayCheck(wayIndex + 1)
    }
  }

  for (var i = 0; i < link.stops.length; i++) {
    link.stops[i].wayDir = link.dir

    if (link.stops[i].stop) {
      link.stops[i].stop.requestUpdate()
    }
  }

  link.sharedRouteWay.requestUpdate()
}

Route.prototype._initStops = function () {
  this._stops = []
  this._stopsIndex = {}

  for (i = 0; i < this.object.members.length; i++) {
    var member = this.object.members[i]

    if (member.type === 'node' && member.role === 'stop') {
      if (member.id in this._stopsIndex) {
        this._stopsIndex[member.id].push(this._stops.length)
      } else {
        this._stopsIndex[member.id] = [ this._stops.length ]
      }

      this._stops.push({
        role: member.role,
        stopId: member.id,
        stopIndex: i,
        stop: false,
        routeId: this.id,
        route: this,
        stopIndexOnWay: null,
        stopLocationOnWay: null,
        wayDir: null,
        wayLink: null
      })
    }
  }
}

/**
 * return all or selected stops
 * @param {object} options Options
 * @param {number} [options.priority] Priority
 * @param {BoundingBox} [options.bbox] Only return stops within the given bounding box
 * @param {string|string[]} [options.ids] Only return specified ids
 * @param {function} featureCallback Callback which will be called for every found stop with the parameters: err, feature (Stop.Link), index
 * @param {function} finalCallback Callback which will be called when request finished with the paramters: err
 */
Route.prototype.stops = function (options, featureCallback, finalCallback) {
  var i

  if (!this._stops) {
    this._initStops()
  }

  if ('ids' in options && !Array.isArray(options.ids)) {
    options.ids = [ options.ids ]
  }

  var stopIds = []
  var stopIndexList = []
  for (i = 0; i < this._stops.length; i++) {
    if ((!('ids' in options)) ||
        ('ids' in options && options.ids.indexOf(this._stops[i].stopId) !== -1)) {
      if (this._stops[i].stop === false) {
        stopIds.push(this._stops[i].stopId)
        stopIndexList.push(i)
      } else {
        async.setImmediate(function (i) {
          featureCallback(null, this._stops[i], i)
        }.bind(this, i))
      }
    }
  }

  var param = {
    properties: OverpassFrontend.GEOM | OverpassFrontend.TAGS,
    priority: 'priority' in options ? options.priority : 0
  }
  param.priority += priorityFromScale[this.scaleCategory()]
  if (options.bbox) {
    param.bbox = options.bbox
  }

  return overpassFrontend.get(
    stopIds,
    param,
    function (stopIndexList, err, result, index) {
      var stopIndex = stopIndexList[index]

      if (result !== false && result !== null) {
        var link = this._stops[stopIndex]

        if (!link.stop) {
          link.stop = this.ptmap.stops.add(result)
          link.stop.addLink(link)
          this.stopCheck(stopIndex)
        }
      }

      featureCallback(err, this._stops[stopIndex], stopIndex)
    }.bind(this, stopIndexList),
    function (err) {
      finalCallback(err, this._stops)
    }.bind(this)
  )
}

/**
 * return a specific stop by id
 * @param {string} id ID of the stop node
 * @param {function} callback. Parameters: err, stop link object, index of the stop in the list.
 */
Route.prototype.getStop = function (id, callback) {
  var found = false

  this.stops(
    {
      ids: id
    },
    function (err, result, index) {
      found = true
      callback(err, result, index)
    },
    function (err) {
      if (!found) {
        callback(err, null, null)
      }
    }
  )
}

Route.prototype.stopCheck = function (stopIndex) {
  var link = this._stops[stopIndex]
}

// Factory
Route.factory = function (ptmap) {
  var routes = {}

  return {
    add: function (object) {
      if (!(object.id in routes)) {
        routes[object.id] = new Route(ptmap, object)
      }

      return routes[object.id]
    },
    all: function () {
      return routes
    },

    /**
     * get a route
     * @param {string|number} id - ID of the route (e.g. r910886)
     * @param {object} options - reserved for future use
     * @param {function} callback - callback which will be passed the result
     * @param {string|null} callback.error - if an error occured
     * @param {Route|null} callback.result - Route object
     */
    get: function (id, options, callback) {
      var filter = {
        onlyActive: false
      }

      if (!id.match(/^r[0-9]+/)) {
        async.setImmediate(function () {
          callback(null, null)
        })

        // return fake request object
        return {
          abort: function () {}
        }
      }

      if (id in routes) {
        async.setImmediate(function () {
          callback(null, routes[id])
        })

        // return fake request object
        return {
          abort: function () {}
        }
      }

      var found = false

      return overpassFrontend.get(
        [ id ],
        {
          properties: OverpassFrontend.TAGS | OverpassFrontend.MEMBERS | OverpassFrontend.BBOX
        },
        function (err, ob) {
          found = true

          if (ob) {
            if (ob.tags.type !== 'route' || !(ob.tags.route in config.routes)) {
              callback(null, null)
              return
            }

            _loadRoute.call(this, filter, callback, err, ob)
          } else {
            callback(err, null)
          }
        }.bind(this),
        function (err) {
          if (!found) {
            callback(err, null)
          }
        }
      )
    },

    query: function (filter, featureCallback, finalCallback) {
      var query = []
      for (var type in config.routes) {
        query.push(overpassFrontend.regexpEscape(type))
      }

      if (!('onlyActive' in filter)) {
        filter.onlyActive = true
      }

      var param = {
        properties: OverpassFrontend.TAGS | OverpassFrontend.MEMBERS | OverpassFrontend.BBOX,
        priority: 'priority' in filter ? filter.priority : 0,
        split: 32
      }
      param.priority += 0.2

      return overpassFrontend.BBoxQuery(
        'relation[type=route][route~"^(' + query.join('|') + ')$"]',
        filter.bbox,
        param,
        _loadRoute.bind(this, filter, featureCallback),
        function (err) {
          console.log('route final', err)
          finalCallback(err)
        }
      )
    }
  }

  // internal function _loadRoute
  function _loadRoute (filter, featureCallback, err, result) {
    if (err) {
      console.log('Error should not happen')
      return
    }

    var route = this.add(result)

    if (filter.onlyActive && !route.isActive()) {
      return
    }

    if (filter.minScaleCategory && route.scaleCategory() < filter.minScaleCategory) {
      return
    }

    featureCallback(null, route)
  }

}

module.exports = Route
