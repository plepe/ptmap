/* global moment form */
var moment = require('moment')
var Flatpickr = require('flatpickr')

function EnvironmentFrontend (env, display) {
  this.env = env

  if (!display) {
    this.display = document.createElement('div')
    this.display.id = 'clock'
    document.body.appendChild(this.display)
  } else {
    this.display = display
  }

  this.display.onclick = this.openDatePicker.bind(this)

  this.env.on('updateMinute', this.update.bind(this))
  this.update()
}

EnvironmentFrontend.prototype.update = function () {
  var date = this.env.date()

  this.display.innerHTML = moment(date).format('llll')

  if (this.datePicker) {
    this.datePicker.setDate(date)
  }
}

EnvironmentFrontend.prototype.openDatePicker = function () {
  if (this.datePicker) {
    return
  }

  this.datePickerWindow = document.createElement('div')
  this.datePickerWindow.id = 'config'
  document.body.appendChild(this.datePickerWindow)

  this.datePicker = new Flatpickr(this.datePickerWindow, {
    enableTime: true,
    inline: true,
    weekNumbers: true,
    defaultDate: this.env.date(),
    onChange: function(d) {
      this.env.setDate(d)
      this.update()
    }.bind(this)
  })
}

module.exports = EnvironmentFrontend
