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
          links: {},
          segment: null
        };

      ways[part.member.ref].links[route.id] = part.link;
    }
  }

  var segments = [];
  for(var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var parts = route_parts[route.id];
    var last_links = null;
    var current_segment = {
      ways: []
    };

    for(var j = 0; j < parts.length; j++) {
      var part = parts[j];
      var links = ways[part.member.ref].links;
      if(!ways[part.member.ref].segment) {

      if(last_links === null) {
      }
      else {
        var match = true;

        for(var k in links) {
          if(k in last_links) {
          }
          else {
            match = false;
          }
        }
        for(var k in last_links) {
          if(k in links) {
          }
          else {
            match = false;
          }
        }

        if(!match) {
          segments.push(current_segment);
          current_segment = {
            ways: []
          };
        }
      }

      current_segment.ways.push([ part.member, links, part.link.dir ]);
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

      for(var k = 0; k < way[0].geometry.length; k++) {
        var g = way[0].geometry[k];
        line.push([ g.lat, g.lon ]);
      }
    }

    L.polyline(line, { color: 'red'}).addTo(map).bindPopup("<pre>" + JSON.stringify(segment.ways[0][1], null, '    '));
  }
}
