function update_map(routes, callback) {
  build_shared_route_sections(routes, function(err, sections) {
    async.each(
      sections,
      function(section, callback) {
	section.render();
	callback();
      },
      function(err, results) {
	callback(err, results);
      }
    );
  });
}
