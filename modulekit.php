<?php
$name = "PT-Map";
$id = "ptmap";
$depend = array(
  'modulekit-form',
  'twig',
  'weight_sort',
);

$include = array(
  'php' => array(
    'inc/*.php' // automatically include all files in inc-directory
  ),
  'js' => array(
  ),
  'css' => array(
    'style.css' // include style.css
  )
);
