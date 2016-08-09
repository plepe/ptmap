function check_update_map() {
  get_routes(function(err, routes) {
    update_map(routes, function() {
    });
  });
}
