OSMNode.inherits_from(OSMObject);
function OSMNode() {
}

OSMNode.prototype.init = function(data) {
  this.parent("OSMNode").init.call(this, data);
}

OSMNode.prototype.data = function(callback) {
  callback(null, this.data);
}

OSMNode.prototype.render = function() {
  L.circle(new L.LatLng(this.data.lat, this.data.lon), 10, { color: 'blue'}).addTo(map).bindPopup(this.id);
}
