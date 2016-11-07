var BoundingBox = require('boundingbox')

function StopArea (ptmap) {
  this.ptmap = ptmap
  this.id = null

  this.links = []
  this.bounds = null
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
    this.id = this.name() + '|' + pos.lon.toFixed(4) + '|' + pos.lat.toFixed(4)
  }
  else {
    this.id = this.links[0].node.id
  }

  link.stopArea = this
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

StopArea.prototype.routes = function () {
  var ret = []

  for (var i = 0; i < this.links.length; i++) {
    var link = this.links[i]

    ret.push(link.route)
  }

  return ret
}

StopArea.prototype.buildPopup = function () {
  var ret = "<b>" + this.name() + "</b><ul>\n"

  var routes = this.routes()

  for (var i = 0; i < routes.length; i++) {
    ret += "<li><a href='" + routes[i].id + "'>" + routes[i].title() + "</a></li>"
  }

  ret += "</ul>"

  return ret
}

StopArea.prototype.show = function(map) {
  if (this.feature) {
    this.feature.setBounds(this.bounds.toLeaflet())
    this.featureLabel.setLatLng(L.latLng(this.bounds.getNorth(), this.bounds.getCenter().lon))
  } else {
    this.feature = L.rectangle(this.bounds.toLeaflet(), {
      color: 'black',
      opacity: 0.8,
      fill: true,
      fillOpacity: 0.0,
      weight: 5,
      zIndex: 200
    }).addTo(map).bindPopup(this.buildPopup())

    var label = L.divIcon({
      className: 'label-stop',
      iconSize: null,
      html: '<div><span>' + this.name() + '</span></div>'
    })

    this.featureLabel =
      L.marker(L.latLng(this.bounds.getNorth(), this.bounds.getCenter().lon), {
	icon: label
    }).addTo(map)

    this.shown = true
  }
}

StopArea.prototype.hide = function(map) {
  if (this.feature) {
    map.removeLayer(this.feature)
    delete this.feature
  }
  if (this.featureLabel) {
    map.removeLayer(this.featureLabel)
    delete this.featureLabel
  }

  this.shown = false
}

// Factory
StopArea.factory = function (ptmap) {
  var stopAreas = []
  var stopAreaNames = {}

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
    }
  }
}

module.exports = StopArea
