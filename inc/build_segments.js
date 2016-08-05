function build_segments(routes) {
  var ways = {};
  var route_parts = {};
  var segments = [];

  for(var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var parts = route.route_parts();
    route_parts[route.id] = parts;

    for(var j = 0; j < parts.length; j++) {
      var part = parts[j];
      if(!(part[0].ref in ways))
        ways[part[0].ref] = { 'way': part[0], 'links': {}, 'segment': null };

      ways[part[0].ref].links[route.id] = part[1];
    }
  }


  for(var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var parts = route_parts[route.id];
    var last_links = null;
    var current_segment = {
      ways: []
    };

    for(var j = 0; j < parts.length; j++) {
      var part = parts[j];
      var links = ways[part[0].ref].links;
      if(ways[part[0].ref].segment)
        continue;

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

      last_links = links;
      current_segment.ways.push([ part[0], links, part[1].dir ]);
      ways[part[0].ref].segment = current_segment;
    }
  }

  console.log(segments);
  console.log(ways);
}
