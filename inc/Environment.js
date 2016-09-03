function Environment() {
  this.div_clock = document.createElement('div');
  this.div_clock.id = 'clock';
  document.body.appendChild(this.div_clock);

  this.update();
  window.setInterval(this.update.bind(this), 2000);
}

Environment.prototype.update = function() {
  this.current_date = new Date();

  this.div_clock.innerHTML = this.current_date.toISOString().slice(0, 16).replace('T', ' ');

  update_map_render_update_needed(function() {});
}

Environment.prototype.date = function() {
  return this.current_date;
}
