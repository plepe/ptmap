function show_object(id, param) {
  if(!param)
    param = {};

  var div = document.createElement('div');
  div.innerHTML = 'Loading ...';

  if(param.latLng)
    ;
  else if(param.popup)
    param.latLng = param.popup.getLatLng();

  var popup = L.popup()
    .setContent(div);


  if(param.latLng) {
    popup
      .setLatLng(param.latLng)
      .openOn(map);
  }

  div.update = function() {
    popup.update();
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

      feature.highlight(div, param, function() {});
    },
    function(err) {
    }
  );
}
