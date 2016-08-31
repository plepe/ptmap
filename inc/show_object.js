function show_object(id, param) {
  if(!param)
    param = {};

  if(param.latLng)
    ;
  else if(param.popup)
    param.latLng = param.popup.getLatLng();

  var popup = L.popup()
    .setContent('Loading ...');

  if(param.latLng) {
    popup
      .setLatLng(param.latLng)
      .openOn(map);
  }

  var properties = OVERPASS_TAGS | OVERPASS_META | OVERPASS_MEMBERS | OVERPASS_BBOX | OVERPASS_CENTER;
  if(!id.match(/^r/))
    properties |= OVERPASS_GEOM;

  overpass_get(id, {
      weight: -1,
      properties: properties
    },
    function(err, feature) {
      if(!param.latLng) {
        popup
          .setLatLng(feature.center)
          .openOn(map);
      }

      if(!feature) {
        alert('feature can\'t be loaded: ' + id + '\n' + err);
        return;
      }

      var content = feature.highlight(param);
      content.onupdate = function() {
        popup.update();
      };
      popup.setContent(content.render());
    },
    function(err) {
    }
  );
}
