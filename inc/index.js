window.onload = function() {
  call_hooks("init");

  get_routes(function(err, routes) {
    update_map(routes, function() {
    });
  });
}
