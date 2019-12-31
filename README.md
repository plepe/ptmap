INSTALLATION
============
```sh
npm install
cp conf.json-dist conf.json
nano conf.json
npm run build
npm run doc # (optional) create jsdoc documentation in doc/
```

PROVIDE OFFLINE DATA
====================
You can provide a .osm (or a .osm.json) file instead of the Overpass API backend (just use the URL of the file in `conf.json`).

To create the .osm file, you can download the required data via one of the following scripts. You can either use them within Overpass Turbo or use `curl` on the command line:

```sh
sed 's/{{bbox}}/47.066,15.4402,47.0661,47.06823/' < script.txt | curl -X POST -d@- https://overpass-api.de/api/interpreter > data.osm.json
```

## Simple script
```c
[out:json][bbox:{{bbox}}];
relation[route~"^(tram|bus|trolleybus|subway|ferry|train)$"];
out;
>;
out;
```

If you want to modify this file with JOSM (e.g. to add proposed routes), you would need to change the output format to xml (`[out:xml]`) and add 'meta' to the out statements (`out meta;`).

To reduce file size, you can remove the white space from the JSON file. Use the [following command](https://stackoverflow.com/a/25255735) for this:
```sh
awk -i inplace 'BEGIN{RS="\""} NR%2{gsub(/[[:space:]]/,"")} {ORS=RT;print} END{printf "\n"}' data.json
```

## Only include ways within bbox, but all stop nodes.
```c
[out:json][bbox:{{bbox}}];
relation[route~"^(tram|bus|trolleybus|subway|ferry|train)$"]->.routes;
.routes out;
way(r.routes)({{bbox}})->.ways;
.ways out skel;
node(r.routes)->.stops;
.stops out;
node(w.ways)->.geometry;
(.geometry; - .stops;);
out skel;
```

With this query only the ways inside the bounding box are included, an no tags (these are not needed anyway). You could consider removing even more ways (e.g. platforms) (unfortunately, the role filter currently does not support regular expressions). The nodes are more important, as these contain the names of the stops. So all direct node members are included, and also the nodes for building the geometry of ways (but without tags).

## Use a boundary relation instead of a bounding box
```c
[out:json];
relation[route~"^(tram|bus|trolleybus|subway|ferry|train)$"](area:3604283101)->.routes;
.routes out;
way(r.routes)(area:3604283101)->.ways;
.ways out skel;
node(r.routes)->.stops;
.stops out;
node(w.ways)->.geometry;
(.geometry; - .stops;);
out skel;
```

The numeric area id is calculated by adding 3600000000 to the relation id, in the above example Sofia, Bulgaria (which has the ID 4283101).

CONTRIBUTING
============
This application is developed by [Stephan Bösch-Plepelits](http://plepe.at). You are very welcome to post bug reports, ideas and pull requests to the [Github repository](http://github.com/plepe/ptmap).
