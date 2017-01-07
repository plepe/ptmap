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

describe('StopArea', function () {
  it('.get()', function (done) {
    var tests = {
      'Westbahnhof,48.1965,16.3388': {
        'routes': [ 'r1306478', 'r5333483', 'r207109', 'r207110', 'r2446126', 'r5275276', 'r1800603', 'r1306732', 'r1306733', 'r1809913', 'r1990861', 'r1306966', 'r1306967', 'r1800604', 'r1809912', 'r1990860', 'r2005432', 'r2005433', 'r5275276', 'r20309', 'r2853012', 'r2928575', 'r5954449', 'r1306478', 'r207109', 'r207110', 'r5275276', 'r5275276', 'r5333483' ]
      },
      'Beingasse,48.1994,16.3322': {
        'routes': [ 'r910885', 'r910886', 'r1306732', 'r1306733' ]
      },
      'Gerstnerstraße/Westbahnhof,48.1955,16.3383': {
        'routes': [ 'r1800603', 'r1306966', 'r1306967', 'r1800604' ]
      },
      'Foobar,48.1955,16.3383': null
    }

    async.eachOf(
      tests,
      function (expected, id, callback) {
        ptmap.stopAreas.get(
          id,
          {},
          function (err, actual) {
            if (expected === null) {
              assert.equal(actual, null, id + ': Object should not exist!')
              callback(err)
              return
            }
            
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
