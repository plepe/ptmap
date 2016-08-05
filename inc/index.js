window.onload = function() {
  call_hooks("init");

  var route_ids = [ '1306732', '1306733', '910885', '910886' ];
  for(var i = 0; i < route_ids.length; i++) {
    http_load(route_ids[i] + '.json', null, null, function(err, data) {
      var route = new OSMRoute("r" + data.id, data);
      route.render();
    });
  }
}
