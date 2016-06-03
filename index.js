// Find self-intersections in geojson polygon (possibly with interior rings)
var math = require('mathjs')

module.exports = function(feature, fpp, filterFn) {
  if(fpp === undefined) var fpp = 10; // floating point precision

  if (feature.geometry.type != "Polygon") throw new Error("The input feature must be a Polygon");

  var coord = feature.geometry.coordinates;

  var output = [];
  var seen = {};

  for (var ring0 = 0; ring0 < coord.length; ring0++) {
    for (var edge0 = 0; edge0 < coord[ring0].length-1; edge0++) {
      for (var ring1 = 0; ring1 < coord.length; ring1++) {
        for (var edge1 = 0 ; edge1 < coord[ring1].length-1; edge1++) {
          // TODO: speedup possible if only interested in unique: start last two loops at ring0 and edge0+1

          var start0 = coord[ring0][edge0];
          var end0 = coord[ring0][edge0+1];
          var start1 = coord[ring1][edge1];
          var end1 = coord[ring1][edge1+1];

          var isect = math.intersect(start0, end0, start1, end1);

          if (isect == null) continue;

          var frac0 = (isect[0]-coord[ring0][edge0][0])/(coord[ring0][edge0+1][0]-coord[ring0][edge0][0]);
          var frac1 = (isect[0]-coord[ring1][edge1][0])/(coord[ring1][edge1+1][0]-coord[ring1][edge1][0]);

          isect = [parseFloat((isect[0]).toPrecision(fpp)),parseFloat((isect[1]).toPrecision(fpp))];
          frac0 = parseFloat((frac0).toPrecision(fpp));
          frac1 = parseFloat((frac1).toPrecision(fpp));
          // While some non-intersecting segment pairs return null, others strangely return fractions >1 or <0
          if (frac0 >= 1 || frac0 <= 0 || frac1 >= 1 || frac1 <= 0) continue;

          var key = ((isect[0]).toPrecision(fpp))+((isect[1]).toPrecision(fpp));
          var unique = !seen[key];
          if (unique) {
            seen[key] = true;
          }

          if (filterFn) {
            output.push(filterFn(isect, ring0, edge0, start0, end0, frac0, ring1, edge1, start1, end1, frac1, unique));
          } else {
            output.push(isect);
          }
        }
      }
    }
  }
  return output;
}
