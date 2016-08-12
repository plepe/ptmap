function get_routes(callback) {
  var query = [];
  for(var type in conf.routes) {
    query.push(overpass_regexp_escape(type));
  }

  var bounds = map.getBounds();
  overpass_query(
    'relation[type=route][route~"^(' + query.join('|') + ')$"];',
    bounds,
    function(err, results) {
      var routes = [];
      for(var i = 0; i < results.length; i++) {
	var data = results[i];
	var ob = create_osm_object(data);

	if(ob.is_visible(bounds)) {
	  routes.push(ob);
	}
      }

      callback(null, routes);
    }
  );
}
