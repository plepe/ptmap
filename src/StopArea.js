var BoundingBox = require('boundingbox')
var async = require('async')
var arrayEquals = require('array-equal')
var natsort = require('natsort')
var turf = {
  distance: require('@turf/distance')
}

var cmpScaleCategory = require('./cmpScaleCategory')
var pxRectangleBuffer = require('./pxRectangleBuffer')

/**
 * A stop area - a collection of nearby stops with the same name
 * @constructor
 * @param {PTMap} ptmap Public transport map object - for accessing PTMap properties (e.g. map, environment, ...)
 * @property {string} id ID of the stop area. Consists of the name and the centroid latitude/longitude of all stop geometries. Might change as new stops are added during loading! Example: 'Main Station,0.234,-5.123'.
 * @property {Stop.Link[]} links Links to the routes of the stop area.
 * @property {Stop[]} _stops List of stops
 * @property {BoundingBox} bounds Bounding box of all stops
 */
function StopArea (ptmap) {
  this.ptmap = ptmap
  this.id = null

  this.links = []
  this._stops = []
  this.bounds = null
}

StopArea.prototype.intersects = function (bbox) {
  return this.bounds.intersects(bbox)
}

StopArea.prototype.getUrl = function () {
  return {
    stopArea: this.id
  }
}

/**
 * highlight object and show popup
 * @param {object} options for future use
 * @param {function} [callback] will be called when highlighting finished. The callback will be passed an err argument and a new map location.
 */
StopArea.prototype.open = function (options, callback) {
  if (!this.shown) {
    this.show()
  }

  this.featurePopup.setLatLng(this.feature.getCenter())
  this.featurePopup.openOn(this.ptmap.map)

  if (callback) {
    async.setImmediate(function () {
      callback(null, this.feature.getCenter())
    }.bind(this))
  }
}

StopArea.prototype.close = function () {
}

StopArea.prototype.requestUpdate = function () {
  this.ptmap.stopAreas.requestUpdate(this)
}

StopArea.prototype.addLink = function (link) {
  this.links.push(link)

  if (this._stops.indexOf(link.stop) === -1) {
    this._stops.push(link.stop)
  }

  if (this.bounds) {
    this.bounds.extend(link.stop.object.bounds)
  } else {
    this.bounds = new BoundingBox(link.stop.object.bounds)
  }

  var name = this.name()
  var pos = this.bounds.getCenter()
  if (name) {
    this.id = this.name() + ',' + pos.lat.toFixed(4) + ',' + pos.lon.toFixed(4)
  }
  else {
    this.id = this.links[0].stop.id
  }

  link.stopArea = this
  this.requestUpdate()
}

StopArea.prototype.name = function () {
  if (!this.links.length) {
    return null
  }

  if (!('name' in this.links[0].stop.object.tags)) {
    return 'unknown'
  }

  return this.links[0].stop.object.tags.name
}

/**
 * return all links whose route is currently active
 * @return {object[]} links
 */
StopArea.prototype.activeLinks = function (filter) {
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

    ret.push(link)
  }

  return ret
}

/**
 * return routes which are currently active
 * @return {Route[]} routes
 */
StopArea.prototype.routes = function (filter) {
  var ret = []
  var activeLinks = this.activeLinks()

  for (var i = 0; i < activeLinks.length; i++) {
    var link = activeLinks[i]
    ret.push(link.route)
  }

  return ret
}

/**
 * return stops of this stop area
 * @return {Stop[]} stops
 * @param {object} [filter] Filter results
 * @param {boolean} [filter.onlyActive=true] Return only stops of active routes
 */
StopArea.prototype.stops = function (filter) {
  var ret = []

  if (typeof filter === 'undefined') {
    filter = { onlyActive: true }
  }
  if (!('onlyActive' in filter)) {
    filter.onlyActive = true
  }

  for (var i = 0; i < this._stops.length; i++) {
    var stop = this._stops[i]

    if (filter.onlyActive === true && !stop.isActive()) {
      continue
    }

    ret.push(stop)
  }

  return ret
}

StopArea.prototype.isActive = function () {
  return !!this.routes().length
}

StopArea.prototype.buildPopup = function () {
  var ret = "<b>" + this.name() + "</b><ul>\n"
  var r = []
  var i

  var activeLinks = this.activeLinks()

  for (i = 0; i < activeLinks.length; i++) {
    var link = activeLinks[i]

    r.push({
      ref: link.route.ref(),
      text: "<li><a href='#q=" + link.route.id + "/" + link.stop.id + "'>" + link.route.title() + "</a></li>"
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

StopArea.prototype.topRoute = function () {
  var routes = this.routes()

  routes.sort(function (a, b) {
    return a.scaleCategory() < b.scaleCategory()
  })

  if (routes.length) {
    return routes[0]
  }

  return null
}

StopArea.prototype.scaleCategory = function () {
  var topRoute = this.topRoute()

  if (topRoute === null) {
    return null
  }

  return topRoute.scaleCategory()
}

StopArea.prototype.getStyle = function () {
  var topRoute = this.topRoute()
  var topScale = topRoute.scaleCategory()
  var routeConf = config.routes[topRoute.routeType]

  if (topScale === 0) {
    return {
    }
  } else if (topScale === 1) {
    return {
      area: {
        color: 'black',
        opacity: 0.8,
        fill: true,
        fillOpacity: 0.0,
        weight: 1,
        zIndex: 200,
        pane: 'stopArea',
        buffer: 3
      }
    }
  } else if (topScale === 2) {
    return {
      area: {
        color: 'black',
        opacity: 0.8,
        fill: true,
        fillOpacity: 0.0,
        weight: 2,
        zIndex: 201,
        pane: 'stopArea',
        buffer: 5
      },
      text: {
        fill: routeConf.color,
        'font-size': 10,
        offset: 6
      }
    }
  } else {
    return {
      area: {
        color: 'black',
        opacity: 0.8,
        fill: true,
        fillOpacity: 0.0,
        weight: 5,
        zIndex: 202,
        pane: 'stopArea',
        buffer: 8
      },
      text: {
        fill: routeConf.color,
        'font-size': 12,
        offset: 10
      }
    }
  }
}

StopArea.prototype.update = function (force) {
  if (typeof L === 'undefined') {
    return
  }

  var routes = this.routes()

  if (!routes.length) {
    return this.hide()
  }

  var style = this.getStyle()
  var geometry = this.bounds
  if ('area' in style && 'buffer' in style.area) {
    geometry = pxRectangleBuffer(this.bounds, style.area.buffer, this.ptmap.map)
  }

  // popup
  if (!this.featurePopup) {
    this.featurePopup = L.popup()
    this.featurePopup.object = this
    this.featurePopup.path = this.id
  }
  this.featurePopup.setContent(this.buildPopup())

  // area
  if (style.area) {
    if (this.feature) {
      this.feature.setBounds(geometry.toLeaflet())
      this.feature.setStyle(style.area)
    }
    else {
      this.feature = L.rectangle(geometry.toLeaflet(), style.area)
        .addTo(this.ptmap.map).bindPopup(this.featurePopup)
    }
  }
  else {
    if (this.feature) {
      this.ptmap.map.removeLayer(this.feature)
      delete this.feature
    }
  }

  // text
  if (style.text) {
    var label = L.divIcon({
      className: 'label-stop',
      iconSize: null,
      html: '<div><span style="font-size: ' + style.text['font-size'] +'px;">' + this.name() + '</span></div>'
    })

    if (this.featureLabel) {
      this.featureLabel.setLatLng(L.latLng(geometry.getNorth(), geometry.getCenter().lon))
      this.featureLabel.setIcon(label)
    }
    else {
      this.featureLabel =
        L.marker(L.latLng(geometry.getNorth(), geometry.getCenter().lon), {
          icon: label,
          pane: 'stopArea'
      }).addTo(this.ptmap.map).bindPopup(this.featurePopup)
    }
  }
  else {
    if (this.featureLabel) {
      this.ptmap.map.removeLayer(this.featureLabel)
      delete this.featureLabel
    }
  }

  for (var i = 0; i < this._stops.length; i++) {
    this._stops[i].update(force)
  }

  this.shown = true
}

StopArea.prototype.show = StopArea.prototype.update

StopArea.prototype.hide = function () {
  if (this.feature) {
    this.ptmap.map.removeLayer(this.feature)
    delete this.feature
  }
  if (this.featureLabel) {
    this.ptmap.map.removeLayer(this.featureLabel)
    delete this.featureLabel
  }
  for (var i = 0; i < this._stops.length; i++) {
    this._stops[i].hide()
  }

  this.shown = false
}

// Factory
StopArea.factory = function (ptmap) {
  var stopAreas = []
  var stopAreaNames = {}
  var updateRequested = []

  return {
    findNear: function (name, loc) {
      if (!(name in stopAreaNames)) {
        return null
      }

      var locGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [ loc.lat, loc.lon ]
        }
      }

      var found = null
      var minDistance = 0.5 // km

      for (var i = 0; i < stopAreaNames[name].length; i++) {
        var stopArea = stopAreaNames[name][i]
        var stopAreaCenter = stopArea.bounds.getCenter()
        stopAreaCenter = {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [ stopAreaCenter.lat, stopAreaCenter.lon ]
            }
          }

        var distance = turf.distance(locGeoJSON, stopAreaCenter, 'kilometers')
        if (distance < minDistance) {
          minDistance = distance
          found = stopArea
        }
      }

      return found
    },

    add: function (link) {
      var name = null

      if ('name' in link.stop.object.tags) {
        name = link.stop.object.tags.name
      }

      if (name) {
        var found
        if (found = this.findNear(name, link.stop.object.geometry)) {
          found.addLink(link)
          return found
        }

        var ob = new StopArea(ptmap)
        stopAreas.push(ob)
        ob.addLink(link)
        if (name in stopAreaNames) {
          stopAreaNames[name].push(ob)
        } else {
          stopAreaNames[name] = [ ob ]
        }

        return ob
      } else {
        var ob = new StopArea(ptmap)
        stopAreas.push(ob)
        ob.addLink(link)

        return ob
      }
    },
    all: function () {
      return stopAreas
    },
    names: function () {
      return stopAreaNames
    },

    /**
     * get a stop area
     * @param {string} id - ID of the stop area
     * @param {object} options - reserved for future use
     * @param {function} callback - callback which will be passed the result
     * @param {string|null} callback.error - if an error occured
     * @param {Route|null} callback.result - Route object
     */
    get: function (id, options, callback) {
      var done = false
      var m = id.match(/^(.*),(\-?[0-9]+\.[0-9]+),(\-?[0-9]+\.[0-9]+)$/)
      if (!m) {
        callback(null, null)
        return
      }
      var name = m[1]

      var found
      if (found = this.findNear(name, { lat: m[2], lon: m[3] })) {
        async.setImmediate(function () {
          callback(null, found)
        })

        // return fake request object
        return {
          abort: function () {}
        }
      }

      return ptmap.stopAreas.query(
        {
          bbox: {
            minlat: parseFloat(m[2]) - 0.001,
            maxlat: parseFloat(m[2]) + 0.001,
            minlon: parseFloat(m[3]) - 0.001,
            maxlon: parseFloat(m[3]) + 0.001
          }
        },
        function (err, stopArea) {
          if (name === stopArea.name()) {
            callback(null, stopArea)
            done = true
          }
        },
        function (err) {
          if (!done) {
            callback(err, null)
          }
        }
      )

    },
    requestUpdate: function (stopArea) {
      if (!updateRequested.length) {
        async.setImmediate(this.update.bind(this))
      }

      updateRequested.push(stopArea)
    },
    update: function (force) {
      var toUpdate = updateRequested
      updateRequested = []

      if (force) {
        toUpdate = stopAreas
      }

      for (var i = 0; i < toUpdate.length; i++) {
        toUpdate[i].update(force)
      }
    },

    query: function (filter, featureCallback, finalCallback) {
      var done = []
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
        console.log('PTMap.getStopAreasWays.abort called')
      }.bind(request)

      request.requests.push(ptmap.routes.query(
        filter,
        function (err, route) {
          stackRoutes++

          request.requests.push(route.stops(
            filter,
            function (err, link, stopIndex) {
              if (done.indexOf(link.stopArea) !== -1) {
                return
              }

              if (link.stop && link.stop.object.intersects(bbox)) {
                done.push(link.stopArea)
                featureCallback(null, link.stopArea)
              }
            },
            function (err, stops) {
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
    }
  }
}

module.exports = StopArea
