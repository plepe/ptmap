/* global call_hooks L:false */
window.config = {}

var Environment = require('./Environment')
var EnvironmentFrontend = require('./EnvironmentFrontend')
var PTMap = require('./PTMap')
var OverpassFrontend = require('overpass-frontend')
var hash = require('sheet-router/hash')
var queryString = require('query-string')
var async = require('async')
var ipLocation = require('ip-location')
var map
ipLocation.httpGet = function (url, callback) {
  var xhr = new XMLHttpRequest()
  xhr.open('get', url, true)
  xhr.responseType = 'text'
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        callback(null, { body: xhr.responseText })
      } else {
        callback(xhr.responseText)
      }
    }
  }
  xhr.send()
}
var ipLoc

window.onload = function () {
  var xhr = new XMLHttpRequest()
  xhr.open('get', 'conf.json', true)
  xhr.responseType = 'json'
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        window.config = xhr.response
        init()
      } else {
        alert('Can\'t load configuration from server. Does conf.json exist?')
      }
    }
  };
  xhr.send()
}

function init () {
  var hashUpdated = false
  window.overpassFrontend = new OverpassFrontend(config.overpass.url, config.overpass)

  map = L.map('map')

  var osmMapnik = L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  )
  osmMapnik.addTo(map)

  map.on('popupopen', function (e) {
    e.popup._container.popup = e.popup
  })

  if ('checkIPLocation' in config.location && config.location.checkIPLocation) {
    ipLocation('', function (err, ipLoc) {
      if (typeof ipLoc === 'object' && 'latitude' in ipLoc) {
        map.setView([ ipLoc.latitude, ipLoc.longitude ], 14)
      } else {
        map.setView([ config.location.lat, config.location.lon ], config.location.zoom)
      }

      init2()
    })
  } else {
    map.setView([ config.location.lat, config.location.lon ], config.location.zoom)
    init2()
  }
}

function init2 () {
  var env = new Environment()
  ptmap = new PTMap(map, env)

  hash(function (loc) {
    if (hashUpdated) {
      hashUpdated = false
      return
    }

    var state = queryString.parse(loc.substr(1))
    ptmap.setState(state)
  })

  var state = queryString.parse(location.hash.substr(1))
  ptmap.setState(state)

  ptmap.on('updateState', function (e) {
    var newHash = '#' + queryString.stringify(e)

    if (location.hash !== newHash) {
      hashUpdated = true
      location.hash = newHash
    }
  })

  var environmentFrontend = new EnvironmentFrontend(env, document.getElementById('clock'))

  ptmap.showMapKey()
}

window.showMapKey = function () {
  ptmap.showMapKey()
}
