window.onload = function() {
  call_hooks("init");

  http_load("910885.json", null, null, function(err, data) {
    var route = new OSMRoute("r" + data.id, data);
    route.render();
  });
}
