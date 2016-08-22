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

function update_map_render_all(sections, stops, callback) {
    async.series([
      function(callback) {
	async.each(
	  sections,
	  function(section, callback) {
	    section.render();
	    callback();
	  }
	);
	callback();
      },
      function(callback) {
	async.each(
	  stops,
	  function(stop, callback) {
	    stop.render();
	    callback();
	  }
	);
	callback();
      },
      function(callback2) {
	callback2();
	callback(null, sections, stops);
      }
    ]);
}

function update_map_remove_all(sections, stops, callback) {
  for(var i = 0; i < sections.length; i++) {
    sections[i].remove();
  }
  for(var i = 0; i < stops.length; i++) {
    stops[i].remove();
  }
  callback();
}
