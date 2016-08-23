function PossibleBounds() {
  this.outer_bounds = null;
  this.inner_bounds = null;
}

PossibleBounds.prototype.add_outer_bounds = function(bounds) {
  bounds = convert_to_turf(bounds);

  if(!this.outer_bounds)
    return this.outer_bounds = bounds;

  return this.outer_bounds = turf.union(this.outer_bounds, bounds);
}

PossibleBounds.prototype.add_inner_bounds = function(bounds) {
  bounds = convert_to_turf(bounds);

  if(!this.inner_bounds)
    return this.inner_bounds = bounds;

  return this.inner_bounds = turf.union(this.inner_bounds, bounds);
}

PossibleBounds.prototype.is_possible = function(bounds) {
  bounds = convert_to_turf(bounds);

  if(this.outer_bounds)
    if(!turf.intersect(this.outer_bounds, bounds))
      return false;

  if(this.inner_bounds)
    if(!turf.difference(bounds, this.inner_bounds))
      return false;

  return true;
}
