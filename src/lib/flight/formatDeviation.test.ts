import { describe, expect, it } from 'vitest'
import { color } from '@/lib/design/tokens'
import { deviationColor, formatCourseDeviation } from './formatDeviation'

describe('formatCourseDeviation', () => {
  it('makes zero the only neutral target value', () => {
    expect(formatCourseDeviation(0)).toBe('0°')
    expect(formatCourseDeviation(0.04)).toBe('0°')
  })

  it('presents deviation in either direction as course loss', () => {
    expect(formatCourseDeviation(1)).toBe('−1°')
    expect(formatCourseDeviation(-1)).toBe('−1°')
    expect(formatCourseDeviation(0.76)).toBe('−0,8°')
  })

  it('reserves green for the target and red for every visible deviation', () => {
    expect(deviationColor(0)).toBe(color.correction)
    expect(deviationColor(0.2)).toBe(color.alert)
  })
})
