/* global L:false */
var natsort = require('natsort')
var async = require('async')

function SharedRouteWay (ptmap, way) {
  this.ptmap = ptmap
  this.way = way
  this.id = way.id
  this.links = []
}

SharedRouteWay.prototype.requestUpdate = function () {
  this.ptmap.sharedRouteWays.requestUpdate(this)
}

SharedRouteWay.prototype.addLink = function (link) {
  this.links.push(link)
}

SharedRouteWay.prototype.routes = function () {
  var ret = []

  for (var i = 0; i < this.links.length; i++) {
    var link = this.links[i]

    ret.push(link.route)
  }

  return ret
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
    ret += ' ← ' + refBackward.join(', ') + '   '
  }

  if (refBoth.length) {
    ret += refBoth.join(', ') + '   '
  }

  if (refForward.length) {
    ret += refForward.join(', ') + ' → '
  }

  if (refUnknown.length) {
    ret += ' ?? ' + refUnknown.join(', ') + ' ?? '
  }

  return ret + '             '
}

SharedRouteWay.prototype.update = function (force) {
  if (!this.feature) {
    return
  }

  var routeConf = {
    color: 'black',
    priority: 0
  }

  this.feature.setLatLngs(this.way.geometry)

  this.feature.setText(null)
  this.feature.setText(this.build_label(), {
    repeat: true,
    offset: 12,
    attributes: {
      fill: routeConf.color
    }
  })

}

SharedRouteWay.prototype.show = function (map) {
  if (this.shown) {
    return this.update()
  }

  var routeConf = {
    color: 'black',
    priority: 0
  }

  this.feature = L.polyline(this.way.geometry, {
    color: routeConf.color,
    opacity: 1
  }).addTo(map)

  this.update()

  this.shown = true
}

SharedRouteWay.prototype.hide = function (map) {
  if (this.feature) {
    map.removeLayer(this.feature)
    delete this.feature
  }

  this.shown = false
}

// Factory
SharedRouteWay.factory = function (ptmap) {
  var sharedRouteWays = {}
  var updateRequested = []

  return {
    get: function (way) {
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
    }
  }
}

module.exports = SharedRouteWay
