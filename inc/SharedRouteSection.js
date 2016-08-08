function SharedRouteSection() {
}

SharedRouteSection.prototype.init = function(id) {
  this.id = id;
  this.ways = [];
}

SharedRouteSection.prototype.add_way = function(way, links, dir) {
  this.ways.push({
    id: way.ref,
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

SharedRouteSection.prototype.build_popup = function() {
  var ret = "";
  var routes = this.routes();

  for(var i = 0; i < routes.length; i++) {
    ret += twig_render_custom("<div>{{ref}} {{to}}</div>", routes[i].tags);
  }

  return ret;
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

  this.feature = L.polyline(line, { color: 'red'}).addTo(map).bindPopup(this.build_popup());
}

SharedRouteSection.prototype.remove = function() {
  if(this.feature)
    this.feature.remove();
}
