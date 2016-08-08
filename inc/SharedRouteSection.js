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
