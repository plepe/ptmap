OSMRoute.inherits_from(OSMRelation);
function OSMRoute() {
}

OSMRoute.prototype.init = function(data) {
  this.parent("OSMRoute").init.call(this, data);
}

OSMRoute.prototype.title = function() {
  return this.tags.ref + " " + this.tags.to;
}

OSMRoute.prototype.route_parts = function(callback) {
  var result = [];
  var route_index = 0;
  var last_route_part = null;
  var last_dir;
  var node_index = {};
  var route_parts_index = {};

  if(this._route_parts)
    return async.setImmediate(function() {
      callback(null, this._route_parts);
    }.bind(this));

  var way_list = [];
  var way_roles = [];
  for(var i = 0; i < this.data.members.length; i++) {
    var member = this.data.members[i];

    if(member.type != 'way')
      continue;
    if([ '', 'forward', 'backward'].indexOf(member.role) == -1)
      continue;

    way_list.push('w' + member.ref);
    way_roles.push(member.role);
  }

  overpass_get(way_list, {
      call_ordered: true,
      priority: 1
    }, function(way_roles, err, ob, route_index) {
    var dir = null;
    var connected = true;
    var role = way_roles[i];

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

      if([ 'forward', 'backward'].indexOf(role) != -1) {
	dir = role;
      }
      else if(last_route_part) {
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
	  role: role,
	  dir: dir,
	  connected: connected,
	  stops: [],
	  route_index: route_index
	},
      });

      last_route_part = ob;
      last_dir = dir;
  }.bind(this, way_roles),
  function() {
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

  var node_list = [];
  var node_roles = [];
  for(var i = 0; i < this.data.members.length; i++) {
    var member = this.data.members[i];

    if(member.type != 'node')
      continue;
    if(member.role != 'stop')
      continue;

    node_list.push('n' + member.ref);
    node_roles.push(member.role);
  }

  overpass_get(node_list, {
      call_ordered: true,
      priority: 0
    }, function(node_roles, err, ob, route_index) {
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

	// matching point on route must be closer than 100m
	if(matching_distance !== null && matching_distance < 0.1) {
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

	  this.errors.push('Stop ' + ob.id + ' not connected to route way, found nearest location (' + (matching_distance * 1000) + 'm)');
	}
	else {
	  this._stops.push({
	    ob: ob
	  });

	  this.errors.push('Stop ' + ob.id + ' not connected to route way, could not find nearest location (not rendered!)');
	}
      }
  }.bind(this, node_roles),
  function(callback, err) {
    callback(null, route_parts);
  }.bind(this, callback));
}

/**
 *
 * @return [ { member: OSMNode }
 */
OSMRoute.prototype.stops = function(callback) {
  if(this._stops)
    return async.setImmediate(function() {
      callback(null, this._stops);
    }.bind(this));

  this.route_parts(function(err, result) {
    callback(err, this._stops);
  }.bind(this));
}
