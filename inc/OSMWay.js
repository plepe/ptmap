OSMWay.inherits_from(OSMObject);
function OSMWay() {
}

OSMWay.prototype.init = function(data) {
  this.parent("OSMWay").init.call(this, data);

  this.nodes = data.nodes;
  this.geometry = data.geometry;
}

OSMWay.prototype.GeoJSON = function() {
  var coordinates = [];
  for(var i = 0; i < this.geometry.length; i++)
    coordinates.push([ this.geometry[i].lon, this.geometry[i].lat ]);

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    },
    properties: this.tags
  };
}

OSMWay.prototype.px_length = function() {
  var points = this.geometry;
  var total_length = 0.0;

  for(var i = 1; i < this.geometry.length; i++) {
    var l1 = map.latLngToLayerPoint([ this.geometry[i - 1].lon, this.geometry[i - 1].lat ]);
    var l2 = map.latLngToLayerPoint([ this.geometry[i].lon, this.geometry[i].lat ]);

    var h = l1.x - l2.x;
    var v = l1.y - l2.y;

    var d = Math.sqrt(h * h + v * v);
    total_length += d;
  }

  return total_length;
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
