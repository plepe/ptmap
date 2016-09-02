var current_route_ids = {};
var current_route_count = 0;
var current_sections = [];
var current_stops = [];
var check_update_map_active = false;
var check_update_map_requested = false;
var check_update_map_rerender = false;

function re_render_map() {
}

function check_update_map() {
  if(map.getZoom() < 14) {
    overpass_abort_all_requests();

    async.setImmediate(function() {
      update_map_remove_all(function() {});
    });

    return;
  }

  if(!check_update_map_rerender) {
    check_update_map_rerender = true;
    async.setImmediate(function() {
      update_map_check_visibility(function() {
        check_update_map_rerender = false;
      });
    }.bind(this));
  }

  if(check_update_map_active) {
    check_update_map_requested = true;
    return;
  }

  check_update_map_active = true;
  check_update_map_requested = false;

  var bounds = map.getBounds();

  overpass_abort_all_requests();

  get_routes(
    bounds,
    function(err, route) {
      route.route_parts(bounds, function() {
        async.setImmediate(function() {
          update_map_render_update_needed(function() {});
        });
      });
    }
    ,
    function(err, routes) {
      check_update_map_active = false;

      if(err == 'abort')
        return;

      if(check_update_map_requested)
        check_update_map();
    }
  );
}
