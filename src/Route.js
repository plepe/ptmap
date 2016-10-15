/* global overpassFrontend:false */
var OverpassFrontend = require('overpass-frontend')

function Route (object) {
  this.object = object

  this.id = this.object.id
}

Route.prototype.routeWays = function (bbox, callback) {
  var wayIds = []
  var wayIndexList = []
  var wayIndex = 0
  var init = false

  if (typeof this._routeWays === 'undefined') {
    this._routeWays = []
    init = true
  }

  for (var i = 0; i < this.object.members.length; i++) {
    var member = this.object.members[i]

    if (member.type === 'way' && ['', 'forward', 'backward'].indexOf(member.role) !== -1) {
      if (init) {
        this._routeWays.push({
          role: member.role,
          way: false,
          link: false
        })
      }

      if (!this._routeWays[wayIndex].way) {
        wayIds.push(member.id)
        wayIndexList.push(wayIndex)
      }

      wayIndex++
    }
  }

  overpassFrontend.get(wayIds,
    {
      bbox: bbox,
      properties: OverpassFrontend.GEOM
    },
    function (wayIndexList, err, result, index) {
      wayIndex = wayIndexList[index]

      this._routeWays[wayIndex].way = result
    }.bind(this, wayIndexList),
    function (err) {
      callback(err, this._routeWays)
    }.bind(this)
  )
}

module.exports = Route
