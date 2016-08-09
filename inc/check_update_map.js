var current_sections = [];

function check_update_map() {
  get_routes(function(err, routes) {
    update_map(routes, function(err, sections) {
      for(var i = 0; i < current_sections.length; i++) {
	current_sections[i].remove();
      }

      current_sections = sections;
    });
  });
}
