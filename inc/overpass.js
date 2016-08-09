var overpass_elements = {};
var overpass_tiles = {};

function overpass_query(query, bounds, callback) {
  var ret = [];
  var bbox_string = bounds.toBBoxString();
  bbox_string = bbox_string.split(/,/);
  bbox_string = bbox_string[1] + ',' + bbox_string[0] + ',' +
                bbox_string[3] + ',' + bbox_string[2];

  http_load(
    'cache.php', // 'https://www.overpass-api.de/api/interpreter',
    null,
    "[out:json][bbox:" + bbox_string + "];" + query + "out ids bb;",
    function(err, results) {
      var todo = [];

      for(var i = 0; i < results.elements.length; i++) {
	var el = results.elements[i];
	var id = el.type.substr(0, 1) + el.id;

	if(id in overpass_elements) {
	  ret.push(overpass_elements[id]);
	}
	else {
	  todo.push(el.type + '(' + el.id + ');');
	}
      }

      if(todo.length) {
	http_load(
	  'cache.php', // 'https://www.overpass-api.de/api/interpreter',
	  null,
	  '[out:json];(' + todo.join('') + ');out meta geom;',
	  function(err, results) {
	    console.log(results);
	    for(var i = 0; i < results.elements.length; i++) {
	      var el = results.elements[i];
	      var id = el.type.substr(0, 1) + el.id;

	      ret.push(el);
	      overpass_elements[id] = el;
	    }

	    callback(null, ret);
	  }
	);
      }
      else {
	callback(null, ret);
      }
    }
  );
}
