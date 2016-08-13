/**
 * returns the length of the diagonal of the bounds in display pixels 
 */
function bounds_diagonal_px_length(bounds) {
  var sw = bounds.getSouthWest();
  var ne = bounds.getNorthEast();

  sw = map.latLngToLayerPoint(sw);
  ne = map.latLngToLayerPoint(ne);

  var h = ne.x - sw.x;
  var v = ne.y - sw.y;

  var d = Math.sqrt(h * h + v * v);

  return d;
}
