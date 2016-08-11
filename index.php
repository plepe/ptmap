<?php include "conf.php"; /* load a local configuration */ ?>
<?php include "modulekit/loader.php"; /* loads all php-includes */ ?>
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
    <script src="node_modules/leaflet/dist/leaflet.js"></script>
    <script src="node_modules/async/dist/async.min.js"></script>
    <script src="node_modules/leaflet-textpath/leaflet.textpath.js"></script>
    <script src="node_modules/natsort/index.js"></script>
    <script src="node_modules/turf/turf.js"></script>
  </head>
  <body>
  <div id='map'></div>
  </body>
</html>
