function http_load(url, get_param, post_param, callback) {
  var req = new XMLHttpRequest();
  req.onreadystatechange = function() {
    if(req.readyState == 4 && req.status == 200) {
      var data = JSON.parse(req.responseText);
      callback(null, data);
    }
  }
  req.open("GET", url, true);
  req.send();
}
