var shared_route_sections = [];
var shared_route_sections_ways = {};

function SharedRouteSection() {
  this.ways = [];
  this.id = shared_route_sections.length;
  shared_route_sections.push(this);
}

SharedRouteSection.prototype.add_way = function(way, link) {
  this.ways.push({
    id: way.id,
    way: way,
    links: [ link ],
    dir: link.dir
  });

  shared_route_sections_ways[way.id] = this;
}

SharedRouteSection.prototype.set_parts = function(remaining_parts) {
  var way = remaining_parts[0].member;

  this.remove();

  for(var i = 0; i < remaining_parts.length; i++) {
    var way = remaining_parts[i].member;
    var link = remaining_parts[i].link;

    if(way.id in shared_route_sections_ways) {
      console.log('end found');
      return i;
    }
    else {
      this.ways.push({
        id: way.id,
        way: way,
        links: [ link ],
        dir: link.dir
      });

      shared_route_sections_ways[way.id] = this;
    }
  }

  this.render();

  return i;
}

SharedRouteSection.prototype.set_ways = function(ways) {
  this.ways = ways;

  this.remove();

  for(var i = 0; i < this.ways.length; i++) {
    way = this.ways[i].way;
    shared_route_sections_ways[way.id] = this;
  }

  this.render();
}

SharedRouteSection.prototype.add_parts = function(remaining_parts) {
  var way = remaining_parts[0].member;
  var dir = null;
  var count = null;

  this.remove();

  for(var start = 0; start < this.ways.length; start++) {
    if(way == this.ways[start].way) {

      if(remaining_parts[0].link.dir == 'unknown')
        dir = null;
      else if(remaining_parts[0].link.dir == this.ways[start].links[0].dir)
        dir = 1;
      else
        dir = -1;

      count = 0;

      if(dir === null) {
        if(this.ways.length > 1)
          console.log('UNKNOWN -> split');
        // check if ways is longer? -> split
        this.render();
        return 1;
      }

      var j = start;
      while(j >= 0 && j < this.ways.length && count < remaining_parts.length) {
        if(this.ways[j].way == remaining_parts[count].member) {
          this.ways[j].links.push(remaining_parts[count].link);
        }
        else
          break;

        j += dir;
        count ++;
      }

      var end = j;

      if(start + count < this.ways.length) {
        var section = new SharedRouteSection();

        section.set_ways(this.ways.splice(start + count, this.ways.length - start - count));
      }

      if(start != 0) {
        var section = new SharedRouteSection();

        section.set_ways(this.ways.splice(0, start));
      }

      this.render();
      return count;
    }
  }
}

SharedRouteSection.prototype.add_way_link = function(way, link) {
  for(var i = 0; i < this.ways.length; i++) {
    if(this.ways[i].way == way) {
      this.ways[i].links.push(link);
    }
  }
}

SharedRouteSection.prototype.end_section = function() {
}

SharedRouteSection.prototype.routes = function() {
  if(!this.ways.length)
    return [];

  var ret = [];
  for(var i = 0; i < this.ways[0].links.length; i++) {
    var link = this.ways[0].links[i];
    ret.push(link.route);
  }

  return ret;
}

SharedRouteSection.prototype.top_route = function() {
  var ret = this.routes();
  return ret[0];
}

SharedRouteSection.prototype.stops = function() {
  if(this._stops)
    return this._stops;

  var stops = {};
  for(var i = 0; i < this.ways.length; i++) {
    for(var j = 0; j < this.ways[i].links.length; j++) {
      var link = this.ways[i].links[j];
      for(var k = 0; k < link.stops.length; k++) {
	if(!((i + '-' + k) in stops)) {
	  stops[i + '-' + k] = {
	    ob: link.stops[k].ob,
	    way: this.ways[i].way,
	    way_node_index: link.stops[k].node_index,
	    routes: []
	  };
	}

	stops[i + '-' + k].routes.push(link.route);
      }
    }
  }

  this._stops = [];
  for(var k in stops)
    this._stops.push(stops[k]);

  return this._stops;
}

SharedRouteSection.prototype.build_popup = function() {
  var ret = "";
  var routes = this.routes();

  for(var i = 0; i < routes.length; i++) {
    ret += twig_render_custom("<div>{{ref}} {{to}}</div>", routes[i].tags);
  }

  return ret;
}

SharedRouteSection.prototype.build_label = function() {
  var ret = '';
  var routes = this.routes();
  var ref_both = [];
  var ref_forward = [];
  var ref_backward = [];
  var ref_unknown = [];


  if(!this.ways.length)
    return '';

  for(var i = 0; i < this.ways[0].links.length; i++) {
    var link = this.ways[0].links[i];
    var route = link.route;
    var ref = null;

    if('ref' in route.tags)
      ref = route.tags.ref;

    if(ref !== null) {
      if(link.dir == null) {
	if(ref_unknown.indexOf(ref) == -1)
	  ref_unknown.push(ref);
      }
      else if(ref_both.indexOf(ref) != -1) {
	// already seen in both directions -> ignore
      }
      else if(link.dir == 'backward') {
	if(ref_forward.indexOf(ref) != -1) {
	  ref_forward.splice(ref_forward.indexOf(ref), 1);
	  ref_both.push(ref);
	}
	else if(ref_backward.indexOf(ref) == -1) {
	  ref_backward.push(ref);
	}
      }
      else if(link.dir == 'forward') {
	if(ref_backward.indexOf(ref) != -1) {
	  ref_backward.splice(ref_backward.indexOf(ref), 1);
	  ref_both.push(ref);
	}
	else if(ref_forward.indexOf(ref) == -1) {
	  ref_forward.push(ref);
	}
      }
    }
  }

  var sort_param = { insensitive: true };
  ref_both.sort(natsort(sort_param));
  ref_forward.sort(natsort(sort_param));
  ref_backward.sort(natsort(sort_param));
  ref_unknown.sort(natsort(sort_param));

  ret = '   ';
  if(ref_backward.length)
    ret += ' ← ' + ref_backward.join(', ') + '   ';

  if(ref_both.length)
    ret += ref_both.join(', ') + '   ';

  if(ref_forward.length)
    ret += ref_forward.join(', ') + ' → ';

  if(ref_unknown.length)
    ret += ' ?? ' + ref_unknown.join(', ') + ' ?? ';

  return ret + '             ';
}

SharedRouteSection.prototype.render = function() {
  var line = [];

  if(!this.ways.length)
    return;

  for(var j = 0; j < this.ways.length; j++) {
    var way = this.ways[j];

    var m = way.way.geometry.length - 1;
    if(!map.getBounds().intersects([
	[ way.way.geometry[0].lat, way.way.geometry[0].lon ],
	[ way.way.geometry[m].lat, way.way.geometry[m].lon ]
      ]))
      continue;

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

  var route_conf = {
    color: 'black'
  };

  var top_route = this.top_route();
  if('routes' in conf && top_route.tags.route in conf.routes) {
    route_conf = conf.routes[top_route.tags.route];
  }

  this.feature = L.polyline(line, {
    color: route_conf.color,
    opacity: 1
  }).addTo(map).bindPopup(this.build_popup());

//  this.feature.setText(this.build_label(), {
//    repeat: true,
//    offset: 12,
//    attributes: {
//      fill: route_conf.color
//    }
//  });
}

SharedRouteSection.prototype.remove = function() {
  if(this.feature)
    map.removeLayer(this.feature);
}

function shared_route_sections_add_route(route, parts, callback) {
    console.log('start ', route.tags.ref, route.id);
    var sections = [];
    var current_section = null;
    var current_section_index = null;
    var current_section_dir = null;
    var next_unconnected = 0;

    for(var j = 0; j < parts.length; ) {
      var part = parts[j];

      if((next_unconnected !== null) && (next_unconnected <= j)) {
        next_unconnected = parts.length;

        for(i  = j + 1; i < parts.length; i++)
          if(!parts[i].link.connected) {
            next_unconnected = i;
            break;
          }

        console.log('next_unconnected', next_unconnected);
      }

      var remaining_parts = parts.slice(j, next_unconnected);

      if(!(part.member.id in shared_route_sections_ways)) {
          current_section = new SharedRouteSection();

          var r = current_section.set_parts(
            remaining_parts
          );

          console.log(r);
          j += r;
      }
      else {
        current_section = shared_route_sections_ways[part.member.id];
        console.log('shared route section found', current_section.id);

        var r = current_section.add_parts(
          remaining_parts
        );

        console.log(r);
        j += r;
      }
    }

    console.log(shared_route_sections);

    async.setImmediate(function() {
      callback();
    });
}
