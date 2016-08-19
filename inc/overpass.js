var overpass_elements = {};
var overpass_tiles = {};
var overpass_requests = [];
var overpass_request_active = false;

/**
 * @param array|string ids One or more IDs, e.g. [ 'n123', 'w2345', 'n123' ]
 * @param function feature_callback Will be called for each object in the order of the IDs in parameter 'ids'. Will be passed: 1. err (if an error occured, otherwise null), 2. the object or null, 3. the index in the array ids.
 * @param function final_callback Will be called after the last feature. Will be passed: 1. err (if an error occured, otherwise null).
 */
function overpass_get(ids, feature_callback, final_callback) {
  if(typeof ids == 'string')
    ids = [ ids ];

  overpass_requests.push({
    ids: ids,
    feature_callback: feature_callback,
    final_callback: final_callback
  });

  _overpass_process();
}

function _overpass_process() {
  if(overpass_request_active)
    return;

  if(!overpass_requests.length)
    return;

  overpass_request_active = true;
  var todo = {};
  var query = "";
  for(var j = 0; j < overpass_requests.length; j++) {
    var request = overpass_requests[j];
    var ids = request.ids;
    var all_found_until_now = true;

    for(var i = 0; i < ids.length; i++) {
      if(ids[i] === null)
        continue;
      if(ids[i] in overpass_elements) {
        if(all_found_until_now) {
          request.feature_callback(null, overpass_elements[ids[i]], i);
          request.ids[i] = null;
        }
        continue;
      }

      all_found_until_now = false;
      if(ids[i] in todo)
        continue;

      todo[ids[i]] = true;
    }

    if(all_found_until_now) {
      request.final_callback(null);
      overpass_requests[j] = null;
    }
  }

  var p;
  while((p = overpass_requests.indexOf(null)) != -1)
    overpass_requests.splice(p, 1);

  for(var id in todo) {
    var type = {
      'n': 'node',
      'w': 'way',
      'r': 'relation',
    }[id.substr(0, 1)];

    query += type + '(' + id.substr(1) + ');';

    if(type == 'way')
      query += 'out body geom;\n';
    else if(type == 'relation')
      query += 'out body bb;\n';
    else
      query += 'out body;\n';
  }

  if(query == '') {
    overpass_request_active = false;
    return;
  }

  http_load(
    conf.overpass.url,
    null,
    "[out:json];" + query,
    function(err, results) {
      for(var i = 0; i < results.elements.length; i++) {
        var el = results.elements[i];
        var id = el.type.substr(0, 1) + el.id;
        overpass_elements[id] = create_osm_object(el);
      }

      for(var id in todo) {
        if(!(id in overpass_elements))
          overpass_elements[id] = null;
      }

      overpass_request_active = false;

      _overpass_process();
   }
 );
}

function overpass_query(query, bounds, callback) {
  var ret = [];
  var bbox_string = bounds.toBBoxString();
  bbox_string = bbox_string.split(/,/);
  bbox_string = bbox_string[1] + ',' + bbox_string[0] + ',' +
                bbox_string[3] + ',' + bbox_string[2];

  http_load(
    conf.overpass.url,
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
	  conf.overpass.url,
	  null,
	  '[out:json];((' + todo.join('') + ');)->.i;out bb body;', //node(r.i);out body;', //way(r.i);out body geom;',
	  function(err, results) {
	    for(var i = 0; i < results.elements.length; i++) {
	      var el = results.elements[i];
	      var id = el.type.substr(0, 1) + el.id;

	      overpass_elements[id] = create_osm_object(el);

	      if(id in todo_ids) {
		ret.push(overpass_elements[id]);
		delete(todo_ids[id]);
	      }
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

function overpass_regexp_escape(s) {
  return s.replace('\\', '\\\\')
       .replace('.', '\\.')
       .replace('|', '\\|')
       .replace('[', '\\[')
       .replace(']', '\\]')
       .replace('(', '\\(')
       .replace(')', '\\)')
       .replace('{', '\\{')
       .replace('}', '\\}')
       .replace('?', '\\?')
       .replace('+', '\\+')
       .replace('*', '\\*')
       .replace('^', '\\^')
       .replace('$', '\\$');
}
