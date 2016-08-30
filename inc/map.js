var map;

register_hook('init', function() {
  map = L.map('map').setView([48.202, 16.338], 15);

  var osm_mapnik = L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  );
  osm_mapnik.addTo(map);
});

function map_order_features_by_zindex() {
  var layer_list = [];

  map.eachLayer(function(layer) {
    layer_list.push([ layer.options.zIndex, layer ]);
  });

  layer_list = weight_sort(layer_list);

  for(var i = 0; i < layer_list.length; i++) {
    if(layer_list[i].bringToFront)
      layer_list[i].bringToFront();
  }
}
