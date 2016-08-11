var map;
var layer_route;

register_hook('init', function() {
  var osm_mapnik = new ol.layer.Tile({
    source: new ol.source.OSM()
  });


  layer_route = new ol.layer.Vector({
  });

  map = new ol.Map({
    layers: [ osm_mapnik, layer_route ],
    target: 'map',
    view: new ol.View({
      center: [ 16.338, 48.202],
      zoom: 15
    })
  });
});
