/* global call_hooks L:false */
var Environment = require('./Environment')
var PTMap = require('./PTMap')

window.onload = function () {
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
