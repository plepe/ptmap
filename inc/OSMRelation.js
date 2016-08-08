OSMRelation.inherits_from(OSMObject);
function OSMRelation() {
}

OSMRelation.prototype.init = function(data) {
  this.parent("OSMRelation").init.call(this, data);
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

    L.polyline(line, { color: 'red'}).addTo(map).bindPopup(this.data.tags.ref);
  }
}
