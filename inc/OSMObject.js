var osm_objects = {};

function create_osm_object(data) {
  var id = data.type.substr(0, 1) + data.id;
  if(id in osm_objects)
    return osm_objects[id];

  if(data.type == 'relation') {
    var ret = new OSMRoute();
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

  osm_objects[this.id] = this;
}
