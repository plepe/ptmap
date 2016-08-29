function Environment() {
  window.setInterval(this.update.bind(this), 2000);
}

Environment.prototype.update = function() {
  this.current_date = new Date();

  update_map_render_update_needed(function() {});
}

Environment.prototype.date = function() {
  return this.current_date;
}
