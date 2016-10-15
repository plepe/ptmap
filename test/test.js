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
    overpassFrontend.get(['r1306478', 'r5333483'],
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
    async.each(routes,
      function (route, callback) {
        route.routeWays(new BoundingBox({
          minlon: 16.336,
          minlat: 48.195,
          maxlon: 16.342,
          maxlat: 48.202
        }),
        function (err, result) {
          callback(err)
        })
      },
      function (err) {
        done(err)
      }
    )
  })
})
