function build_shared_route_sections(routes) {
  var ways = {};
  var route_parts = {};

  for(var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var parts = route.route_parts();
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

  var shared_route_sections = [];
  for(var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var parts = route_parts[route.id];
    var last_links = null;
    var current_shared_route_section = {
      id: shared_route_sections.length,
      ways: []
    };

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
                if(l1.route_id == l2.route_id)
                  found = true;
              }

              if(!found)
                match = false;
            }
          }

          // no match -> create new shared_route_section
          if(!match) {
            shared_route_sections.push(current_shared_route_section);
            current_shared_route_section = {
              id: shared_route_sections.length,
              ways: []
            };
          }
        }

        current_shared_route_section.ways.push({
          id: part.member.ref,
          way: part.member,
          links: links,
          dir: part.link.dir
        });
        ways[part.member.ref].shared_route_section = current_shared_route_section;
      }

      last_links = links;
    }

    shared_route_sections.push(current_shared_route_section);
  }

  for(var i = 0; i < shared_route_sections.length; i++) {
    var shared_route_section = shared_route_sections[i];
    var line = [];

    for(var j = 0; j < shared_route_section.ways.length; j++) {
      var way = shared_route_section.ways[j];

      if(way.dir == 'backward') {
        for(var k = way.way.geometry.length - 1; k >= 0; k--) {
          var g = way.way.geometry[k];
          line.push([ g.lat, g.lon ]);
        }
      }
      else {
        for(var k = 0; k < way.way.geometry.length; k++) {
          var g = way.way.geometry[k];
          line.push([ g.lat, g.lon ]);
        }
      }
    }

    if(!shared_route_section.ways.length)
      return;

    L.polyline(line, { color: 'red'}).addTo(map).bindPopup("<pre>" + JSON.stringify(shared_route_section.ways[0].links, null, '    '));
  }
}
