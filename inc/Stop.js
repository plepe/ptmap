var stops = [];
var stops_name_index = {};
var stops_need_update = {};

function Stop() {
  this.id = stops.length;
  stops.push(this);
}

Stop.prototype.init = function(data) {
  this.links = [ data ];

  this.bounds = L.latLngBounds(
    L.latLng(data.ob.geometry.lat, data.ob.geometry.lon),
    L.latLng(data.ob.geometry.lat, data.ob.geometry.lon)
  );

  this.update();
}

Stop.prototype.add_stop = function(data) {
  this.links.push(data);

  this.bounds.extend(
    L.latLng(data.ob.geometry.lat, data.ob.geometry.lon)
  );

  this.update();
}

Stop.prototype.update = function() {
  stops_need_update[this.id] = true;
}

Stop.prototype.name = function() {
  if(!('name' in this.links[0].ob.tags))
    return 'unknown';

  return this.links[0].ob.tags.name;
}

Stop.prototype.build_popup = function() {
  var ret = "<b>" + this.name() + "</b><ul>\n";

  for(var i = 0; i < this.links.length; i++) {
    ret += "<li>" + this.links[i].route.title() + "</li>";
  }

  ret += "</ul>";

  return ret;
}

Stop.prototype.is_visible = function(bounds) {
  return this.bounds.intersects(bounds);
}

Stop.prototype.render = function() {
  if(!this.is_visible(map.getBounds()))
    return;

  this.feature = L.rectangle(this.bounds, {
    color: 'black',
    opacity: 0.8,
    fill: true,
    fillOpacity: 0.0,
    weight: 5
  }).addTo(map).bindPopup(this.build_popup());

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

  delete(this.feature);
  delete(this.feature_label);
}

function add_stop(stop) {
  var name = null;

  if('name' in stop.ob.tags)
    name = stop.ob.tags.name;

  if(name) {
    if(name in stops_name_index) {
      stops_name_index[name].add_stop(stop);

      return stops_name_index[name];
    }
    else {
      var stop_ob = new Stop();
      stop_ob.init(stop);
      stops_name_index[name] = stop_ob;

      return stops_name_index[name];
    }
  }
  else {
    var stop_ob = new Stop();
    stop_ob.init(stop);

    return stop_ob;
  }
}

function build_stops(stops) {
  var result = [];
  var stops_name_index = [];

  for(var i = 0; i < stops.length; i++) {
    var stop = stops[i];

  }

  return result;
}

function stops_rerender_all() {
  for(var id = 0; id < stops.length; id++) {
    stops[id].remove();
    stops[id].render();
  }
  stops_need_update = {};
}

function stops_rerender_update() {
  for(var id in stops_need_update) {
    stops[id].remove();
    stops[id].render();
  }
  stops_need_update = {};
}
