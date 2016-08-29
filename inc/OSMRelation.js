OSMRelation.inherits_from(OSMObject);
function OSMRelation() {
}

OSMRelation.prototype.init = function(data) {
  this.parent("OSMRelation").init.call(this, data);

  if(data.members) {
    this.properties |= OVERPASS_MEMBERS;

    for(var i = 0; i < data.members.length; i++) {
      var found = false;

      switch(data.members[i].type) {
        case 'node':
          if(data.members[i].lat)
            this.properties |= OVERPASS_GEOM;
          found = true;
          break;

        case 'way':
          if(data.members[i].geometry)
            this.properties |= OVERPASS_GEOM;
          found = true;
          break;
      }

      if(found)
        break;
    }

    // no node or way members -> set OVERPASS_GEOM to true to avoid reload
    if(!found)
      this.properties |= OVERPASS_GEOM;
  }
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
