var map;
var layer_route;

register_hook('init', function() {
  map = L.map('map').setView([48.202, 16.338], 15);

  var osm_mapnik = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  );
  osm_mapnik.addTo(map);

  layer_route = L.layerGroup().addTo(map);
});
