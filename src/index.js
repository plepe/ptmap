/* global call_hooks L:false */
window.config = {}

var Environment = require('./Environment')
var EnvironmentFrontend = require('./EnvironmentFrontend')
var PTMap = require('./PTMap')
var OverpassFrontend = require('overpass-frontend')
var hash = require('sheet-router/hash')
var queryString = require('query-string')

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

  var map = L.map('map').setView([ config.location.lat, config.location.lon], config.location.zoom)

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
}
