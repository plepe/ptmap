function array_keys(arr) {
  var ret = [];

  for(var id in arr)
    ret.push(id);

  return ret;
}
