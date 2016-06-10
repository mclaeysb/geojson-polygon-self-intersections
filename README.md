# geojson-polygon-self-intersections

A very simple script to compute all self-intersections in a GeoJSON polygon.

According to the [Simple Features standard](https://en.wikipedia.org/wiki/Simple_Features), polygons may not self-intersect. GeoJSON, however, doesn't care about this. You can use this tool to check for self-intersections, list them or use them in some way.

# Usage

Get Node.js, then

```bash
npm install geojson-polygon-self-intersections
```

and use it like so:

```javascript
var gpsi = require('geojson-polygon-self-intersections');

// poly = ...

var isects = gpsi(poly);

// isects
```

Where `poly` is a GeoJSON Polygon, and `isects` is a GeoJSON MultiPoint.

Alternatively, you can use a filter function to specify the output. You have access to the following data per point:

- [x,y] intersection coordinates: `isect`
- ring index of the first edge: `ring0`
- edge index of the first edge: `edge0`
- [x,y] of the start point of the first edge: `start0`
- [x,y] of the end point of the first edge: `end0`
- fractional distance of the intersection on the first edge: `frac0`
- idem for the second edge: `ring1`, `edge1`, `start1`, `end1`, `frac1`
- boolean indicating if the intersection is unique: `unique`
