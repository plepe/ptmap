function bounds_to_tile(bounds) {
  var sw = bounds.getSouthWest();
  var ne = bounds.getNorthEast();

  return L.latLngBounds(
    L.latLng(Math.floor(sw.lat * 10) / 10, Math.floor(sw.lng * 10) / 10),
    L.latLng(Math.ceil(ne.lat * 10) / 10, Math.ceil(ne.lng * 10) / 10)
  );
}
