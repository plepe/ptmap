OSMRoute.inherits_from(OSMRelation);
function OSMRoute() {
}

OSMRoute.prototype.init = function(data) {
  this.parent("OSMRoute").init.call(this, data);
}

OSMRoute.prototype.route_parts = function(callback) {
  var result = [];
  var route_index = 0;
  var last_route_part = null;
  var last_dir;
  var node_index = {};
  var route_parts_index = {};

  if(this._route_parts)
    return callback(null, this._route_parts);

  async.eachSeries(this.data.members, function(member, callback) {
    var dir = null;
    var connected = true;

    if(member.type != 'way')
      return callback();
    if(member.role != '')
      return callback();

    get_osm_object('w' + member.ref, function(callback, err, ob) {
      for(var i = 0; i < ob.nodes.length; i++) {
	var node = ob.nodes[i];

	// only for the first matching way
	if(!(node.id in node_index)) {
	  node_index[node] = {
	    way: ob,
	    index: i
	  };
	}
      }

      if(last_route_part) {
	if(last_route_part.nodes[0] == ob.nodes[0] ||
	   last_route_part.nodes[last_route_part.nodes.length - 1] == ob.nodes[0])
	  dir = 'forward';

	else if(last_route_part.nodes[0] == ob.nodes[ob.nodes.length - 1] ||
	   last_route_part.nodes[last_route_part.nodes.length - 1] == ob.nodes[ob.nodes.length - 1])
	  dir = 'backward';

	else if(route_parts_index != 0) {
	  this.errors.push('Way ' + ob.id + ' not connected to previous way');
	  connected = false;
	}
      }

      if(last_dir === null) {
	if(last_route_part.nodes[0] == ob.nodes[0] ||
	   last_route_part.nodes[0] == ob.nodes[ob.nodes.length - 1])
	  result[result.length - 1].link.dir = 'backward';

	else if(last_route_part.nodes[last_route_part.nodes.length - 1] == ob.nodes[0] ||
	   last_route_part.nodes[last_route_part.nodes.length - 1] == ob.nodes[ob.nodes.length - 1])
	  result[result.length - 1].link.dir = 'forward';
	else {
	  this.errors.push('Way ' + last_route_part.id + ' not connected to next way');
	  connected = false;
	}
      }

      if(!(ob.id in route_parts_index))
	route_parts_index[ob.id] = [];
      route_parts_index[ob.id].push(route_index);

      result.push({
	member: ob,
	link: {
	  route: this,
	  member_id: ob.id,
	  role: member.role,
	  dir: dir,
	  connected: connected,
	  stops: [],
	  route_index: route_index++
	},
      });

      last_route_part = ob;
      last_dir = dir;

      callback();
    }.bind(this, callback));
  }.bind(this), function() {
    if(last_dir === null)
      result[result.length - 1].dir = 'unknown';

    this._route_parts_stops(result, route_parts_index, node_index, function(err, result) {
      this._route_parts = result;

      callback(null, result);
    }.bind(this));
  }.bind(this));
}

OSMRoute.prototype._route_parts_stops = function(route_parts, route_parts_index, node_index, callback) {
  var last_route_part_index = 0;
  this._stops = [];

  async.eachSeries(this.data.members, function(member, callback) {
    if(member.type != 'node')
      return async.setImmediate(function() { callback() });
    if(member.role != 'stop')
      return async.setImmediate(function() { callback() });

    get_osm_object('n' + member.ref, function(callback, err, ob) {
      var node_ref;

      if(node_ref = node_index[ob.id.substr(1)]) {
	var matching_route_parts_index = null;
	var matching_route_parts_indexes = route_parts_index[node_ref.way.id];
	for(var i = 0; i < matching_route_parts_indexes.length; i++) {
	  if(matching_route_parts_indexes[i] >= last_route_part_index) {
	    matching_route_parts_index = matching_route_parts_indexes[i];
	  }
	}

	route_parts[matching_route_parts_index].link.stops.push({
	  ob: ob,
	  node_index: node_ref.index
	});

	this._stops.push({
	  ob: ob,
	  route_parts_index: matching_route_parts_index,
	  node_index: node_ref.index
	});
      }
      else {
	// TODO: find nearest position on route part; for now, ignore other stops
	this.errors.push('Stop ' + ob.id + ' not connected to route way, finding nearest location');
	var node_geo = ob.GeoJSON();
	var matching_point = null;
	var matching_distance = null;
	var matching_route_parts_index = null;

	for(var i = 0; i < route_parts.length; i++) {
	  var point = turf.pointOnLine(route_parts[i].member.GeoJSON(), node_geo);
	  var distance = turf.distance(node_geo, point);

	  if(matching_distance === null || distance < matching_distance) {
	    matching_distance = distance;
	    matching_point = point;
	    matching_route_parts_index = i;
	  }
	}

	this._stops.push({
	  ob: ob,
	  route_parts_index: matching_route_parts_index,
	  geometry: {
	    lon: matching_point.geometry.coordinates[0],
	    lat: matching_point.geometry.coordinates[1]
	  }
	});

	route_parts[matching_route_parts_index].link.stops.push({
	  ob: ob
	});
      }

      callback();
    }.bind(this, callback));
  }.bind(this),
  function(callback, err, result) {
    callback(null, route_parts);
  }.bind(this, callback));
}

/**
 *
 * @return [ { member: OSMNode }
 */
OSMRoute.prototype.stops = function(callback) {
  if(this._stops)
    callback(null, this._stops);

  this.route_parts(function(err, result) {
    callback(err, this._stops);
  });
}
