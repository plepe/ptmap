function Stop() {
}

Stop.prototype.init = function(data) {
  this.links = [ data ];

  this.bounds = L.latLngBounds(
    L.latLng(data.ob.geometry.lat, data.ob.geometry.lon),
    L.latLng(data.ob.geometry.lat, data.ob.geometry.lon)
  );
}

Stop.prototype.add_stop = function(data) {
  this.links.push(data);

  this.bounds.extend(
    L.latLng(data.ob.geometry.lat, data.ob.geometry.lon)
  );
}

Stop.prototype.name = function() {
  return this.links[0].ob.tags.name;
}

Stop.prototype.build_popup = function() {
  return "<b>" + this.name() + "</b>";
}

Stop.prototype.render = function() {
  this.feature = L.rectangle(this.bounds, { color: 'blue'}).addTo(map).bindPopup(this.build_popup());
  var label = L.divIcon({
    className: 'label-stop',
    iconSize: null,
    html: '<div><span>' + this.name() + '</span></div>'
  });

  this.feature_label =
    L.marker(L.latLng(this.bounds.getNorth(), this.bounds.getCenter().lng), { icon: label }).addTo(map);
}

Stop.prototype.remove = function() {
  if(this.feature)
    map.removeLayer(this.feature);
  if(this.feature_label)
    map.removeLayer(this.feature_label);
}

function build_stops(stops) {
  var result = [];
  var name_index = [];

  for(var i = 0; i < stops.length; i++) {
    var stop = stops[i];
    var name = stop.ob.tags.name;

    if(name) {
      if(name in name_index) {
	name_index[name].add_stop(stop);
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
