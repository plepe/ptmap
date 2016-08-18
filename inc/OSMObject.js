function create_osm_object(data) {
  if(data.type == 'relation') {
    if(data.tags.type && (data.tags.type == 'route'))
      var ret = new OSMRoute();
    else
      var ret = new OSMRelation();
  }
  else if(data.type == 'way') {
      var ret = new OSMWay();
  }
  else if(data.type == 'node') {
      var ret = new OSMNode();
  }
  else {
    var ret = new OSMObject();
  }

  ret.init(data);

  return ret;
}

function OSMObject() {
}

OSMObject.prototype.init = function(data) {
  this.id = data.type.substr(0, 1) + data.id;
  this.data = data;
  this.tags = data.tags;
  if(typeof this.tags != 'object')
    this.tags = {};
  this.errors = [];

  if(data.bounds) {
    this.bounds = L.latLngBounds(
      L.latLng(data.bounds.minlat, data.bounds.minlon),
      L.latLng(data.bounds.maxlat, data.bounds.maxlon)
    );
  }
}

OSMObject.prototype.GeoJSON = function() {
  return {
    type: 'Feature',
    geometry: null,
    properties: this.tags
  };
}

OSMObject.prototype.render = function() {
}

OSMObject.prototype.remove = function() {
  if(this.feature)
    map.removeLayer(this.feature);
}

OSMObject.prototype.is_visible = function(bounds) {
  if(!this.bounds)
    return null;

  return this.bounds.intersects(bounds);
}
