module.exports = function (a, b) {
  if (a === b) {
    return 0
  }
  if (a === 2 && b === 3) {
    return -1
  }
  if (a === 3 && b === 2) {
    return 1
  }
  return a < b ? 1 : -1
}
