<?php
$post_data = file_get_contents('php://input');
$id = md5($post_data);

Header("Content-Type: application/json; charset=UTF-8");

if(file_exists("data/{$id}.json")) {
  readfile("data/{$id}.json");
}
else {
  $ch = curl_init('https://www.overpass-api.de/api/interpreter');

  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

  $response = curl_exec($ch);

  if($response === false) {
    Header("HTTP/1.1 500 Internal Server Error");
    print "Error receiving response from Overpass API: " . curl_error($ch);
    exit(0);
  }

  file_put_contents("data/{$id}.json", $response);
  print $response;

  curl_close($ch);
}
