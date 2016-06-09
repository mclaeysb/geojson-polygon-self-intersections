// Find self-intersections in geojson polygon (possibly with interior rings)

module.exports = function(feature, filterFn) {
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

          var isect = intersect(start0, end0, start1, end1);

          if (isect == null) continue;

          var frac0 = (isect[0]-coord[ring0][edge0][0])/(coord[ring0][edge0+1][0]-coord[ring0][edge0][0]);
          var frac1 = (isect[0]-coord[ring1][edge1][0])/(coord[ring1][edge1+1][0]-coord[ring1][edge1][0]);

          // segment intersection
          if (frac0 >= 1 || frac0 <= 0 || frac1 >= 1 || frac1 <= 0) continue;

          var key = isect;
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
  if (!filterFn) output = {type: "Feature", geometry: {type: "MultiPoint", coordinates: output}};
  return output;
}

// Function to compute where two lines (not segments) intersect
// from https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
function intersect(start0, end0, start1, end1) {
  if (start0.equals(start1) || start0.equals(end1) || end0.equals(start1) || end1.equals(start1)) return null;
  var x1 = start0[0],
      y1 = start0[1],
      x2 = end0[0],
      y2 = end0[1],
      x3 = start1[0],
      y3 = start1[1],
      x4 = end1[0],
      y4 = end1[1];
  var denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denom == 0) return null;
  return [((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom, ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom];
}

// Function to compare Arrays of numbers. From http://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript
// Warn if overriding existing method
// if(Array.prototype.equals) console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});
