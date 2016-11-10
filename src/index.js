/* global call_hooks L:false */
window.config = {}

var Environment = require('./Environment')
var PTMap = require('./PTMap')
var OverpassFrontend = require('overpass-frontend')

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
  window.overpassFrontend = new OverpassFrontend(config.overpass.url, config.overpass)

  var map = L.map('map').setView([48.202, 16.338], 15)

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

  var ptmap = new PTMap(map)

  ptmap.checkUpdateMap()

  map.on('moveend', function (e) {
    ptmap.checkUpdateMap()
  })

//  var environment = new Environment()
}
