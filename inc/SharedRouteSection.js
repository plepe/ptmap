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

  L.polyline(line, { color: 'red'}).addTo(map).bindPopup("<pre>" + JSON.stringify(this.ways[0].links, null, '    '));
}
