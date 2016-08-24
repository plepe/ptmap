OSMRoute.inherits_from(OSMRelation);
function OSMRoute() {
}

OSMRoute.prototype.init = function(data) {
  this.parent("OSMRoute").init.call(this, data);
  this.possible_bounds = new PossibleBounds();
  this.possible_bounds.add_outer_bounds(this.bounds);

  this.approx_route_length = bounds_diagonal_px_length(this.bounds) || 1.0;
  this.priority = Math.log(this.approx_route_length) / 100.0;
}

OSMRoute.prototype.title = function() {
  return this.tags.ref + " " + this.tags.to;
}

OSMRoute.prototype.route_parts = function(bounds, callback) {
  var result = [];
  var route_index = 0;
  var last_route_part = null;
  var last_dir;

  var way_list = [];
  var way_index_list = [];
  var way_index = 0;

  var node_index_list = [];
  var node_list = [];
  var node_index = 0;
  var init = false;
  if(!this._route_parts) {
    this.node_index = {};
    this.route_parts_index = {};
    this.route_parts_roles = [];
    this.route_parts_way = [];
    this._route_parts = [];
    this._stops = [];
    this._route_stops_ob = [];
    this._route_stops_ids = [];
    this._route_stops_roles = [];
    init = true;
  }

  for(var i = 0; i < this.data.members.length; i++) {
    var member = this.data.members[i];

    if(member.type == 'way' && [ '', 'forward', 'backward'].indexOf(member.role) != -1) {
      if(init) {
	this.route_parts_roles.push(member.role);
	this.route_parts_way.push(undefined);
	this._route_parts.push(false);
      }

      if(!this._route_parts[way_index]) {
	way_list.push('w' + member.ref);
	way_index_list.push(way_index);
      }

      way_index++;
    }

    if(member.type == 'node' && member.role == 'stop') {
      if(init) {
        this._route_stops_roles.push(member.role);
        this._route_stops_ob.push(undefined);
        this._route_stops_ids.push('n' + member.ref);
        this._stops.push(false);
      }

      if(!this._stops[node_index]) {
        node_list.push('n' + member.ref);
        node_index_list.push(node_index);
      }

      node_index++;
    }
  }

  if(!way_list.length && !node_list.length) {
    async.setImmediate(function() {
      callback(null, this._route_parts);
    }.bind(this));
  }

  if(!this.possible_bounds.is_possible(bounds))
    return async.setImmediate(function() {
      callback(null, this._route_parts);
    }.bind(this));

  this.possible_bounds.add_inner_bounds(bounds);

  if(node_list.length)
  overpass_get(node_list, {
      call_ordered: true,
      priority: 0 + this.priority
    }, function(node_index_list, err, ob, i) {
      var route_index = node_index_list[i];
      this._route_stops_ob[route_index] = ob;

      this.route_part_check_stop(route_index);
    }.bind(this, node_index_list),
    function() {
      // TODO: make sure that both final_callbacks (way && node) are called.
    }.bind(this)
  );

  if(way_list.length)
  overpass_get(way_list, {
      bbox: bounds,
      priority: 1 + this.priority
    },
    function(index_list, err, ob, i) {
      var route_index = way_index_list[i];
      this.route_parts_way[route_index] = ob;

      if(ob === false)
        return;

      this.route_part_check_way(route_index);
    }.bind(this, way_index_list),
  function() {
    callback(null, this._route_parts);
  }.bind(this));
}

OSMRoute.prototype.route_part_check_way = function(route_index) {
  var role = this.route_parts_roles[route_index];
  var ob = this.route_parts_way[route_index];

  for(var i = 0; i < ob.nodes.length; i++) {
    var node = ob.nodes[i];

    // only for the first matching way
    if(!(node.id in this.node_index)) {
      this.node_index[node] = {
	way: ob,
	index: i
      };
    }
  }

  var shared_route_way = ob.id in shared_route_ways ? shared_route_ways[ob.id] : new SharedRouteWay(ob);

  var result;
  if(this._route_parts[route_index]) {
    // eh schon da? sollen wir noch was ueberpruefen?
    result = this._route_parts[route_index];
  }
  else {
    result = {
      way: ob,
      shared_route_way: shared_route_way,
      route: this,
      route_index: route_index,
      prev_part: null,
      next_part: null,
      member_id: ob.id,
      role: role,
      dir: null,
      prev_connected: null,
      next_connected: null,
      stops: []
    };

    if(!(ob.id in this.route_parts_index))
      this.route_parts_index[ob.id] = [];
    this.route_parts_index[ob.id].push(route_index);

    this._route_parts[route_index] = result;

    result.shared_route_way.add_route_link(result);
  }

  var check_prev_part = false;
  if(!result.prev_part && route_index > 0) {
    result.prev_part = this._route_parts[route_index - 1];
    if(result.prev_part)
      check_prev_part = true;
  }

  var check_next_part = false;
  if(!result.next_part && route_index < this._route_parts.length - 1) {
    result.next_part = this._route_parts[route_index + 1];
    if(result.next_part)
      check_next_part = true;
  }

  dir = 'forward';
  connected = true;
  if([ 'forward', 'backward'].indexOf(role) != -1) {
    result.dir = role;
  }

  if(check_prev_part) {
    result.prev_connected = true;

    if(result.prev_part.way.nodes[0] == ob.nodes[0] ||
       result.prev_part.way.nodes[result.prev_part.way.nodes.length - 1] == ob.nodes[0])
      result.dir = 'forward';

    else if(result.prev_part.way.nodes[0] == ob.nodes[ob.nodes.length - 1] ||
       result.prev_part.way.nodes[result.prev_part.way.nodes.length - 1] == ob.nodes[ob.nodes.length - 1])
      result.dir = 'backward';

    else if(route_index != 0) {
      this.errors.push('Way ' + ob.id + ' not connected to previous way');
      result.prev_connected = false;
    }

    // recurse!
    this.route_part_check_way(route_index - 1);
  }

  if(check_next_part) {
    result.next_connected = true;

    if(result.next_part.way.nodes[0] == ob.nodes[0] ||
       result.next_part.way.nodes[result.next_part.way.nodes.length - 1] == ob.nodes[0])
      result.dir = 'backward';

    else if(result.next_part.way.nodes[0] == ob.nodes[ob.nodes.length - 1] ||
       result.next_part.way.nodes[result.next_part.way.nodes.length - 1] == ob.nodes[ob.nodes.length - 1])
      result.dir = 'forward';

    else if(route_index != this._route_parts.length - 1) {
      this.errors.push('Way ' + ob.id + ' not connected to next way');
      result.next_connected = false;
    }

    // recurse!
    this.route_part_check_way(route_index + 1);
  }

  for(var i = 0; i < ob.nodes.length; i++) {
    var node = ob.nodes[i];
    var node_index = null;

    if((node_index = this._route_stops_ids.indexOf('n' + node)) != -1)
      this.route_part_check_stop(node_index);
  }

  result.shared_route_way.update();
}

OSMRoute.prototype.route_part_check_stop = function(route_index) {
  var ob = this._route_stops_ob[route_index];
  var role = this._route_stops_roles[route_index];
  var last_route_part_index = 0; // TODO: read from prev. stop

  if(!ob) {
    console.log('ob not loaded yet');
    return;
  }

  var node_ref;

  if(node_ref = this.node_index[ob.id.substr(1)]) {
    var matching_route_parts_index = null;
    var matching_route_parts_indexes = this.route_parts_index[node_ref.way.id];
    for(var i = 0; i < matching_route_parts_indexes.length; i++) {
      if(matching_route_parts_indexes[i] >= last_route_part_index) {
	matching_route_parts_index = matching_route_parts_indexes[i];
      }
    }

    this._route_parts[matching_route_parts_index].stops.push({
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

    for(var i = 0; i < this._route_parts.length; i++) {
      if(!this._route_parts[i])
        continue;

      var point = turf.pointOnLine(this._route_parts[i].way.GeoJSON(), node_geo);
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

      this._route_parts[matching_route_parts_index].stops.push({
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
