var overpass_elements = {};
var overpass_tiles = {};
var overpass_requests = [];
var overpass_request_active = false;

/**
 * @param {(string|string[])} ids - One or more IDs, e.g. [ 'n123', 'w2345', 'n123' ]
 * @param {object} options
 * @param {number} [options.priority=0] - Priority for loading these objects. The lower the sooner they will be requested.
 * @param {function} feature_callback - Will be called for each object in the order of the IDs in parameter 'ids'. Will be passed: 1. err (if an error occured, otherwise null), 2. the object or null, 3. the index in the array ids.
 * @param {function} final_callback - Will be called after the last feature. Will be passed: 1. err (if an error occured, otherwise null).
 */
function overpass_get(ids, options, feature_callback, final_callback) {
  if(typeof ids == 'string')
    ids = [ ids ];
  if(options === null)
    options = {};

  overpass_requests.push({
    ids: ids,
    options: options,
    priority: 'priority' in options ? options.priority : 0,
    feature_callback: feature_callback,
    final_callback: final_callback
  });

  overpass_requests = weight_sort(overpass_requests, 'priority');

  _overpass_process();
}

function _overpass_process() {
  if(overpass_request_active)
    return;

  if(!overpass_requests.length)
    return;

  overpass_request_active = true;
  var todo = {};
  var effort = 0;
  var query = '';
  for(var j = 0; j < overpass_requests.length; j++) {
    if(overpass_requests[j] === null)
      continue;
    var request = overpass_requests[j];
    var ids = request.ids;
    var all_found_until_now = true;

    for(var i = 0; i < ids.length; i++) {
      if(ids[i] === null)
        continue;
      if(ids[i] in overpass_elements) {
        if(all_found_until_now) {
          async.setImmediate(function(ob, i, callback) {
            callback(null, ob, i);
          }.bind(this, overpass_elements[ids[i]], i, request.feature_callback));
          request.ids[i] = null;
        }
        continue;
      }

      all_found_until_now = false;
      if(ids[i] in todo)
        continue;

      // too much data - delay for next iteration
      if(effort > 256)
        continue;

      todo[ids[i]] = true;
      switch(ids[i].substr(0, 1)) {
        case 'n':
          query += 'node(' + ids[i].substr(1) + ');out body;\n';
          effort += 1;
          break;
        case 'w':
          query += 'way(' + ids[i].substr(1) + ');out body geom;\n';
          effort += 4;
          break;
        case 'r':
          query += 'relation(' + ids[i].substr(1) + ');out body bb;\n';
          effort += 16;
          break;
      }
    }

    if(all_found_until_now) {
      async.setImmediate(function(callback) {
        callback(null);
      }.bind(this, request.final_callback));
      overpass_requests[j] = null;
    }
  }

  var p;
  while((p = overpass_requests.indexOf(null)) != -1)
    overpass_requests.splice(p, 1);

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

/**
 * @param {string} query - Query for requesting objects from Overpass API, e.g. "node[amenity=restaurant]"
 * @param {L.latLngBounds} bounds - A Leaflet Bounds object, e.g. from map.getBounds()
 * @param {object} options
 * @param {number} [options.priority=0] - Priority for loading these objects. The lower the sooner they will be requested.
 * @param {function} feature_callback Will be called for each object in the order of the IDs in parameter 'ids'. Will be passed: 1. err (if an error occured, otherwise null), 2. the object or null.
 * @param {function} final_callback Will be called after the last feature. Will be passed: 1. err (if an error occured, otherwise null).
 */
function overpass_bbox_query(query, bounds, options, feature_callback, final_callback) {
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

	todo.push(id);
      }

      overpass_get(todo, options, feature_callback, final_callback);
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
