# geojson-polygon-self-intersections

A very simple module to compute all self-intersections in coordinates of a polygon.

According to the [Simple Features standard](https://en.wikipedia.org/wiki/Simple_Features), polygons may not self-intersect. GeoJSON, however, doesn't care about this. This tool can be used to check for and/or retrieve self-intersections.

## Installation

This package works in browsers and in Node.js as an ESM module.

Install Node.js or any compatible JavaScript runtime, then install this package with your favorite package manager.

```sh
npm install geojson-polygon-self-intersections
```

You can optionally build this package locally by running:

```sh
npm run build
```

## Usage

```js
import gpsi from 'geojson-polygon-self-intersections'

// feature = {type: "Feature", geometry: {type: "Polygon", coordinates: [[[1, 10], [11, 13], ...]]}}

const isects = gpsi(feature);

// isects = [[5, 8], [7, 3], ...]
```

Where `feature` is a GeoJSON Feature of Polygon *geometry*, who's coordinates are an Array of Array of Positions, where each position has at least two coordinates. Only the first two coordinates (typically *X* and *Y* or *lon* and *lat*) are taken into account.

### Options

The following options can be passed as a second argument to control the behaviour of the algorithm.

| Option                 | Description                                                                                                                                                                                                                                                                                                               | Default              |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------|
| `useSpatialIndex`      | Whether a spatial index should be used to filter for possible intersections.                                                                                                                                                                                                                                              | `true`               |
| `reportVertexOnVertex` | If the same vertex (or almost the same vertex) appears more than once in the input, should this be reported as an intersection?                                                                                                                                                                                           | `false`              |
| `reportVertexOnEdge`   | If a vertex lies (almost) exactly on an edge segment, should this be reported as an intersection?                                                                                                                                                                                                                         | `false`              |
| `epsilon`              | It is almost never a good idea to compare floating point numbers for identity. Therefor, if we say "the same vertex" or "exactly on an edge segment", we need to define how "close" is "close enough". Note that the value is *not* used as an euclidian distance but always relative to the length of some edge segment. | `0`                  |
| `callbackFunction`     | A callback function can be specified to process the output. See below.                                                                                                                                                                                                                                                    | `({ isect }) => isect` |

For the callback function, the following data are available per intersection point:

- Intersection coordinates: `isect`
- Ring index of the first edge: `ring0`
- Edge index of the first edge: `edge0`
- Start point of the first edge: `start0`
- End point of the first edge: `end0`
- Fractional distance of the intersection on the first edge: `frac0`
- Idem for the second edge: `ring1`, `edge1`, `start1`, `end1`, `frac1`
- Whether the intersection is unique: `unique`


Together, this may look like so:

```js
const options = {
  useSpatialIndex: false,
  callbackFunction: ({ isect, frac0, frac1 }) => { return [isect, frac0, frac1] }
}
const isects = gpsi(feature, options);

// isects = [[[5, 8], 0.4856, 0.1865]], [[[7, 3], 0.3985, 0.9658]], ...]
```

## Speed

This tool uses the [rbush](https://github.com/mourner/rbush) spatial index by default to speed up the detection of intersections. This is especially useful when are many edges but only few intersections. If you prefer, you can opt-out using an options parameter (see below) and it will perform a brute-force search for intersections instead. This might be preferable in case of few edges, as it allows you to avoid some overhead.

## Changelog

### 2.0.0 - 2025-12-22

- This is now an ESM module written in TypeScript
- Inputs and outputs are now bare polygon coordinates and no longer GeoJSON Features with a Polygon *geometry*. The package name is kept for continuity, and because it relates to GeoJSON not being as strict as the Simple Feature standard w.r.t. self-intersection.
- *Filter function* is now called *callback function* and part of the options
- Options must always be an object, only passing a boolean for `useSpatialIndex` is no longer supported

### 3.0.0 - 2025-12-23

- Outputs are now bare intersection coordinates and no longer a GeoJSON Features of MultiPoint *geometry* by default, but inputs were restored to be GeoJSON Features with Polygon *geometry*
