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

  var done = true;
  for(var i = 0; i < ids.length; i++) {
    if(ids[i] in overpass_elements) {
      async.setImmediate(function(ob, i) {
        feature_callback(null, ob, i);
      }.bind(this, overpass_elements[ids[i]], i));
      ids[i] = null;
    }
    else {
      done = false;
      break;
    }
  }

  if(done) {
    if(final_callback) {
      async.setImmediate(function() {
        final_callback(null);
      });
    }
  }
  else {
    overpass_requests.push({
      ids: ids,
      feature_callback: feature_callback,
      final_callback: final_callback
    });

    _overpass_process();
  }
}

function _overpass_process() {
  if(overpass_request_active)
    return;

  if(!overpass_requests.length)
    return;

  overpass_request_active = true;
  var request = overpass_requests.pop();
  var ids = request.ids;

  var query = "";
  var todo = {};
  for(var i = 0; i < ids.length; i++) {
    if(ids[i] === null)
      continue;
    if(ids[i] in overpass_elements)
      continue;
    if(ids[i] in todo)
      continue;

    todo[ids[i]] = true;
    var id = ids[i].substr(1);
    var type = {
      'n': 'node',
      'w': 'way',
      'r': 'relation',
    }[ids[i].substr(0, 1)];

    query += type + '(' + id + ');';

    if(type == 'way')
      query += 'out body geom;\n';
    else if(type == 'relation')
      query += 'out body bb;\n';
    else
      query += 'out body;\n';
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

      for(var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if(id === null)
          continue;

        var err = 'not found';
        var el = null;
        if(id in overpass_elements) {
          err = null;
          el = overpass_elements[id];
        }

        request.feature_callback(null, el, i);
      }

      if(request.final_callback)
        request.final_callback(null);
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
	  '[out:json];((' + todo.join('') + ');)->.i;out bb body;node(r.i);out body;way(r.i);out body geom;',
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
