var BoundingBox = require('boundingbox')

var stopAreas = []
var stopAreaNames = {}

function StopArea () {
  this.id = stopAreas.length
  stopAreas.push(this)

  this.links = []
  this.bounds = null
}

StopArea.prototype.addStop = function (link) {
  this.links.push(link)

  if (this.bounds) {
    this.bounds.extend(link.node.bounds)
  } else {
    this.bounds = new BoundingBox(link.node.bounds)
  }
}

StopArea.prototype.name = function () {
  if (!this.links.length) {
    return null
  }

  if (!('name' in this.links[0].node.tags)) {
    return 'unknown'
  }

  return this.links[0].node.tags.name
}

StopArea.prototype.routes = function () {
  var ret = []

  for (var i = 0; i < this.links.length; i++) {
    var link = this.links[i]

    ret.push(link.route)
  }

  return ret
}

// global functions
StopArea.add = function (link) {
  var name = null

  if ('name' in link.node.tags) {
    name = link.node.tags.name
  }

  if (name) {
    if (name in stopAreaNames) {
      stopAreaNames[name][0].addStop(link)

      return stopAreaNames[name]
    } else {
      var ob = new StopArea()
      ob.addStop(link)
      stopAreaNames[name] = [ ob ]
    }
  } else {
    var ob = new StopArea()
    ob.addStop(link)

    return ob
  }
}

StopArea.all = function () {
  return stopAreas
}

StopArea.names = function () {
  return stopAreaNames
}

module.exports = StopArea
