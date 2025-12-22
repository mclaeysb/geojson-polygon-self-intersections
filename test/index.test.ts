import { describe, it, expect } from 'vitest'
import gpsi, { intersect } from '../src'

import complexPolygon from './in/complex-polygon.json' with { type: 'json' }
import isects from './out/isects.json' with { type: 'json' }
import isectsCallbackFunction from './out/isects-callback-function.json' with { type: 'json' }

import type { Feature, Polygon } from 'geojson'

describe('gpsi function', () => {
  it('should find the correct intersections', () => {
    expect(
      gpsi((complexPolygon as Feature<Polygon>).geometry.coordinates)
    ).toStrictEqual(isects)
  })

  it('should give the same results whether or not using spatial index', () => {
    expect(
      gpsi((complexPolygon as Feature<Polygon>).geometry.coordinates, {
        useSpatialIndex: false
      }).sort()
    ).toStrictEqual(
      gpsi((complexPolygon as Feature<Polygon>).geometry.coordinates, {
        useSpatialIndex: true
      }).sort()
    )
  })

  it('should apply the callback function if passed', () => {
    expect(
      gpsi((complexPolygon as Feature<Polygon>).geometry.coordinates, {
        callbackFunction: ({ isect, frac0, frac1 }) => {
          return [isect, frac0, frac1]
        }
      })
    ).toStrictEqual(isectsCallbackFunction)
  })
})

describe('intersection function', () => {
  it('should add two numbers correctly', () => {
    expect(intersect([0, 0], [1, 1], [0, 1], [1, 0])).toStrictEqual([0.5, 0.5])
  })
})
