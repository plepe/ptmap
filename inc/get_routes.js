function get_routes(callback) {
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
      if(route.is_visible(bounds))
        routes.push(route);
    },
    function(err, results) {
      callback(null, routes);
    }
  );
}
