function build_shared_route_sections(routes, callback) {
  var ways = {};
  var route_parts = {};

  async.each(routes, function(route, callback) {
      route.route_parts(function(route, err, parts) {
	_build_shared_route_sections_ways(route, err, parts);
	callback();
      }.bind(this, route));
    },
    _build_shared_route_sections_sections
  );

function _build_shared_route_sections_ways(route, err, parts) {
  route_parts[route.id] = parts;

  for(var j = 0; j < parts.length; j++) {
    var part = parts[j];
    if(!(part.member.ref in ways))
      ways[part.member.ref] = {
	way: part.member,
	links: [],
	shared_route_section: null
      };

    ways[part.member.ref].links.push(part.link);
  }
}

function _build_shared_route_sections_sections() {
  var shared_route_sections = [];
  for(var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var parts = route_parts[route.id];
    var last_links = null;
    var current_shared_route_section = new SharedRouteSection();
    current_shared_route_section.init(shared_route_sections.length);

    for(var j = 0; j < parts.length; j++) {
      var part = parts[j];
      var links = ways[part.member.ref].links;

      // if current way has not already been assigned to a shared_route_section
      if(!ways[part.member.ref].shared_route_section) {
        // first way of a route
        if(last_links !== null) {
          var match = true;

          if(last_links.length != links.length)
            match = false;

          if(match) {
            for(var l1 = 0; l1 < links.length; l1++) {
              var found = false;
              for(var l2 = 0; l2 < links.length; l2++) {
                if(l1.route == l2.route)
                  found = true;
              }

              if(!found)
                match = false;
            }
          }

          // no match -> create new shared_route_section
          if(!match) {
            shared_route_sections.push(current_shared_route_section);
            current_shared_route_section = new SharedRouteSection();
	    current_shared_route_section.init(shared_route_sections.length);
          }
        }

        current_shared_route_section.add_way(
	  part.member,
          links,
          part.link.dir
        );
        ways[part.member.ref].shared_route_section = current_shared_route_section;
      }

      last_links = links;
    }

    shared_route_sections.push(current_shared_route_section);
  }

  callback(null, shared_route_sections);
}
}
