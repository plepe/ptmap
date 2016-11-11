/* global moment form */
var moment = require('moment')

function EnvironmentFrontend (env, display) {
  this.env = env

  if (!display) {
    this.display = document.createElement('div')
    this.display.id = 'clock'
    document.body.appendChild(this.display)
  } else {
    this.display = display
  }

  this.display.onclick = this.open_config.bind(this)

  window.setInterval(this.update.bind(this), 2000)
}

EnvironmentFrontend.prototype.update = function () {
  var date = this.env.date()

  this.display.innerHTML = moment(date).format('llll')
}

EnvironmentFrontend.prototype.open_config = function () {
  this.config_window = document.createElement('div')
  this.config_window.id = 'config'
  document.body.appendChild(this.config_window)

  var fdiv = document.createElement('form')
  this.config_window.appendChild(fdiv)

  var f = new form('data', {
    datetime: {
      'name': 'Current date and time',
      'type': 'datetime'
    }
  })

  f.set_data({
    datetime: moment(this.current_date).format()
  })

  f.show(fdiv)

  f.onchange = function () {
    var data = f.get_data()

    this.base_date = new Date(data.datetime)
    this.base_timestamp = new Date()
    //this.update()
  }.bind(this)
}

module.exports = EnvironmentFrontend
