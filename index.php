<?php include "conf.php"; /* load a local configuration */ ?>
<?php include "modulekit/loader.php"; /* loads all php-includes */ ?>
<?php Header("Content-Type: text/html; charset=UTF-8"); ?>
<?php call_hooks("init"); /* initialize submodules */ ?>
<?php
$conf = json_decode(file_get_contents("conf.json"), 1);
html_export_var(array("conf" => $conf));
?>
<!DOCTYPE HTML>
<html>
  <head>
    <title>My App</title>
    <?php print modulekit_to_javascript(); /* pass modulekit configuration to JavaScript */ ?>
    <?php print modulekit_include_js(); /* prints all js-includes */ ?>
    <?php print modulekit_include_css(); /* prints all css-includes */ ?>
    <?php print_add_html_headers(); /* print additional html headers */ ?>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="node_modules/leaflet/dist/leaflet.css" />
    <link rel="stylesheet" href="node_modules/flatpickr/dist/flatpickr.min.css" />
    <script src="node_modules/leaflet/dist/leaflet.js"></script>
    <script src="node_modules/leaflet-textpath/leaflet.textpath.js"></script>
    <script src="dist/ptmap.js"></script>
  </head>
  <body>
  <div id='map'></div>
  <div id='status'>
    <div id='clock'></div>
    <div id='loadingIndicator'><img src='img/loading.gif'>Loading</div>
  </div>
  </body>
</html>
