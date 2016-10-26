var fs = require('fs')
var conf = JSON.parse(fs.readFileSync('test/conf.json', 'utf8'))

var assert = require('assert')
var async = require('async')
var BoundingBox = require('boundingbox')

var OverpassFrontend = require('overpass-frontend')
GLOBAL.overpassFrontend = new OverpassFrontend(conf.url)

var PTMap = require('../src/PTMap')
var ptmap = new PTMap()

var Route = require('../src/Route')
var SharedRouteWay = require('../src/SharedRouteWay')
var routes = {}

/* global describe it overpassFrontend */

describe('Route', function () {
  it('load object', function (done) {
    overpassFrontend.get(['r1306478', 'r5333483', 'r79466'],
      {
        properties: OverpassFrontend.TAGS | OverpassFrontend.MEMBERS | OverpassFrontend.BBOX
      },
      function (err, result, index) {
        if (err) {
          assert(false, 'There should be no error: ' + err)
        }

        routes[result.id] = new Route(result)
      },
      function (err) {
        done(err)
      }
    )
  })

  it('load way members (small bbox)', function (done) {
    var expectedRouteWays = {
      'r79466': {
        32: {
          dir: 'forward',
          nextConnected: true
        },
        33: {
          dir: 'backward',
          prevConnected: true,
          nextConnected: true
        },
        34: {
          dir: 'backward',
          prevConnected: true
        }
      }
    }

    async.each(routes,
      function (route, callback) {
        route.routeWays(new BoundingBox({
          minlon: 16.336,
          minlat: 48.200,
          maxlon: 16.338,
          maxlat: 48.201
        }),
        function (err, result) {
          if (!(route.id in expectedRouteWays)) {
            return callback(err) // ignore
          }

          for (var i in expectedRouteWays[route.id]) {
            var exp = expectedRouteWays[route.id][i]

            for (var k in exp) {
              assert.deepEqual(exp[k], result[i][k], result[i].wayId + '/' + k + ': Expected: ' + exp[k] + ', Actual: ' + result[i][k])
            }
          }

          callback(err)
        })
      },
      function (err) {
        done(err)
      }
    )
  })

  it('load way members (larger bbox)', function (done) {
    var expectedRouteWays = {
      'r79466': {
        28: {
          dir: 'backward',
          nextConnected: true
        },
        29: {
          dir: 'backward',
          prevConnected: true,
          nextConnected: true
        },
        30: {
          dir: 'backward',
          prevConnected: true,
          nextConnected: true
        },
        31: {
          dir: 'backward',
          prevConnected: true,
          nextConnected: true
        },
        32: {
          dir: 'forward',
          prevConnected: true,
          nextConnected: true
        },
        33: {
          dir: 'backward',
          prevConnected: true,
          nextConnected: true
        },
        34: {
          dir: 'backward',
          prevConnected: true
        }
      }
    }

    async.each(routes,
      function (route, callback) {
        route.routeWays(new BoundingBox({
          minlon: 16.336,
          minlat: 48.195,
          maxlon: 16.342,
          maxlat: 48.202
        }),
        function (err, result) {
          if (!(route.id in expectedRouteWays)) {
            return callback(err) // ignore
          }

          for (var i in expectedRouteWays[route.id]) {
            var exp = expectedRouteWays[route.id][i]

            for (var k in exp) {
              assert.deepEqual(exp[k], result[i][k], result[i].wayId + '/' + k + ': Expected: ' + exp[k] + ', Actual: ' + result[i][k])
            }
          }

          callback(err)
        })
      },
      function (err) {
        done(err)
      }
    )
  })
  it('load way members (remaining)', function (done) {
    var expectedRouteWays = {
      'r79466': {
        28: {
          dir: 'backward',
          nextConnected: true
        },
        29: {
          dir: 'backward',
          prevConnected: true,
          nextConnected: true
        },
        30: {
          dir: 'backward',
          prevConnected: true,
          nextConnected: true
        },
        31: {
          dir: 'backward',
          prevConnected: true,
          nextConnected: true
        },
        32: {
          dir: 'forward',
          prevConnected: true,
          nextConnected: true
        },
        33: {
          dir: 'backward',
          prevConnected: true,
          nextConnected: true
        },
        34: {
          dir: 'backward',
          prevConnected: true
        }
      }
    }

    async.each(routes,
      function (route, callback) {
        route.routeWays(new BoundingBox({
          minlon: 16.336,
          minlat: 48.195,
          maxlon: 16.342,
          maxlat: 48.202
        }),
        function (err, result) {
          if (!(route.id in expectedRouteWays)) {
            return callback(err) // ignore
          }

          for (var i in expectedRouteWays[route.id]) {
            var exp = expectedRouteWays[route.id][i]

            for (var k in exp) {
              assert.deepEqual(exp[k], result[i][k], result[i].wayId + '/' + k + ': Expected: ' + exp[k] + ', Actual: ' + result[i][k])
            }
          }

          callback(err)
        })
      },
      function (err) {
        done(err)
      }
    )
  })
})

describe('SharedRouteWay', function () {
  it('all', function (done) {
    var all = SharedRouteWay.all()

    var l = all['w179646923'].links
    assert.deepEqual(2, l.length, 'w179646923: should have two links')

    done()
  })
})

describe('PTMap', function () {
  it('getRouteById', function (done) {
    var items = ['r1306478', 'r5333483', 'r79466']
    var returned = []

    ptmap.getRouteById(
      items,
      function (err, route) {
        assert.equal(err, null)
        assert.notEqual(items.indexOf(route.id), -1, 'ID should appear in items array')
        assert.equal(returned.indexOf(route.id), -1, 'ID should not have been returned before')
        returned.push(route.id)
      },
      function (err) {
        assert.equal(err, null)
        assert.equal(returned.length, items.length, 'Wrong count of routes returned')
        done()
      }
    )
  })

  it('getRoutes', function (done) {
    var expected = [ 'r1306478', 'r5333483', 'r79466', 'r207109', 'r207110', 'r2446126', 'r5275276' ]
    var returned = []
    var bbox = {
      'minlat': 48.190,
      'minlon': 16.330,
      'maxlat': 48.205,
      'maxlon': 16.350
    }

    ptmap.getRoutes(
      {
        bbox: bbox
      },
      function (err, route) {
        assert.equal(err, null)
        assert.notEqual(expected.indexOf(route.id), -1, 'Route ' + route.id + ' not expected')
        assert.equal(returned.indexOf(route.id), -1, 'ID should not have been returned before')
        returned.push(route.id)
      },
      function (err) {
        assert.equal(err, null)
        assert.equal(returned.length, expected.length, 'Wrong count of routes returned')
        done()
      }
    )
  })

  it('getSharedRouteWays', function (done) {
    var expected = [ 'w179646923', 'w42799329', 'w147402943', 'w28318684', 'w37540941', 'w147402933', 'w356347989', 'w31275231', 'w272672835', 'w272672836', 'w26738909', 'w183723744', 'w272672834', 'w26738933', 'w31275228', 'w239911077', 'w26738920', 'w162373026', 'w26738389', 'w31275229', 'w4583442', 'w26739449', 'w27950566', 'w27950571', 'w31275230' ]
    var returned = []
    var returnedIds = []
    var bbox = {
      'minlat': 48.190,
      'minlon': 16.330,
      'maxlat': 48.205,
      'maxlon': 16.350
    }

    ptmap.getSharedRouteWays(
      {
        bbox: bbox
      },
      function (err, sharedRouteWay) {
        assert.equal(err, null)
        returned.push(sharedRouteWay)
        returnedIds.push(sharedRouteWay.id)
      },
      function (err) {
        assert.equal(err, null)

        // process list in the end, because the sharedRouteWays may have been
        // modified (more routes added)
        var ids = []
        for (var i = 0; i < returned.length; i++) {
          ids.push(returned[i].id)
          var sharedRouteWay = returned[i]
          var info = []

          var routes = sharedRouteWay.routes()
          for (var j = 0; j < routes.length; j++)
            info.push(routes[j].id + ' ' + routes[j].object.tags.ref)

          console.log(sharedRouteWay.id, info)
        }
        console.log(JSON.stringify(ids))

        assert.equal(returned.length, expected.length, 'Wrong count of routes returned')
        done()
      }
    )
  })

  it('getSharedRouteWays (2nd try)', function (done) {
    var expected = [ 'r1306478', 'r5333483', 'r79466', 'r207109', 'r207110', 'r2446126', 'r5275276' ]
    var returned = []
    var bbox = {
      'minlat': 48.190,
      'minlon': 16.330,
      'maxlat': 48.205,
      'maxlon': 16.350
    }

    ptmap.getSharedRouteWays(
      {
        bbox: bbox
      },
      function (err, sharedRouteWay) {
        assert.equal(err, null)
        returned.push(sharedRouteWay)
        // console.log('  ', sharedRouteWay.id)
      },
      function (err) {
        assert.equal(err, null)

        // process list in the end, because the sharedRouteWays may have been
        // modified (more routes added)
        for (var i = 0; i < returned.length; i++) {
          var sharedRouteWay = returned[i]
          var info = []

          var routes = sharedRouteWay.routes()
          for (var j = 0; j < routes.length; j++)
            info.push(routes[j].id + ' ' + routes[j].object.tags.ref)

          console.log(sharedRouteWay.id, info)
        }

        assert.equal(returned.length, expected.length, 'Wrong count of routes returned')
        done()
      }
    )
  })
})
