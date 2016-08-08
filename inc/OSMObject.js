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

function get_osm_object(id, callback) {
  if(id in osm_objects) {
    callback(null, osm_objects[id]);
  }
  else {
    var type = {
      'n': 'node',
      'w': 'way',
      'r': 'relation',
    }[id.substr(0, 1)];

    http_load(
      'https://www.overpass-api.de/api/interpreter',
      null,
      "[out:json];" + type + "(" + id.substr(1) + ");out meta geom;",
      function(err, result) {
	if(!result.elements.length) {
          osm_objects[id] = null;
	  callback('not found', null);
	}
	else {
	  var r = create_osm_object(result.elements[0]);
	  callback(null, r);
	}
      }
    );
  }
}

function OSMObject() {
}

OSMObject.prototype.init = function(data) {
  this.id = data.type.substr(0, 1) + data.id;
  this.data = data;
  this.tags = data.tags;

  osm_objects[this.id] = this;
}
