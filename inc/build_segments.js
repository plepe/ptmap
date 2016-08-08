function build_segments(routes) {
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
          segment: null
        };

      ways[part.member.ref].links.push(part.link);
    }
  }

  var segments = [];
  for(var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var parts = route_parts[route.id];
    var last_links = null;
    var current_segment = {
      id: segments.length,
      ways: []
    };

    for(var j = 0; j < parts.length; j++) {
      var part = parts[j];
      var links = ways[part.member.ref].links;

      // if current way has not already been assigned to a segment
      if(!ways[part.member.ref].segment) {
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

          // no match -> create new segment
          if(!match) {
            segments.push(current_segment);
            current_segment = {
              id: segments.length,
              ways: []
            };
          }
        }

        current_segment.ways.push({
          id: part.member.ref,
          way: part.member,
          links: links,
          dir: part.link.dir
        });
        ways[part.member.ref].segment = current_segment;
      }

      last_links = links;
    }

    segments.push(current_segment);
  }

  for(var i = 0; i < segments.length; i++) {
    var segment = segments[i];
    var line = [];

    for(var j = 0; j < segment.ways.length; j++) {
      var way = segment.ways[j];

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

    if(!segment.ways.length)
      return;

    L.polyline(line, { color: 'red'}).addTo(map).bindPopup("<pre>" + JSON.stringify(segment.ways[0].links, null, '    '));
  }
}
