<?php
$post_data = file_get_contents('php://input');
$id = md5($post_data);

if(file_exists("data/{$id}.http")) {
  $f = fopen("data/{$id}.http", 'r');

  while($r = fgets($f)) {
    $r = chop($r);

    if($r == '');
      break;

    Header($r);
  }

  while($r = fread($f, 8192))
    print $r;

  fclose($f);
}
else {
  $ch = curl_init('https://www.overpass-api.de/api/interpreter');

  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_HEADER, 1);

  $response = curl_exec($ch);

  if($response === false) {
    Header("HTTP/1.1 500 Internal Server Error");
    print "Error receiving response from Overpass API: " . curl_error($ch);
    exit(0);
  }

  $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
  $header = substr($response, 0, $header_size);
  $body = substr($response, $header_size);

  file_put_contents("data/{$id}.http", $response);

  foreach(explode("\r\n", $header) as $h) {
    if($h != '')
      Header($h);
    file_put_contents('/tmp/ffo', "==$h==\n", FILE_APPEND);
  }
  print $body;

  curl_close($ch);
}
