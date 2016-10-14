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
