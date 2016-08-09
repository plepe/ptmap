var current_route_ids = {};
var current_route_count = 0;
var current_sections = [];

function check_update_map() {
  get_routes(function(err, routes) {

    if(routes.length != current_route_count) {
      current_route_ids = {};

      for(var i = 0; i < routes.length; i++) {
	current_route_ids[routes[i].id] = true;
      }

      current_route_count = routes.length;
    }
    else {
      var new_route_ids = {};
      var change = false;

      for(var i = 0 ; i < routes.length; i++) {
	new_route_ids[routes[i].id] = true;
	if(!(routes[i].id in current_route_ids))
	  change = true;
      }

      if(!change)
	return;

      current_route_count = routes.length;
    }

    update_map(routes, function(err, sections) {
      for(var i = 0; i < current_sections.length; i++) {
	current_sections[i].remove();
      }

      current_sections = sections;
    });
  });
}
