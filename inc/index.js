window.onload = function() {
  call_hooks("init");

  var route_ids = [ '1306732', '1306733', '910885', '910886' ];
  async.map(route_ids,
    function(id, callback) {
      http_load(id + '.json', null, null, function(err, data) {
        var route = new OSMRoute("r" + data.id, data);
        callback(null, route);
      });
    },
    function(err, results) {
      for(var i = 0; i < results.length; i++) {
        results[i].render();
      }
    }
  );
}
