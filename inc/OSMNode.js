OSMNode.inherits_from(OSMObject);
function OSMNode() {
}

OSMNode.prototype.set_data = function(data, request) {
  if(data.lat) {
    this.geometry = {
      lat: data.lat,
      lon: data.lon
    };

    this.bounds = L.latLngBounds(
        L.latLng(data.lat, data.lon),
        L.latLng(data.lat, data.lon)
      );
    this.center = L.latLng(data.lat, data.lon);
  }

  this.parent("OSMNode").set_data.call(this, data, request);
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
