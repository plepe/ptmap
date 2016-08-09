function get_routes(callback) {
  var bounds = map.getBounds();
  overpass_query(
    'relation[route=bus];',
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
