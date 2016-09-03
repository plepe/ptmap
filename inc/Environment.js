function Environment() {
  this.div_clock = document.createElement('div');
  this.div_clock.id = 'clock';
  document.body.appendChild(this.div_clock);

  this.div_clock.onclick = this.open_config.bind(this);

  this.base_date = new Date();
  this.base_timestamp = new Date();

  this.update();
  window.setInterval(this.update.bind(this), 2000);
}

Environment.prototype.update = function() {
  var last_date = this.current_date;
  this.current_date = new Date(this.base_date.getTime() + new Date().getTime() - this.base_timestamp.getTime());

  if(!last_date || last_date.toISOString().substr(0, 16) != this.current_date.toISOString().substr(0, 16))
    check_update_map();

  this.div_clock.innerHTML = moment(this.current_date).format('llll');

  update_map_render_update_needed(function() {});
}

Environment.prototype.date = function() {
  return this.current_date;
}

Environment.prototype.open_config = function() {
  this.config_window = document.createElement('div');
  this.config_window.id = 'config';
  document.body.appendChild(this.config_window);

  var fdiv = document.createElement('form');
  this.config_window.appendChild(fdiv);

  var f = new form('data', {
    datetime: {
      'name': 'Current date and time',
      'type': 'datetime'
    },
  });

  f.set_data({
    datetime: moment(this.current_date).format()
  });

  var x = f.show(fdiv);

  f.onchange = function() {
    var data = f.get_data();

    this.base_date = new Date(data.datetime);
    this.base_timestamp = new Date();
    this.update();
  }.bind(this);
}
