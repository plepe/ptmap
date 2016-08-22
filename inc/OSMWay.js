OSMWay.inherits_from(OSMObject);
function OSMWay() {
}

OSMWay.prototype.init = function(data) {
  this.parent("OSMWay").init.call(this, data);

  this.nodes = data.nodes;
  this.geometry = data.geometry;
}

OSMWay.prototype.member_ids = function() {
  if(this._member_ids)
    return this._member_ids;

  this._member_ids = [];
  for(var i = 0; i < this.data.nodes.length; i++) {
    var member = this.data.nodes[i];

    this._member_ids.push('n' + member);
  }

  return this._member_ids;
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
