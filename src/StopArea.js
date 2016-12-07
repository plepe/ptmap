var BoundingBox = require('boundingbox')
var async = require('async')
var arrayEquals = require('array-equal')
var natsort = require('natsort')

var cmpScaleCategory = require('./cmpScaleCategory')

function StopArea (ptmap) {
  this.ptmap = ptmap
  this.id = null

  this.links = []
  this.bounds = null
  this.lastRoutes = []
}

StopArea.prototype.intersects = function (bbox) {
  return this.bounds.intersects(bbox)
}

StopArea.prototype.getUrl = function () {
  return {
    stopArea: this.id
  }
}

StopArea.prototype.open = function () {
  if (!this.shown) {
    this.show()
  }

  this.featurePopup.setLatLng(this.feature.getCenter())
  this.featurePopup.openOn(this.ptmap.map)
}

StopArea.prototype.close = function () {
}

StopArea.prototype.requestUpdate = function () {
  this.ptmap.stopAreas.requestUpdate(this)
}

StopArea.prototype.addStop = function (link) {
  this.links.push(link)

  if (this.bounds) {
    this.bounds.extend(link.node.bounds)
  } else {
    this.bounds = new BoundingBox(link.node.bounds)
  }

  var name = this.name()
  var pos = this.bounds.getCenter()
  if (name) {
    this.id = this.name() + ',' + pos.lon.toFixed(4) + ',' + pos.lat.toFixed(4)
  }
  else {
    this.id = this.links[0].node.id
  }

  link.stopArea = this
  this.requestUpdate()
}

StopArea.prototype.name = function () {
  if (!this.links.length) {
    return null
  }

  if (!('name' in this.links[0].node.tags)) {
    return 'unknown'
  }

  return this.links[0].node.tags.name
}

StopArea.prototype.routes = function (filter) {
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

StopArea.prototype.isActive = function () {
  return !!this.routes().length
}

StopArea.prototype.buildPopup = function () {
  var ret = "<b>" + this.name() + "</b><ul>\n"
  var r = []
  var i

  var routes = this.routes()

  for (i = 0; i < routes.length; i++) {
    r.push({
      ref: routes[i].ref(),
      text: "<li><a href='#route=" + routes[i].id + "'>" + routes[i].title() + "</a></li>"
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
        pane: 'stopArea'
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
        pane: 'stopArea'
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
        pane: 'stopArea'
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

  // popup
  if (!this.featurePopup) {
    this.featurePopup = L.popup()
    this.featurePopup.object = this
  }
  this.featurePopup.setContent(this.buildPopup())

  // area
  if (style.area) {
    if (this.feature) {
      this.feature.setBounds(this.bounds.toLeaflet())
      this.feature.setStyle(style.area)
    }
    else {
      this.feature = L.rectangle(this.bounds.toLeaflet(), style.area)
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
      this.featureLabel.setLatLng(L.latLng(this.bounds.getNorth(), this.bounds.getCenter().lon))
      this.featureLabel.setIcon(label)
    }
    else {
      this.featureLabel =
        L.marker(L.latLng(this.bounds.getNorth(), this.bounds.getCenter().lon), {
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

  this.shown = false
}

// Factory
StopArea.factory = function (ptmap) {
  var stopAreas = []
  var stopAreaNames = {}
  var updateRequested = []

  return {
    add: function (link) {
      var name = null

      if ('name' in link.node.tags) {
        name = link.node.tags.name
      }

      if (name) {
        if (name in stopAreaNames) {
          stopAreaNames[name][0].addStop(link)

          return stopAreaNames[name]
        } else {
          var ob = new StopArea(ptmap)
          stopAreas.push(ob)
          ob.addStop(link)
          stopAreaNames[name] = [ ob ]
        }
      } else {
        var ob = new StopArea(ptmap)
        stopAreas.push(ob)
        ob.addStop(link)

        return ob
      }
    },
    all: function () {
      return stopAreas
    },
    names: function () {
      return stopAreaNames
    },
    get: function (id, callback) {
      var done = false
      var m = id.match(/^(.*),(\-?[0-9]+\.[0-9]+),(\-?[0-9]+\.[0-9]+)$/)
      if (!m) {
        callback('invalid id', null)
        return
      }
      var name = m[1]

      return ptmap.getStopAreas(
        {
          bbox: {
            minlat: parseFloat(m[3]) - 0.001,
            maxlat: parseFloat(m[3]) + 0.001,
            minlon: parseFloat(m[2]) - 0.001,
            maxlon: parseFloat(m[2]) + 0.001
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
            callback('not found', null)
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

      request.requests.push(ptmap.getRoutes(
        filter,
        function (err, route) {
          stackRoutes++

          request.requests.push(route.stops(
            filter,
            function (err, stop, stopIndex) {
              if (done.indexOf(stop.stopArea) !== -1) {
                return
              }

              if (stop.node && stop.node.intersects(bbox)) {
                done.push(stop.stopArea)
                featureCallback(null, stop.stopArea)
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
