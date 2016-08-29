OSMNode.inherits_from(OSMObject);
function OSMNode() {
}

OSMNode.prototype.init = function(data) {
  this.parent("OSMNode").init.call(this, data);

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

    this.properties |= OVERPASS_BBOX | OVERPASS_CENTER | OVERPASS_GEOM;
  }

  // can't have members; make sure it won't get reloaded again
  this.properties |= OVERPASS_MEMBERS;
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
