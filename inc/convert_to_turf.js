function convert_to_turf(bounds) {
  if("getSouthWest" in bounds) {
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();

    return turf.polygon([[
      [ sw.lng, sw.lat ],
      [ sw.lng, ne.lat ],
      [ ne.lng, ne.lat ],
      [ ne.lng, sw.lat ],
      [ sw.lng, sw.lat ]
    ]]);
  }

  return bounds;
}
