var overpass_elements = {};
var overpass_tiles = {};
var overpass_get_request_active = false;
var overpass_get_requests = {};

function overpass_get(id, callback) {
  if(id in overpass_elements) {
    return callback(null, overpass_elements[id]);
  }

  if(!overpass_get_request_active) {
    overpass_get_request_active = true;

    window.setTimeout(function() {
      overpass_get_request_active = false;
      var req = overpass_get_requests;
      overpass_get_requests = {};

      var query = "";

      for(var id in req) {
	var type = {
	  'n': 'node',
	  'w': 'way',
	  'r': 'relation',
	}[id.substr(0, 1)];

	query += type + '(' + id.substr(1) + ');';
      }

      http_load(
	'cache.php', // 'https://www.overpass-api.de/api/interpreter',
	null,
	"[out:json];(" + query + ");out meta geom;",
	function(err, results) {
	  for(var i = 0; i < results.elements.length; i++) {
	    var el = results.elements[i];
	    var id = el.type.substr(0, 1) + el.id;
	    overpass_elements[id] = el;
	  }

	  for(var id in req) {
	    var err = 'not found';
	    var el = null;

	    if(id in overpass_elements) {
	      err = null;
	      el = overpass_elements[id];
	    }

	    for(var i = 0; i < req[id].length; i++) {
	      req[id][i](err, el);
	    }
	  }
	});
    }, 1);
  }

  if(id in overpass_get_requests)
    overpass_get_requests[id].push(callback);
  else
    overpass_get_requests[id] = [ callback ];
}

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
      var todo_ids = {};

      for(var i = 0; i < results.elements.length; i++) {
	var el = results.elements[i];
	var id = el.type.substr(0, 1) + el.id;

	if(id in overpass_elements) {
	  ret.push(overpass_elements[id]);
	}
	else {
	  todo_ids[id] = {};
	  todo.push(el.type + '(' + el.id + ');');
	}
      }

      if(todo.length) {
	http_load(
	  'cache.php', // 'https://www.overpass-api.de/api/interpreter',
	  null,
	  '[out:json];(' + todo.join('') + ');out meta geom;>;out meta geom;',
	  function(err, results) {
	    for(var i = 0; i < results.elements.length; i++) {
	      var el = results.elements[i];
	      var id = el.type.substr(0, 1) + el.id;

	      if(id in todo_ids) {
		ret.push(el);
		delete(todo_ids[id]);
	      }

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
