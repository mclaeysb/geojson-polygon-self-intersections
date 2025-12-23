/* eslint-disable @typescript-eslint/no-explicit-any */

import { Feature, Polygon, Position } from 'geojson'
import RBush from 'rbush'

type CallbackFunctionInput = {
  isect: Position
  ring0: number
  edge0: number
  start0: Position
  end0: Position
  frac0: number
  ring1: number
  edge1: number
  start1: Position
  end1: Position
  frac1: number
  unique: boolean
}
type Options = {
  useSpatialIndex: boolean
  epsilon: number
  reportVertexOnVertex: boolean
  reportVertexOnEdge: boolean
  callbackFunction: (callbackFunctionInput: CallbackFunctionInput) => any
}
type RBushTreeItem = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  ring: number
  edge: number
}

const defaultOptions: Options = {
  useSpatialIndex: true,
  epsilon: 0,
  reportVertexOnVertex: false,
  reportVertexOnEdge: false,
  callbackFunction: ({ isect }: { isect: Position }) => isect
}

/**
 * Return a polygon's self-intersections
 *
 * @export
 * @param {Feature<Polygon>} polygon GeoJSON Polygon
 * @param {?(Partial<Options>)} [partialOptions] Option
 * @returns {any[]} Array of self-intersection points (or any type produced by the callback function)
 */
export default function gpsi(
  polygon: Feature<Polygon>,
  partialOptions?: Partial<Options>
): any[] {
  const options = mergeOptions(defaultOptions, partialOptions)

  const coords = polygon.geometry.coordinates
  const output: any[] = []
  const seen: Record<string, any> = {}

  let tree: any
  if (options.useSpatialIndex) {
    const allEdgesAsRbushTreeItems = []
    for (let ring0 = 0; ring0 < coords.length; ring0++) {
      for (let edge0 = 0; edge0 < coords[ring0].length - 1; edge0++) {
        allEdgesAsRbushTreeItems.push(rbushTreeItem(coords, ring0, edge0))
      }
    }
    tree = new RBush<RBushTreeItem>()
    tree.load(allEdgesAsRbushTreeItems)
  }

  for (let ring0 = 0; ring0 < coords.length; ring0++) {
    for (let edge0 = 0; edge0 < coords[ring0].length - 1; edge0++) {
      if (options.useSpatialIndex) {
        const bboxOverlaps = tree.search(rbushTreeItem(coords, ring0, edge0))
        bboxOverlaps.forEach(function (bboxIsect: RBushTreeItem) {
          const ring1 = bboxIsect.ring
          const edge1 = bboxIsect.edge
          ifIsectAddToOutput(ring0, edge0, ring1, edge1)
        })
      } else {
        for (let ring1 = 0; ring1 < coords.length; ring1++) {
          for (let edge1 = 0; edge1 < coords[ring1].length - 1; edge1++) {
            // TODO: speedup possible if only interested in unique: start last two loops at ring0 and edge0+1
            ifIsectAddToOutput(ring0, edge0, ring1, edge1)
          }
        }
      }
    }
  }

  // Check if two edges intersect and add the intersection to the output
  function ifIsectAddToOutput(
    ring0: number,
    edge0: number,
    ring1: number,
    edge1: number
  ) {
    const start0 = coords[ring0][edge0]
    const end0 = coords[ring0][edge0 + 1]
    const start1 = coords[ring1][edge1]
    const end1 = coords[ring1][edge1 + 1]

    const isect = intersect(start0, end0, start1, end1)

    if (isect == undefined) return // discard parallels and coincidence
    let frac0: number
    let frac1: number
    if (end0[0] != start0[0]) {
      frac0 = (isect[0] - start0[0]) / (end0[0] - start0[0])
    } else {
      frac0 = (isect[1] - start0[1]) / (end0[1] - start0[1])
    }
    if (end1[0] != start1[0]) {
      frac1 = (isect[0] - start1[0]) / (end1[0] - start1[0])
    } else {
      frac1 = (isect[1] - start1[1]) / (end1[1] - start1[1])
    }

    // There are roughly three cases we need to deal with.
    // 1. If at least one of the fracs lies outside [0,1], there is no intersection.
    if (
      isOutside(frac0, options.epsilon) ||
      isOutside(frac1, options.epsilon)
    ) {
      return // require segment intersection
    }

    // 2. If both are either exactly 0 or exactly 1, this is not an intersection but just
    // two edge segments sharing a common vertex.
    if (
      isBoundaryCase(frac0, options.epsilon) &&
      isBoundaryCase(frac1, options.epsilon)
    ) {
      if (!options.reportVertexOnVertex) return
    }

    // 3. If only one of the fractions is exactly 0 or 1, this is
    // a vertex-on-edge situation.
    if (
      isBoundaryCase(frac0, options.epsilon) ||
      isBoundaryCase(frac1, options.epsilon)
    ) {
      if (!options.reportVertexOnEdge) return
    }

    const key = isect
    const unique = !seen[String(key)]
    if (unique) {
      seen[String(key)] = true
    }

    output.push(
      options.callbackFunction({
        isect,
        ring0,
        edge0,
        start0,
        end0,
        frac0,
        ring1,
        edge1,
        start1,
        end1,
        frac1,
        unique
      })
    )
  }

  return output
}

/**
 * Compute where two lines intersect.
 *
 * From https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
 *
 * @param {Position} start0
 * @param {Position} end0
 * @param {Position} start1
 * @param {Position} end1
 * @returns {(Position | undefined)} The point of intersection, or undefined if no intersection
 */
export function intersect(
  start0: Position,
  end0: Position,
  start1: Position,
  end1: Position
): Position | undefined {
  if (
    equalArrays(start0, start1) ||
    equalArrays(start0, end1) ||
    equalArrays(end0, start1) ||
    equalArrays(end1, start1)
  ) {
    return undefined
  }

  const x0 = start0[0],
    y0 = start0[1],
    x1 = end0[0],
    y1 = end0[1],
    x2 = start1[0],
    y2 = start1[1],
    x3 = end1[0],
    y3 = end1[1]
  const denom = (x0 - x1) * (y2 - y3) - (y0 - y1) * (x2 - x3)
  if (denom == 0) return undefined
  const x4 =
    ((x0 * y1 - y0 * x1) * (x2 - x3) - (x0 - x1) * (x2 * y3 - y2 * x3)) / denom
  const y4 =
    ((x0 * y1 - y0 * x1) * (y2 - y3) - (y0 - y1) * (x2 * y3 - y2 * x3)) / denom
  return [x4, y4]
}

// Check if arrays are equal.
export function equalArrays(array1: any[], array2: any[]): boolean {
  // If the other array is a falsy value, return
  if (!array1 || !array2) return false

  // Compare lengths - can save a lot of time
  if (array1.length != array2.length) return false

  for (let i = 0, l = array1.length; i < l; i++) {
    // Check if we have nested arrays
    if (array1[i] instanceof Array && array2[i] instanceof Array) {
      // Recurse into the nested arrays
      if (!equalArrays(array1[i], array2[i])) return false
    } else if (array1[i] != array2[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false
    }
  }
  return true
}

// Check if boundary case: true if frac is (almost) 1.0 or 0.0
function isBoundaryCase(frac: number, epsilon: number): boolean {
  const e2 = epsilon * epsilon
  return e2 >= (frac - 1) * (frac - 1) || e2 >= frac * frac
}
// Check if outside
function isOutside(frac: number, epsilon: number): boolean {
  return frac < 0 - epsilon || frac > 1 + epsilon
}

// Return a rbush tree item given an ring and edge number
function rbushTreeItem(
  polygon: Position[][],
  ring: number,
  edge: number
): RBushTreeItem {
  const start = polygon[ring][edge]
  const end = polygon[ring][edge + 1]

  let minX: number
  let maxX: number
  let minY: number
  let maxY: number
  if (start[0] < end[0]) {
    minX = start[0]
    maxX = end[0]
  } else {
    minX = end[0]
    maxX = start[0]
  }
  if (start[1] < end[1]) {
    minY = start[1]
    maxY = end[1]
  } else {
    minY = end[1]
    maxY = start[1]
  }
  return {
    minX: minX,
    minY: minY,
    maxX: maxX,
    maxY: maxY,
    ring: ring,
    edge: edge
  }
}

function mergeOptions(option0: Options, options1?: Partial<Options>): Options {
  return { ...option0, ...options1 }
}
