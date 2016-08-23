var get_routes_cache = {};

function get_routes(bounds, feature_callback, final_callback) {
  var query = [];
  for(var type in conf.routes) {
    query.push(overpass_regexp_escape(type));
  }

  var routes = [];
  var cache_id = bounds.toBBoxString() + '|' + query.join('|');

  if(cache_id in get_routes_cache) {
    return async.setImmediate(function() {
      var routes = get_routes_cache[cache_id];
      for(var i = 0; i < routes.length; i++)
        feature_callback(null, routes[i]);
      final_callback(null, routes);
    });
  }

  overpass_bbox_query(
    'relation[type=route][route~"^(' + query.join('|') + ')$"];',
    bounds,
    {
      priority: 2,
      order_approx_route_length: true
    },
    function(err, route) {
      feature_callback(null, route);
      routes.push(route);
    },
    function(err, results) {
      get_routes_cache[cache_id] = routes;

      final_callback(null, routes);
    }
  );
}
