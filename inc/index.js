window.onload = function() {
  call_hooks("init");

  http_load(
    'cache.php', // 'https://www.overpass-api.de/api/interpreter',
    null,
    "[out:json][bbox:48.194271721398096,16.3236665725708,48.20379718953509,16.35585308074951];relation[route=bus];out meta geom;",
    function(err, results) {
      var routes = [];
      for(var i = 0; i < results.elements.length; i++) {
	var data = results.elements[i];
	var ob = create_osm_object(data);
	routes.push(ob);
      }

      update_map(routes, function() {
      });
    }
  );
}
