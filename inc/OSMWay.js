OSMWay.inherits_from(OSMObject);
function OSMWay() {
}

OSMWay.prototype.init = function(data) {
  this.parent("OSMWay").init.call(this, data);

  this.nodes = data.nodes;
  this.geometry = data.geometry;
}

OSMWay.prototype.data = function(callback) {
  callback(null, this.data);
}

OSMWay.prototype.render = function() {
  var geometry = this.data.geometry;
  var line = [];
  for(var j = 0; j < geometry.length; j++) {
    var g = geometry[j];
    line.push(new L.LatLng(g.lat, g.lon));
  }

  this.feature = L.polyline(line, { color: 'blue'}).addTo(map).bindPopup(this.id);
}
