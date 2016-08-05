function OSMRoute(id, data) {
  this.id = id;
  this.data = data;
}

OSMRoute.prototype.data = function(callback) {
  callback(null, this.data);
}
