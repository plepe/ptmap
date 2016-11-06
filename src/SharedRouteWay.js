var natsort = require('natsort')

var sharedRouteWays = {}

function SharedRouteWay (way) {
  this.way = way
  this.id = way.id
  this.links = []
}

SharedRouteWay.prototype.addLink = function (link) {
  this.links.push(link)
}

SharedRouteWay.prototype.routes = function () {
  var ret = []

  for (var i = 0; i < this.links.length; i++) {
    var link = this.links[i]

    ret.push(link.route)
  }

  return ret
}

SharedRouteWay.prototype.build_label = function() {
  var ret = '';
  var routes = this.routes();
  var ref_both = [];
  var ref_forward = [];
  var ref_backward = [];
  var ref_unknown = [];


  if(!this.links.length)
    return '';

  for(var i = 0; i < this.links.length; i++) {
    var link = this.links[i];
    var route = link.route;
    var ref = null;

    if('ref' in route.object.tags)
      ref = route.object.tags.ref;

    if(ref !== null) {
      if(link.dir == null) {
	if(ref_unknown.indexOf(ref) == -1)
	  ref_unknown.push(ref);
      }
      else if(ref_both.indexOf(ref) != -1) {
	// already seen in both directions -> ignore
      }
      else if(link.dir == 'backward') {
	if(ref_forward.indexOf(ref) != -1) {
	  ref_forward.splice(ref_forward.indexOf(ref), 1);
	  ref_both.push(ref);
	}
	else if(ref_backward.indexOf(ref) == -1) {
	  ref_backward.push(ref);
	}
      }
      else if(link.dir == 'forward') {
	if(ref_backward.indexOf(ref) != -1) {
	  ref_backward.splice(ref_backward.indexOf(ref), 1);
	  ref_both.push(ref);
	}
	else if(ref_forward.indexOf(ref) == -1) {
	  ref_forward.push(ref);
	}
      }
    }
  }

  var sort_param = { insensitive: true };
  ref_both.sort(natsort(sort_param));
  ref_forward.sort(natsort(sort_param));
  ref_backward.sort(natsort(sort_param));
  ref_unknown.sort(natsort(sort_param));

  ret = '   ';
  if(ref_backward.length)
    ret += ' ← ' + ref_backward.join(', ') + '   ';

  if(ref_both.length)
    ret += ref_both.join(', ') + '   ';

  if(ref_forward.length)
    ret += ref_forward.join(', ') + ' → ';

  if(ref_unknown.length)
    ret += ' ?? ' + ref_unknown.join(', ') + ' ?? ';

  return ret + '             ';
}

SharedRouteWay.prototype.update = function () {
}

SharedRouteWay.prototype.show = function (map) {
  var line = []

  for (var k = 0; k < this.way.geometry.length; k++) {
    var g = this.way.geometry[k]
    line.push([ g.lat, g.lon ])
  }

  var route_conf = {
    color: 'black',
    priority: 0
  }

  if (this.feature) {
    this.feature.setLatLngs(line)
  } else {
    this.feature = L.polyline(line, {
      color: route_conf.color,
      opacity: 1
    }).addTo(map)
  }

  this.feature.setText(this.build_label(), {
    repeat: true,
    offset: 12,
    attributes: {
      fill: route_conf.color
    }
  });

  this.shown = true
}

SharedRouteWay.prototype.hide = function (map) {
  if (this.feature) {
    map.removeLayer(this.feature)
    delete this.feature
  }

  this.shown = false
}

// global functions
SharedRouteWay.get = function (way) {
  if (!(way.id in sharedRouteWays)) {
    sharedRouteWays[way.id] = new SharedRouteWay(way)
  }

  return sharedRouteWays[way.id]
}

SharedRouteWay.all = function () {
  return sharedRouteWays
}

module.exports = SharedRouteWay
