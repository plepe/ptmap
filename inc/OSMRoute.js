function OSMRoute(id, data) {
  this.id = id;
  this.data = data;
}

OSMRoute.prototype.data = function(callback) {
  callback(null, this.data);
}

OSMRoute.prototype.render = function() {
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

OSMRoute.prototype.route_parts = function() {
  var result = [];
  var route_index = 0;

  for(var i = 0; i < this.data.members.length; i++) {
    var member = this.data.members[i];

    if(member.type != 'way')
      continue;
    if(member.role != '')
      continue;

    result.push([
      member,
      {
        'role': member.role,
        'dir': 'forward',
        'route_index': route_index++
      }
    ]);
  }

  return result;
}
