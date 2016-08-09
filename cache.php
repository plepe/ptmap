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
  curl_close($ch);

  file_put_contents("data/{$id}.json", $response);
  print $response;
}
