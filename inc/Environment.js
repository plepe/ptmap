function Environment() {
  this.div_clock = document.createElement('div');
  this.div_clock.id = 'clock';
  document.body.appendChild(this.div_clock);

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
