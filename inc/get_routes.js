var get_routes_cache = {};

function get_routes(bounds, feature_callback, final_callback) {
  var query = [];
  for(var type in conf.routes) {
    query.push(overpass_regexp_escape(type));
  }

  tile_bounds = bounds_to_tile(bounds);

  var routes = [];
  var visible_routes = [];
  var cache_id = tile_bounds.toBBoxString() + '|' + query.join('|');

  if(cache_id in get_routes_cache) {
    return async.setImmediate(function() {
      var routes = get_routes_cache[cache_id];

      for(var i = 0; i < routes.length; i++)
        if(routes[i].is_visible(bounds) && routes[i].is_active()) {
          visible_routes.push(routes[i]);
          feature_callback(null, routes[i]);
        }

      final_callback(null, visible_routes);
    });
  }

  overpass_bbox_query(
    'relation[type=route][route~"^(' + query.join('|') + ')$"];',
    tile_bounds,
    {
      priority: 2,
      order_approx_route_length: true
    },
    function(err, route) {
      if(route.is_visible(bounds) && route.is_active()) {
        visible_routes.push(route);
        feature_callback(null, route);
      }

      routes.push(route);
    },
    function(err, results) {
      get_routes_cache[cache_id] = routes;

      final_callback(null, visible_routes);
    }
  );
}
