// dependencies
var fs = require('fs')
var OverpassFrontend = require('overpass-frontend')
var assert = require('assert')
var async = require('async')

// sources
var StopArea = require('../src/StopArea')
var Route = require('../src/Route')
var SharedRouteWay = require('../src/SharedRouteWay')

// setup
global.config = JSON.parse(fs.readFileSync('test/conf.json', 'utf8'))
global.overpassFrontend = new OverpassFrontend(config.overpass.url, config.overpass)

var PTMap = require('../src/PTMap')
var ptmap = new PTMap()

ptmap.routes = Route.factory(ptmap)
ptmap.sharedRouteWays = SharedRouteWay.factory(ptmap)
ptmap.stopAreas = StopArea.factory(ptmap)

describe('Route', function () {
  it('.get()', function (done) {
    var tests = {
      'r910886': {
      },
      'r1234': null,
      'w183723744': null,
      'n1941351811': null,
      'Westbahnhof,48.1963,16.3387': null
    }

    async.eachOf(
      tests,
      function (expected, id, callback) {
        ptmap.routes.get(
          id,
          {},
          function (err, actual) {
            if (expected === null) {
              assert.equal(actual, null, id + ': Object should not exist!')
              callback(err)
              return
            }
            
            assert.equal(actual.id, id, id + ': Wrong ID returned!')
            callback(err)
          }
        )
      },
      function (err) {
        done(err)
      }
    )
  })
})
