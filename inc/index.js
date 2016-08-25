window.onload = function() {
  call_hooks("init");

  check_update_map();

  map.on('moveend', function(e) {
    check_update_map();
  });

  environment = new Environment();
}
