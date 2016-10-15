var fs = require('fs')
var conf = JSON.parse(fs.readFileSync('test/conf.json', 'utf8'))

var assert = require('assert')

var OverpassFrontend = require('overpass-frontend')
var overpassFrontend = new OverpassFrontend(conf.url)

/* global describe it */

describe('Route', function () {
  it('load object', function (done) {
    overpassFrontend.get(['r1306478', 'r5333483'],
      {
        properties: OverpassFrontend.ALL
      },
      function (err, result, index) {
        if (err) {
          assert(false, 'There should be no error: ' + err)
        }
      },
      function (err) {
        done(err)
      }
    )
  })
})
