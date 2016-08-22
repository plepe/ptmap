var shared_route_ways = {};
var shared_route_ways_ways = {};

function SharedRouteWay(way) {
  this.way = way;
  this.id = way.id;
  this.route_links = [];
  shared_route_ways[this.id] = this;
}

SharedRouteWay.prototype.add_route_link = function(link) {
  this.route_links.push(link);
}

SharedRouteWay.prototype.update = function() {
  this.remove();
  this.render();
}

SharedRouteWay.prototype.routes = function() {
  var ret = [];
  for(var i = 0; i < this.route_links.length; i++) {
    var link = this.route_links[i];
    ret.push(link.route);
  }

  return ret;
}

SharedRouteWay.prototype.top_route = function() {
  var ret = this.routes();

  if(ret.length)
    return ret[0];

  return null;
}

SharedRouteWay.prototype.stops = function() {
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

SharedRouteWay.prototype.build_popup = function() {
  var ret = "";
  var routes = this.routes();

  for(var i = 0; i < routes.length; i++) {
    ret += twig_render_custom("<div>{{ref}} {{to}}</div>", routes[i].tags);
  }

  return ret;
}

SharedRouteWay.prototype.build_label = function() {
  var ret = '';
  var routes = this.routes();
  var ref_both = [];
  var ref_forward = [];
  var ref_backward = [];
  var ref_unknown = [];


  if(!this.route_links.length)
    return '';

  for(var i = 0; i < this.route_links.length; i++) {
    var link = this.route_links[i];
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

SharedRouteWay.prototype.render = function() {
  var line = [];

//  if(!this.way.is_visible(map.getBounds()))
//    return;

  for(var k = 0; k < this.way.geometry.length; k++) {
    var g = this.way.geometry[k];
    line.push([ g.lat, g.lon ]);
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

SharedRouteWay.prototype.remove = function() {
  if(this.feature)
    map.removeLayer(this.feature);
}
