window.onload = function() {
  call_hooks("init");

  http_load("910885.json", null, null, function(err, data) {
    console.log(data);
  });
}
