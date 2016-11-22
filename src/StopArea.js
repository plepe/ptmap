var BoundingBox = require('boundingbox')
var async = require('async')
var arrayEquals = require('array-equal')
var natsort = require('natsort')

function StopArea (ptmap) {
  this.ptmap = ptmap
  this.id = null

  this.links = []
  this.bounds = null
  this.lastRoutes = []
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

StopArea.prototype.update = function (force) {
  var routes = this.routes()

  if (!this.updateNeeded) {
    // check if routes array still equal
    if (arrayEquals(routes, this.lastRoutes)) {
      return
    }
    this.lastRoutes = routes
  }

  if (!routes.length) {
    return this.hide()
  } else if (!this.shown) {
    return this.show()
  }

  this.feature.setBounds(this.bounds.toLeaflet())
  this.featureLabel.setLatLng(L.latLng(this.bounds.getNorth(), this.bounds.getCenter().lon))
  this.featurePopup.setContent(this.buildPopup())
}

StopArea.prototype.show = function () {
  if (typeof L === 'undefined') {
    return
  }
  if (this.shown) {
    return this.update()
  }

  this.featurePopup = L.popup().setContent(this.buildPopup())
  this.featurePopup.object = this

  this.feature = L.rectangle(this.bounds.toLeaflet(), {
    color: 'black',
    opacity: 0.8,
    fill: true,
    fillOpacity: 0.0,
    weight: 5,
    zIndex: 200,
    pane: 'stopArea'
  }).addTo(this.ptmap.map).bindPopup(this.featurePopup)

  var label = L.divIcon({
    className: 'label-stop',
    iconSize: null,
    html: '<div><span>' + this.name() + '</span></div>'
  })

  this.featureLabel =
    L.marker(L.latLng(this.bounds.getNorth(), this.bounds.getCenter().lon), {
      icon: label,
      pane: 'stopArea'
  }).addTo(this.ptmap.map).bindPopup(this.featurePopup)

  this.shown = true
}

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

      ptmap.getStopAreas(
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
    }
  }
}

module.exports = StopArea
