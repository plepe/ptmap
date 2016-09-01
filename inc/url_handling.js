function url_handling_follow_link(ob) {
  var href = ob.getAttribute("href");

  // no link? do whatever the browser thinks is correct
  if(typeof href == "undefined")
    return true;

  // url starts with a protocal, e.g. 'https:' -> follow
  if(href.match(/^[A-Za-z0-9]+:/))
    return true;
  // url starts with '//' -> follow
  if(href.match(/^\/\//))
    return true;

  if(href.match(/#close$/)) {
    window.history.pushState(null, null, '.');
    return false;
  }

  var param = {};

  var ob1 = ob;
  while(ob1 != document.body) {
    if(ob1.popup) {
      param.popup = ob1.popup;
      break;
    }

    ob1 = ob1.parentNode;
  }

  show_object(href, param);

  window.history.pushState(null, null, href);
  return false;
}

function url_handling_mangle_links(node) {
  var as = node.getElementsByTagName('a');
  for(var i = 0; i < as.length; i++) {
    var a = as[i];
    var href = a.getAttribute('href');

    a.onclick = url_handling_follow_link.bind(this, a);
  }
}

function url_handling_init() {
  // modify all links currently in the dom tree
  url_handling_mangle_links(document.body);

  observeDOM(document.body, function() {
    url_handling_mangle_links(document.body);
  });
}

register_hook("init", url_handling_init);
