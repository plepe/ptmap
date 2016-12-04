var assert = require('assert')

var cmpScaleCategory = require('../src/cmpScaleCategory')

describe('cmpScaleCategory', function () {
  it('return value', function () {
    var expected = [
      [  0,  1,  1,  1 ],
      [ -1,  0,  1,  1 ],
      [ -1, -1,  0, -1 ],
      [ -1, -1,  1,  0 ],
    ]

    for (var i = 0; i < expected.length; i++) {
      for (var j = 0; j < expected[i].length; j++) {
        assert.equal(cmpScaleCategory(i, j), expected[i][j], 'cmpScaleCategory(' + i + ', ' + j + ') should be ' + expected[i][j])
      }
    }
    return true
  })

  it('sorting', function () {
    var tests = [
      [ 2, 2, 2 ], 2,
      [ 1, 2, 2 ], 2,
      [ 3, 2, 2 ], 2,
      [ 0, 1, 1 ], 1,
      [ 0, 1, 2 ], 2,
      [ 1, 2, 3 ], 2,
      [ 1, 3, 0 ], 3,
    ]

    for (var i = 0; i < tests.length; i+=2) {
      var list = tests[i]
      var expected = tests[i + 1]

      var actual = list.sort(cmpScaleCategory)[0]

      assert.equal(actual, expected, JSON.stringify(list) + ' should return ' + expected)
    }
      

    return true
  })
})
