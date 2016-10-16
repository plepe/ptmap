var fs = require('fs')
var conf = JSON.parse(fs.readFileSync('test/conf.json', 'utf8'))

var assert = require('assert')
var async = require('async')
var BoundingBox = require('boundingbox')

var OverpassFrontend = require('overpass-frontend')
GLOBAL.overpassFrontend = new OverpassFrontend(conf.url)

var Route = require('../src/Route')
var routes = {}

/* global describe it */

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

  it('load way members', function (done) {
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
