<?php
$name = "PT-Map";
$id = "ptmap";
$depend = array(
  'modulekit-form',
);

$include = array(
  'php' => array(
    'inc/*.php' // automatically include all files in inc-directory
  ),
  'js' => array(
    'inc/OSMObject.js',
    'inc/OSMRelation.js',
    'inc/*.js' // automatically include all files in inc-directory
  ),
  'css' => array(
    'style.css' // include style.css
  )
);
