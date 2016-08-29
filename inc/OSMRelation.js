OSMRelation.inherits_from(OSMObject);
function OSMRelation() {
}

OSMRelation.prototype.set_data = function(data, request) {
  this.parent("OSMRelation").set_data.call(this, data, request);
}

OSMRelation.prototype.member_ids = function() {
  if(this._member_ids)
    return this._member_ids;

  this._member_ids = [];
  for(var i = 0; i < this.data.members.length; i++) {
    var member = this.data.members[i];

    this._member_ids.push(member.type.substr(0, 1) + member.ref);
  }

  return this._member_ids;
}

OSMRelation.prototype.data = function(callback) {
  callback(null, this.data);
}

OSMRelation.prototype.render = function() {
  for(var i = 0; i < this.data.members.length; i++) {
    var member = this.data.members[i];

    if(member.type != 'way')
      continue;

    var line = [];
    for(var j = 0; j < member.geometry.length; j++) {
      var g = member.geometry[j];
      line.push(new L.LatLng(g.lat, g.lon));
    }

    this.feature = L.polyline(line, { color: 'red'}).addTo(map).bindPopup(this.data.tags.ref);
  }
}
