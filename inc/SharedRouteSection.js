function SharedRouteSection() {
}

SharedRouteSection.prototype.init = function(id) {
  this.id = id;
  this.ways = [];
}

SharedRouteSection.prototype.add_way = function(way, links, dir) {
  this.ways.push({
    id: way.id,
    way: way,
    links: links,
    dir: dir
  });
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

  this.feature.setText(this.build_label(), {
    repeat: true,
    offset: 12,
    attributes: {
      fill: route_conf.color
    }
  });
}

SharedRouteSection.prototype.remove = function() {
  if(this.feature)
    map.removeLayer(this.feature);
}
