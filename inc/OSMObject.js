function create_osm_object(data, request) {
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

  ret.init(data, request);

  return ret;
}

function OSMObject() {
}

OSMObject.prototype.title = function() {
  return this.tags.name || this.tags.operator || this.tags.ref;
}

OSMObject.prototype.init = function(data, request) {
  this.properties = 0;
  this.id = data.type.substr(0, 1) + data.id;
  this.type = data.type;
  this.osm_id = data.id;

  this.data = {};
  this.set_data(data, request);
}

OSMObject.prototype.set_data = function(data, request) {
  for(var k in data)
    this.data[k] = data[k];

  if(data.bounds) {
    this.bounds = L.latLngBounds(
      L.latLng(data.bounds.minlat, data.bounds.minlon),
      L.latLng(data.bounds.maxlat, data.bounds.maxlon)
    );
    this.center = this.bounds.getCenter();
  }
  else if(data.center) {
    this.bounds = L.latLng(data.center.lat, data.center.lon);
  }

  if(request.options.bbox) {
    if(!this.bounds || request.options.bbox.intersects(this.bounds))
      this.properties = this.properties | request.options.properties;
    else
      this.properties = this.properties | OVERPASS_BBOX | OVERPASS_CENTER;
  }
  else {
    this.properties = this.properties | request.options.properties;
  }

  if(request.options.properties & OVERPASS_TAGS) {
    if(typeof data.tags == 'undefined')
      this.tags = {};
    else
      this.tags = data.tags;
  }
  this.errors = [];

  if(data.timestamp) {
    this.meta = {
      timestamp: data.timestamp,
      version: data.version,
      changeset: data.changeset,
      user: data.user,
      uid: data.uid
    };
  }
}

OSMObject.prototype.member_ids = function() {
  return [];
}

OSMObject.prototype.member_of = function() {
  if(this.id in overpass_elements_member_of)
    return overpass_elements_member_of[this.id];

  return [];
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

OSMObject.prototype.highlight = function(param) {
  var content = new Content();

  content.set_title(this.title());

  content.add_chapter({
    title: 'Tags',
    weight: 5,
    content: '<pre wrap>' + escape_html(JSON.stringify(this.tags, null, '     '))
      .replace('\n', '<br/>\n') + '</pre>'
  });

  return content;
}
