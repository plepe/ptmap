function Stop() {
}

Stop.prototype.init = function(data) {
  this.stop_positions = [ data ];

  this.bounds = L.latLngBounds(
    L.latLng(data.ob.geometry.lat, data.ob.geometry.lon),
    L.latLng(data.ob.geometry.lat, data.ob.geometry.lon)
  );
}

Stop.prototype.add_stop_position = function(data) {
  this.stop_positions.push(data);

  this.bounds.extend(
    L.latLng(data.ob.geometry.lat, data.ob.geometry.lon)
  );
}

Stop.prototype.name = function() {
  return this.stop_positions[0].ob.tags.name;
}

Stop.prototype.build_popup = function() {
  var ret = "<b>" + this.name() + "</b><ul>\n";

  for(var i = 0; i < this.stop_positions.length; i++) {
    for(var j = 0; j < this.stop_positions[i].routes.length; j++) {
      ret += "<li>" + this.stop_positions[i].routes[j].title() + "</li>";
    }
  }

  ret += "</ul>";

  return ret;
}

Stop.prototype.is_visible = function(bounds) {
  return this.bounds.intersects(bounds);
}

Stop.prototype.priority = function() {
  var max_avg_stop_distance = 0.0;

  for(var i = 0; i < this.stop_positions.length; i++) {
    var pos_max_avg_stop_distance = 0.0;

    for(var j = 0; j < this.stop_positions[i].routes.length; j++) {
      var dist = this.stop_positions[i].routes[j].avg_stop_distance();
      if(dist > pos_max_avg_stop_distance)
	pos_max_avg_stop_distance = dist;
    }

    max_avg_stop_distance += pos_max_avg_stop_distance;
  }

  return max_avg_stop_distance;
}

Stop.prototype.render = function() {
  if(!this.is_visible(map.getBounds()))
    return;

  this.feature = L.rectangle(this.bounds, {
    color: 'black',
    opacity: 0.8,
    fillColor: 'grey',
    fillOpacity: 0.4,
    weight: 1
  }).addTo(map).bindPopup(this.build_popup());

  if(this.priority() > 512.0) {
    var label = L.divIcon({
      className: 'label-stop',
      iconSize: null,
      html: '<div><span>' + this.name() + '</span></div>'
    });

    this.feature_label =
      L.marker(L.latLng(this.bounds.getNorth(), this.bounds.getCenter().lng), { icon: label }).addTo(map);
  }
}

Stop.prototype.remove = function() {
  if(this.feature)
    map.removeLayer(this.feature);
  if(this.feature_label)
    map.removeLayer(this.feature_label);

  delete(this.feature);
  delete(this.feature_label);
}

function build_stops(stops) {
  var result = [];
  var name_index = [];

  for(var i = 0; i < stops.length; i++) {
    var stop = stops[i];
    var name = stop.ob.tags.name;

    if(name) {
      if(name in name_index) {
	name_index[name].add_stop_position(stop);
      }
      else {
	var stop_ob = new Stop();
	stop_ob.init(stop);
	name_index[name] = stop_ob;
	result.push(stop_ob);
      }
    }
  }

  return result;
}
