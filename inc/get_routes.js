function get_routes(bounds, feature_callback, final_callback) {
  var query = [];
  for(var type in conf.routes) {
    query.push(overpass_regexp_escape(type));
  }

  var routes = [];
  var visible_routes = [];

  overpass_bbox_query(
    'relation[type=route][route~"^(' + query.join('|') + ')$"];',
    bounds,
    {
      priority: 2,
      properties: OVERPASS_TAGS | OVERPASS_MEMBERS | OVERPASS_BBOX,
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
      final_callback(null, visible_routes);
    }
  );
}
