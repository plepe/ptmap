/* global L:false */
var natsort = require('natsort')
var async = require('async')
var arrayEquals = require('array-equal')

var cmpScaleCategory = require('./cmpScaleCategory')

function SharedRouteWay (ptmap, way) {
  this.ptmap = ptmap
  this.way = way
  this.id = way.id
  this.links = []
  this.updateNeeded = true
  this.lastRoutes = []
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
        offset: 12
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
        offset: 12
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
  if (typeof L === 'undefined') {
    return
  }

  var routes = this.routes()

  if (!routes.length) {
    return this.hide()
  }

  var style = this.getStyle()

  // line
  if (style.line) {
    if (this.feature) {
      this.feature.setStyle(style.line)
    }
    else {
      this.feature = L.polyline(this.way.geometry, style.line).addTo(this.ptmap.map)
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
    }
  }
}

module.exports = SharedRouteWay
