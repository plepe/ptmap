var fs = require('fs')
global.config = JSON.parse(fs.readFileSync('test/conf.json', 'utf8'))

var assert = require('assert')
var async = require('async')
var BoundingBox = require('boundingbox')

var OverpassFrontend = require('overpass-frontend')
GLOBAL.overpassFrontend = new OverpassFrontend(config.overpass.url, config.overpass)

var PTMap = require('../src/PTMap')
var ptmap = new PTMap()

var Route = require('../src/Route')
var SharedRouteWay = require('../src/SharedRouteWay')
var StopArea = require('../src/StopArea')
var Stop = require('../src/Stop')
var routes = {}

/* global describe it overpassFrontend */

var fakePTMap = {}
fakePTMap.routes = Route.factory(fakePTMap)
fakePTMap.sharedRouteWays = SharedRouteWay.factory(fakePTMap)
fakePTMap.stopAreas = StopArea.factory(fakePTMap)
fakePTMap.stops = Stop.factory(fakePTMap)

describe('Route', function () {
  it('load object', function (done) {
    var titles = {
      'r1306478': 'Nachtbus N49: Hütteldorf => Oper (werktags)',
      'r5333483': 'Nachtbus N64: Handelskai => Alterlaa',
      'r79466': 'Nachtbus N49: Oper => Hütteldorf (werktags)'
    }
    var refs = {
      'r1306478': 'N49',
      'r5333483': 'N64',
      'r79466': 'N49'
    }

    overpassFrontend.get(['r1306478', 'r5333483', 'r79466'],
      {
        properties: OverpassFrontend.TAGS | OverpassFrontend.MEMBERS | OverpassFrontend.BBOX
      },
      function (err, result, index) {
        if (err) {
          assert(false, 'There should be no error: ' + err)
        }

        var route = fakePTMap.routes.add(result)
        routes[result.id] = route

        assert.equal(route.title(), titles[result.id], result.id + ': Wrong route title')
        assert.equal(route.ref(), refs[result.id], result.id + ': Wrong route ref')
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
        route.routeWays({
          bbox: new BoundingBox({
            minlon: 16.336,
            minlat: 48.200,
            maxlon: 16.338,
            maxlat: 48.201
          })
        },
        function (err, routeWay) {
        },
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
        route.routeWays({
          bbox: new BoundingBox({
            minlon: 16.336,
            minlat: 48.195,
            maxlon: 16.342,
            maxlat: 48.202
          })
        },
        function (err, routeWay) {
        },
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
        route.routeWays({
          bbox: new BoundingBox({
            minlon: 16.336,
            minlat: 48.195,
            maxlon: 16.342,
            maxlat: 48.202
          })
        },
        function (err, routeWay) {
        },
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

  it('load stops (small bbox)', function (done) {
    var expected = {
      'r79466': {
        7: {
          role: 'stop',
          stopId: 'n3622336675'
        },
      }
    }

    async.each(routes,
      function (route, callback) {
        route.stops({
          bbox: new BoundingBox({
            minlon: 16.336,
            minlat: 48.200,
            maxlon: 16.338,
            maxlat: 48.201
          })
        },
        function (err, stop) {
        },
        function (err, result) {
          if (!(route.id in expected)) {
            return callback(err) // ignore
          }

          for (var i in expected[route.id]) {
            var exp = expected[route.id][i]

            assert.ok(result[i].stop, route.id + ':' + result[i].stopId + '(' + i + '): Stop should be loaded')

            for (var k in exp) {
              assert.deepEqual(result[i][k], exp[k], result[i].stopId + '/' + k + ': Expected: ' + exp[k] + ', Actual: ' + result[i][k])
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

  it('load stops (rest)', function (done) {
    var expected = {
      'r79466': {
        7: {
          role: 'stop',
          stopId: 'n3622336675'
        },
      }
    }

    async.each(routes,
      function (route, callback) {
        route.stops({},
        function (err, stop) {
        },
        function (err, result) {
          if (!(route.id in expected)) {
            return callback(err) // ignore
          }

          for (var i in expected[route.id]) {
            var exp = expected[route.id][i]

            assert.ok(result[i].stop, route.id + ':' + result[i].stopId + '(' + i + '): Stop should be loaded')

            for (var k in exp) {
              assert.deepEqual(result[i][k], exp[k], result[i].stopId + '/' + k + ': Expected: ' + exp[k] + ', Actual: ' + result[i][k])
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
    var all = fakePTMap.sharedRouteWays.all()

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
    var expected = [ 'r910885', 'r910886', 'r1800603', 'r1306732', 'r1306733', 'r1809913', 'r1990861', 'r1306966', 'r1306967', 'r1800604', 'r1809912', 'r1990860', 'r2005432', 'r2005433', 'r2446126', 'r20309', 'r2853012', 'r2928575', 'r5954449' ]
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
        returned.sort()
        expected.sort()
        assert.deepEqual(returned, expected, 'Wrong count of routes returned')
        done()
      }
    )
  })

  it('getRoutes, onlyActive=false', function (done) {
    var expected = [ 'r79466', 'r910885', 'r910886', 'r1306478', 'r1800603', 'r1306732', 'r1306733', 'r1809913', 'r1990861', 'r207109', 'r207110', 'r1306966', 'r1306967', 'r1800604', 'r1809912', 'r1990860', 'r2005432', 'r2005433', 'r2446126', 'r5275276', 'r5333483', 'r20309', 'r2853012', 'r2928575', 'r5954449' ]
    var returned = []
    var bbox = {
      'minlat': 48.190,
      'minlon': 16.330,
      'maxlat': 48.205,
      'maxlon': 16.350
    }

    ptmap.getRoutes(
      {
        bbox: bbox,
        onlyActive: false
      },
      function (err, route) {
        assert.equal(err, null)
        assert.notEqual(expected.indexOf(route.id), -1, 'Route ' + route.id + ' not expected')
        assert.equal(returned.indexOf(route.id), -1, 'ID should not have been returned before')
        returned.push(route.id)
      },
      function (err) {
        assert.equal(err, null)
        returned.sort()
        expected.sort()
        assert.deepEqual(returned, expected, 'Wrong count of routes returned')
        done()
      }
    )
  })

  it('getSharedRouteWays', function (done) {
    var expected = {
      'w356347989': [ 'r79466', 'r1306478' ],
      'w220270696': [ 'r910885', 'r1306733' ],
      'w220270713': [ 'r910886', 'r1306732' ],
      'w31275231': [ 'r1306478', 'r5333483' ],
      'w272672835': [ 'r1306478', 'r5333483' ],
      'w272672836': [ 'r1306478', 'r5333483' ],
      'w26738909': [ 'r1306478', 'r207109', 'r5333483' ],
      'w183723744': [ 'r1306478', 'r207109', 'r2446126', 'r5333483' ],
      'w272672834': [ 'r1306478', 'r207109', 'r2446126', 'r5333483' ],
      'w26738933': [ 'r1306478', 'r207109', 'r2446126', 'r5333483' ],
      'w31275228': [ 'r1306478' ],
      'w239911077': [ 'r1306478', 'r207110', 'r5275276' ],
      'w26738920': [ 'r1306478', 'r207109', 'r207110', 'r5275276' ],
      'w162373026': [ 'r1306478', 'r207110' ],
      'w380110863': [ 'r1800603', 'r1306966' ],
      'w380110865': [ 'r1800603', 'r1306966' ],
      'w380110867': [ 'r1800603', 'r1306966' ],
      'w42799339': [ 'r1800603', 'r1306966' ],
      'w31107436': [ 'r1800603' ],
      'w24877453': [ 'r1306732', 'r1809912', 'r1990860' ],
      'w141233631': [ 'r1306732', 'r1809912', 'r1990860' ],
      'w146678770': [ 'r1306732', 'r1809912', 'r1990860' ],
      'w26231341': [ 'r1306732' ],
      'w88093287': [ 'r1306733' ],
      'w210848994': [ 'r1306733', 'r1809913', 'r1990861' ],
      'w125586439': [ 'r1306733' ],
      'w210599976': [ 'r1809913', 'r1990861' ],
      'w26231338': [ 'r1809913', 'r1990861' ],
      'w4583442': [ 'r207109' ],
      'w31275229': [ 'r207109', 'r2446126', 'r5333483' ],
      'w27950571': [ 'r207110', 'r5275276' ],
      'w87934166': [ 'r1306966' ],
      'w88117773': [ 'r1306967' ],
      'w88117770': [ 'r1306967' ],
      'w88117767': [ 'r1306967', 'r1800604' ],
      'w380110866': [ 'r1306967', 'r1800604' ],
      'w380110864': [ 'r1306967', 'r1800604' ],
      'w146678768': [ 'r1800604' ],
      'w26231340': [ 'r1809912', 'r1990860' ],
      'w42799333': [ 'r1809912', 'r1990860' ],
      'w42799336': [ 'r1809912', 'r1990860' ],
      'w125586446': [ 'r2005432' ],
      'w146678761': [ 'r2005432' ],
      'w148731068': [ 'r2005433' ],
      'w370033150': [ 'r20309' ],
      'w370577160': [ 'r2853012' ],
      'w118102651': [ 'r2853012' ],
      'w9269047': [ 'r2928575' ],
      'w211153301': [ 'r5954449' ],
      'w370577159': [ 'r5954449' ],
    }

    var returned = []
    var returnedIds = []
    var bbox = {
      'minlat': 48.195,
      'minlon': 16.330,
      'maxlat': 48.200,
      'maxlon': 16.340
    }

    ptmap.getSharedRouteWays(
      {
        bbox: bbox,
        onlyActive: false
      },
      function (err, result) {
        assert.equal(err, null)
        returned.push(result)
        returnedIds.push(result.id)

        assert.equal(result.id in expected, true, 'Route ' + result.id + ' should be in list of expected routes')
      },
      function (err) {
        assert.equal(err, null)
        assert.deepEqual(returnedIds.concat().sort(), Object.keys(expected).sort(), 'List of returned ways does not match')

        // process list in the end, because the sharedRouteWays may have been
        // modified (more routes added)
        for (var i = 0; i < returned.length; i++) {
          var routeIds = returned[i].routes({ onlyActive: false }).map(function (r) { return r.id })
          assert.deepEqual(routeIds, expected[returnedIds[i]], 'Way ' + returnedIds[i] + ' has wrong routes')
        }

        done()
      }
    )
  })

  it('getSharedRouteWays (2nd try)', function (done) {
    var expected = {
      'w356347989': [ 'r79466', 'r1306478' ],
      'w220270696': [ 'r910885', 'r1306733' ],
      'w220270713': [ 'r910886', 'r1306732' ],
      'w31275231': [ 'r1306478', 'r5333483' ],
      'w272672835': [ 'r1306478', 'r5333483' ],
      'w272672836': [ 'r1306478', 'r5333483' ],
      'w26738909': [ 'r1306478', 'r207109', 'r5333483' ],
      'w183723744': [ 'r1306478', 'r207109', 'r2446126', 'r5333483' ],
      'w272672834': [ 'r1306478', 'r207109', 'r2446126', 'r5333483' ],
      'w26738933': [ 'r1306478', 'r207109', 'r2446126', 'r5333483' ],
      'w31275228': [ 'r1306478' ],
      'w239911077': [ 'r1306478', 'r207110', 'r5275276' ],
      'w26738920': [ 'r1306478', 'r207109', 'r207110', 'r5275276' ],
      'w162373026': [ 'r1306478', 'r207110' ],
      'w380110863': [ 'r1800603', 'r1306966' ],
      'w380110865': [ 'r1800603', 'r1306966' ],
      'w380110867': [ 'r1800603', 'r1306966' ],
      'w42799339': [ 'r1800603', 'r1306966' ],
      'w31107436': [ 'r1800603' ],
      'w24877453': [ 'r1306732', 'r1809912', 'r1990860' ],
      'w141233631': [ 'r1306732', 'r1809912', 'r1990860' ],
      'w146678770': [ 'r1306732', 'r1809912', 'r1990860' ],
      'w26231341': [ 'r1306732' ],
      'w88093287': [ 'r1306733' ],
      'w210848994': [ 'r1306733', 'r1809913', 'r1990861' ],
      'w125586439': [ 'r1306733' ],
      'w210599976': [ 'r1809913', 'r1990861' ],
      'w26231338': [ 'r1809913', 'r1990861' ],
      'w4583442': [ 'r207109' ],
      'w31275229': [ 'r207109', 'r2446126', 'r5333483' ],
      'w27950571': [ 'r207110', 'r5275276' ],
      'w87934166': [ 'r1306966' ],
      'w88117773': [ 'r1306967' ],
      'w88117770': [ 'r1306967' ],
      'w88117767': [ 'r1306967', 'r1800604' ],
      'w380110866': [ 'r1306967', 'r1800604' ],
      'w380110864': [ 'r1306967', 'r1800604' ],
      'w146678768': [ 'r1800604' ],
      'w26231340': [ 'r1809912', 'r1990860' ],
      'w42799333': [ 'r1809912', 'r1990860' ],
      'w42799336': [ 'r1809912', 'r1990860' ],
      'w125586446': [ 'r2005432' ],
      'w146678761': [ 'r2005432' ],
      'w148731068': [ 'r2005433' ],
      'w370033150': [ 'r20309' ],
      'w370577160': [ 'r2853012' ],
      'w118102651': [ 'r2853012' ],
      'w9269047': [ 'r2928575' ],
      'w211153301': [ 'r5954449' ],
      'w370577159': [ 'r5954449' ],
    }

    var returned = []
    var returnedIds = []
    var bbox = {
      'minlat': 48.195,
      'minlon': 16.330,
      'maxlat': 48.200,
      'maxlon': 16.340
    }

    ptmap.getSharedRouteWays(
      {
        bbox: bbox,
        onlyActive: false
      },
      function (err, result) {
        assert.equal(err, null)
        returned.push(result)
        returnedIds.push(result.id)

        assert.equal(result.id in expected, true, 'Route ' + result.id + ' should be in list of expected routes')
      },
      function (err) {
        assert.equal(err, null)
        assert.deepEqual(returnedIds.concat().sort(), Object.keys(expected).sort(), 'List of returned ways does not match')

        // process list in the end, because the sharedRouteWays may have been
        // modified (more routes added)
        for (var i = 0; i < returned.length; i++) {
          var routeIds = returned[i].routes({ onlyActive: false }).map(function (r) { return r.id })
          assert.deepEqual(routeIds, expected[returnedIds[i]], 'Way ' + returnedIds[i] + ' has wrong routes')
        }

        done()
      }
    )
  })

  it('getStopAreas', function (done) {
    var expected = {
      'Westbahnhof,48.1965,16.3388': [ 'r1306478', 'r5333483', 'r207109', 'r207110', 'r2446126', 'r5275276', 'r1800603', 'r1306732', 'r1306733', 'r1809913', 'r1990861', 'r1306966', 'r1306967', 'r1800604', 'r1809912', 'r1990860', 'r2005432', 'r2005433', 'r5275276', 'r20309', 'r2853012', 'r2928575', 'r5954449' ],
      'Beingasse,48.1994,16.3322': [ 'r910885', 'r910886', 'r1306732', 'r1306733' ],
      'Gerstnerstraße/Westbahnhof,48.1955,16.3383': [ 'r1800603', 'r1306966', 'r1306967', 'r1800604' ]
    }

    var returned = []
    var returnedIds = []
    var bbox = {
      'minlat': 48.195,
      'minlon': 16.330,
      'maxlat': 48.200,
      'maxlon': 16.340
    }

    ptmap.getStopAreas(
      {
        bbox: bbox,
        onlyActive: false
      },
      function (err, result) {
        assert.equal(err, null)

	returned.push(result)
      },
      function (err) {
        assert.equal(err, null)

        // process list in the end, because the stopAreas may have been
        // modified (more routes added)
        for (var k in returned) {
          var result = returned[k]

          if (k in expected) {
          }
          else {
            assert.equal(result.id in expected, true, 'StopArea ' + result.id + ' should be in list of expected stop areas')
          }
        }
        assert.equal(returned.length, Object.keys(expected).length)

        for (var i = 0; i < returned.length; i++) {
          var routeIds = returned[i].routes({ onlyActive: false }).map(function (r) { return r.id })
          assert.deepEqual(routeIds.sort(), expected[returned[i].id].sort(), 'Way ' + returned[i].id + ' has wrong count of routes')
        }

        done()
      }
    )
  })

  it('Far away StopAreas with same name', function (done) {
    async.parallel([
      function (callback) {
        ptmap.stopAreas.query(
          {
            bbox: {
              minlat: 48.234,
              minlon: 16.192,
              maxlat: 48.235,
              maxlon: 16.193
            },
            onlyActive: false
          },
          function (err, result) {
            console.log(result)
          },
          function (err) {
            callback(err)
          }
        )
      },
      function (callback) {
        ptmap.stopAreas.query(
          {
            bbox: {
              minlat: 48.213,
              minlon: 16.348,
              maxlat: 48.214,
              maxlon: 16.350
            },
            onlyActive: false
          },
          function (err, result) {
            console.log(result)
          },
          function (err) {
            callback(err)
          }
        )
      }
    ],
    function (err) {
      done()
    })
  })

})
