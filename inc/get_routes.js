function get_routes(feature_callback, final_callback) {
  var query = [];
  for(var type in conf.routes) {
    query.push(overpass_regexp_escape(type));
  }

  var bounds = map.getBounds();
  var routes = [];
  overpass_bbox_query(
    'relation[type=route][route~"^(' + query.join('|') + ')$"];',
    bounds,
    {},
    function(err, route) {
      if(route.is_visible(bounds)) {
        feature_callback(null, route);
        routes.push(route);
      }
    },
    function(err, results) {
      final_callback(null, routes);
    }
  );
}
