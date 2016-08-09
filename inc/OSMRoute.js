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

  async.eachSeries(this.data.members, function(member, callback) {
    var dir = null;

    if(member.type != 'way')
      return callback();
    if(member.role != '')
      return callback();

    if(last_route_part) {
      if(cmp(last_route_part.geometry[0], member.geometry[0]) ||
         cmp(last_route_part.geometry[last_route_part.geometry.length - 1], member.geometry[0]))
        dir = 'forward';

      else if(cmp(last_route_part.geometry[0], member.geometry[member.geometry.length - 1]) ||
         cmp(last_route_part.geometry[last_route_part.geometry.length - 1], member.geometry[member.geometry.length - 1]))
        dir = 'backward';

      else
        dir = 'unknown';
    }

    if(last_dir === null) {
      if(cmp(last_route_part.geometry[0], member.geometry[0]) ||
         cmp(last_route_part.geometry[0], member.geometry[member.geometry.length - 1]))
        result[result.length - 1].dir = 'backward';

      else if(cmp(last_route_part.geometry[last_route_part.geometry.length - 1], member.geometry[0]) ||
         cmp(last_route_part.geometry[last_route_part.geometry.length - 1], member.geometry[member.geometry.length - 1]))
        result[result.length - 1].dir = 'forward';

      else
        result[result.length - 1].dir = 'unknown';
    }

    result.push({
      member: member,
      link: {
        route: this,
        member_id: member.ref,
        role: member.role,
        dir: dir,
        route_index: route_index++
      }
    });

    last_route_part = member;
    last_dir = dir;

    callback();
  }.bind(this), function() {
    if(last_dir === null)
      result[result.length - 1].dir = 'unknown';

    callback(null, result);
  }.bind(this));
}
