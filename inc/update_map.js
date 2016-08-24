function update_map(routes, callback) {
//  build_shared_route_sections(routes, function(err, sections) {
//    var stops = [];
//    for(var i = 0; i < sections.length; i++) {
//      stops = stops.concat(sections[i].stops());
//    }
//    stops = build_stops(stops);
//
//    update_map_render_all(sections, stops, function() {
//      callback(null, sections, stops);
//    });
//  });
}

function update_map_render_update_needed(callback) {
  shared_route_way_rerender_update();
  stops_rerender_update();

  async.setImmediate(function() {
    callback();
  });
}

function update_map_render_all(callback) {
  shared_route_way_rerender_all();
  stops_rerender_all();

  async.setImmediate(function() {
    callback();
  });
}

function update_map_remove_all(callback) {
  async.setImmediate(function() {
    callback();
  });
}
