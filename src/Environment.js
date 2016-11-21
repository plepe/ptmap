/* global moment form */
var moment = require('moment')
var events = require('events')

function Environment () {
  this.base_date = new Date()
  this.base_timestamp = new Date()

  events.EventEmitter.call(this)

  setInterval(this.update.bind(this), 1000)
  this.update()
}

Environment.prototype.__proto__ = events.EventEmitter.prototype

Environment.prototype.update = function () {
  var lastDate = this.current_date
  this.current_date = new Date(this.base_date.getTime() + new Date().getTime() - this.base_timestamp.getTime())

  if (!lastDate || lastDate.toISOString() !== this.current_date.toISOString()) {
    this.emit('updateSecond')
  }

  if (!lastDate || lastDate.toISOString().substr(0, 16) !== this.current_date.toISOString().substr(0, 16)) {
    this.emit('updateMinute')
  }
}

Environment.prototype.setDate = function(date) {
  this.base_date = new Date(date)
  this.base_timestamp = new Date()
  this.update()
}

Environment.prototype.done = function () {
  this.needUpdate = false
}

Environment.prototype.date = function () {
  this.update()

  return this.current_date
}

module.exports = Environment
