OSMNode.inherits_from(OSMObject);
function OSMNode() {
}

OSMNode.prototype.init = function(data) {
  this.parent("OSMNode").init.call(this, data);

  this.geometry = {
    lat: data.lat,
    lon: data.lon
  };
}

OSMNode.prototype.GeoJSON = function() {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [ this.geometry.lon, this.geometry.lat ]
    },
    properties: this.tags
  };
}

OSMNode.prototype.data = function(callback) {
  callback(null, this.data);
}

OSMNode.prototype.render = function() {
  this.feature = L.circle(new L.LatLng(this.data.lat, this.data.lon), 10, { color: 'blue'}).addTo(map).bindPopup(this.id);
}
