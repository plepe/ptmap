var overpass_elements = {};
var overpass_elements_member_of = {};
var overpass_tiles = {};
var overpass_requests = [];
var overpass_request_active = false;
var overpass_elements_bounds = {};

/**
 * @param {(string|string[])} ids - One or more IDs, e.g. [ 'n123', 'w2345', 'n123' ]
 * @param {object} options
 * @param {number} [options.priority=0] - Priority for loading these objects. The lower the sooner they will be requested.
 * @param {boolean} [options.call_ordered=false] - When set to true, the function feature_callback will be called in the order of the array ids.
 * @param {L.latLngBounds} options.bbox - Only include objects which intersect the given bbox. The feature_callback will be called anyway, but boolean false will be passed.
 * @param {function} feature_callback - Will be called for each object in the order of the IDs in parameter 'ids'. Will be passed: 1. err (if an error occured, otherwise null), 2. the object or null, 3. the index in the array ids.
 * @param {function} final_callback - Will be called after the last feature. Will be passed: 1. err (if an error occured, otherwise null).
 */
function overpass_get(ids, options, feature_callback, final_callback) {
  if(typeof ids == 'string')
    ids = [ ids ];
  if(options === null)
    options = {};

  for(var i = 0; i < ids.length; i++)
    if(ids[i] in overpass_elements && overpass_elements[ids[i]] === false)
      delete(overpass_elements[ids[i]]);

  if(options.bbox) {
    var bbox = convert_to_turf(options.bbox);
  }

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
  var bbox_todo = {};
  var todo_callbacks = [];
  var query = '';

  for(var j = 0; j < overpass_requests.length; j++) {
    if(overpass_requests[j] === null)
      continue;
    var request = overpass_requests[j];
    var ids = request.ids;
    var all_found_until_now = true;
    var node_query = '';
    var way_query = '';
    var rel_query = '';
    var bbox_query = '';

    if(request.options.bbox) {
      bbox_query = request.options.bbox.toBBoxString();
      bbox_query = bbox_query.split(/,/);
      bbox_query = '(' + bbox_query[1] + ',' + bbox_query[0] + ',' +
                    bbox_query[3] + ',' + bbox_query[2] + ')';
    }

    for(var i = 0; i < ids.length; i++) {
      if(ids[i] === null)
        continue;
      if(ids[i] in overpass_elements) {
        if(!('call_ordered' in request.options) ||
           (request.options.call_ordered && all_found_until_now)) {
          todo_callbacks.push([ request.feature_callback, overpass_elements[ids[i]], i ]);
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

      if(request.options.bbox) {
        // check if we already know the bbox of the element; if yes, don't try
        // to load object if it does not intersect bounds
        if(ids[i] in overpass_elements_bounds)
          if(!request.options.bbox.intersects(overpass_elements_bounds[ids[i]]))
            continue;

        todo[ids[i]] = true;
        bbox_todo[ids[i]] = true;
      }
      else
        todo[ids[i]] = true;

      switch(ids[i].substr(0, 1)) {
        case 'n':
          node_query += 'node(' + ids[i].substr(1) + ');\n';
          effort += 1;
          break;
        case 'w':
          way_query += 'way(' + ids[i].substr(1) + ');\n';
          effort += 4;
          break;
        case 'r':
          rel_query += 'relation(' + ids[i].substr(1) + ');\n';
          effort += 16;
          break;
      }
    }

    if(all_found_until_now) {
      todo_callbacks.push([ request.final_callback, null, null ]);
      overpass_requests[j] = null;
    }

    if(node_query != '') {
      query += '((' + node_query + ');)->.n;\n';
      if(bbox_query)
        query += 'node.n' + bbox_query + ';\n';
      query += 'out body qt;\n';
    }

    if(way_query != '') {
      query += '((' + way_query + ');)->.w;\n';
      if(bbox_query)
        query += '(way.w; - way.w' + bbox_query + '->.w);\nout ids bb qt;\n';
      query += '.w out body geom qt;\n';
    }

    if(rel_query != '') {
      query += '((' + rel_query + ');)->.r;\n';
      if(bbox_query)
        query += '(relation.r; - relation.r' + bbox_query + '->.r);\nout ids bb qt;\n';
      query += '.r out body bb qt;\n';
    }
  }

  async.setImmediate(function() {
    for(var i = 0; i < todo_callbacks.length; i++) {
      var c = todo_callbacks[i];

      c[0](null, c[1], c[2]);
    }
  });

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
    "[out:json];\n" + query,
    function(err, results) {
      for(var i = 0; i < results.elements.length; i++) {
        var el = results.elements[i];
        var id = el.type.substr(0, 1) + el.id;

        // bounding box only result -> save to overpass_elements_bounds
        if((el.type == 'relation' && !('members' in el)) ||
           (el.type == 'way' && !('geometry' in el))) {
          overpass_elements_bounds[id] = L.latLngBounds(
            L.latLng(el.bounds.minlat, el.bounds.minlon),
            L.latLng(el.bounds.maxlat, el.bounds.maxlon)
          );

          continue;
        }

        overpass_elements[id] = create_osm_object(el);

        // if element is loaded, when can remove from overpass_elements_bounds
        if(id in overpass_elements_bounds)
          delete(overpass_elements_bounds[id]);

        var members = overpass_elements[id].member_ids();
        for(var j = 0; j < members.length; j++) {
          if(!(members[j] in overpass_elements_member_of))
            overpass_elements_member_of[members[j]] = [ overpass_elements[id] ];
          else
            overpass_elements_member_of[members[j]].push(overpass_elements[id]);
        }
      }

      for(var id in todo) {
        if(!(id in overpass_elements)) {
          if(id in bbox_todo)
            overpass_elements[id] = false;
          else
            overpass_elements[id] = null;
        }
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
 * @param {boolean} [options.order_approx_route_length=false] - Order objects by approximate route length (calculated from the bbox diagonal)
 * @param {boolean} [options.call_ordered=false] - When set to true, the function feature_callback will be called in some particular order (e.g. from order_approx_route_length).
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
    "[out:json][bbox:" + bbox_string + "];" + query + "out ids bb qt;",
    function(err, results) {
      var todo = [];
      var todo_ids = {};

      for(var i = 0; i < results.elements.length; i++) {
	var el = results.elements[i];
	var id = el.type.substr(0, 1) + el.id;

        if(options.order_approx_route_length) {
          var ob_bbox = L.latLngBounds(
            L.latLng(el.bounds.minlat, el.bounds.minlon),
            L.latLng(el.bounds.maxlat, el.bounds.maxlon)
          );
          var approx_route_length = bounds_diagonal_px_length(ob_bbox);

          todo.push([ bounds_diagonal_px_length(ob_bbox), id ]);
        }
        else
          todo.push(id);
      }

      if(options.order_approx_route_length)
        todo = weight_sort(todo);

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
