import memoizeOne from "memoize-one"
import { range as d3Range, arc as d3Arc } from "d3"
import {
  deg2rad,
  sumArrayTill,
  calculateScale,
  calculateTicks,
  calculateSegmentStops,
} from "../util"

// export memoized functions
export const configureScale = memoizeOne(_configureScale)
export const configureTicks = memoizeOne(_configureTicks)
export const configureTickData = memoizeOne(_configureTickData)
export const configureArc = memoizeOne(_configureArc)
export const configureStroke = memoizeOne(_configureStroke)
export const configureArcHover = memoizeOne(_configureArcHover)
export const configureTooltipLabels = memoizeOne(_configureTooltipLabels)

function _configureScale(config) {
  return calculateScale({
    min: config.minValue,
    max: config.maxValue,
    segments: config.maxSegmentLabels,
  })
}

function _configureTicks(config) {
  const scale = configureScale(config)

  let ticks = calculateTicks(scale, {
    min: config.minValue,
    max: config.maxValue,
    segments: config.maxSegmentLabels,
  })

  if (config.customSegmentStops.length > 0 && config.maxSegmentLabels !== 0) {
    ticks = config.customSegmentStops
  }

  return ticks
}

function _configureTickData(config) {
  const defaultTickData = d3Range(config.majorTicks).map((d) => {
    return 1 / config.majorTicks
  })

  const tickData = calculateSegmentStops({
    tickData: defaultTickData,
    customSegmentStops: config.customSegmentStops,
    min: config.minValue,
    max: config.maxValue,
  })

  return tickData
}

function _configureArc(config) {
  const tickData = configureTickData(config)

  const range = config.maxAngle - config.minAngle
  const r = config.width / 2

  const arc = (index = null) => {
    return d3Arc()
      .innerRadius(
        r -
          config.ringWidth -
          (config.positionLabel == "inner" ? 0 : config.ringInset)
      )
      .outerRadius(r - (config.positionLabel == "inner" ? 5 : config.ringInset))
      .startAngle((d, i) => {
        const ratio = sumArrayTill(tickData, index || i)
        return deg2rad(config.minAngle + ratio * range)
      })
      .endAngle((d, i) => {
        const ratio = sumArrayTill(tickData, (index || i) + 1)
        return deg2rad(config.minAngle + ratio * range)
      })
  }

  return arc
}

function _configureStroke(config) {
  const { paddingSegment, width, majorTicks } = config
  if (paddingSegment && majorTicks > 1) {
    // return  Math.ceil((width / majorTicks) * 0.1);
    return 1
  }
  return 0
}

function _configureArcHover(config) {
  const tickData = configureTickData(config)

  const range = config.maxAngle - config.minAngle
  const r = config.width / 2

  const arc = (index) => {
    return d3Arc()
      .innerRadius(
        r -
          config.ringWidth -
          (config.positionLabel == "inner" ? 0 : config.ringInset) -
          5
      )
      .outerRadius(
        r - (config.positionLabel == "inner" ? 5 : config.ringInset) + 5
      )
      .startAngle(() => {
        const ratio = sumArrayTill(tickData, index)
        return deg2rad(config.minAngle + ratio * range)
      })
      .endAngle(() => {
        const ratio = sumArrayTill(tickData, index + 1)
        return deg2rad(config.minAngle + ratio * range)
      })
  }

  return arc
}

function _configureTooltipLabels(config, segmentsColor) {
  const { segmentLabels } = config
  const label = (index) => {
    if (
      typeof segmentLabels[index] === "undefined" ||
      segmentLabels[index] === null
    )
      return null
    let html =
      '<span style="display: flex; align-items: center; margin-top: 0.5px;">' +
      '<span class="legend-color-guide" style="background-color: ' +
      segmentsColor[index] +
      '; width: 15px; height: 15px; border: 1px solid #999; display: inline-block; margin-right: 5px;"></span>' +
      '<span class="key">' +
      segmentLabels[index] +
      "</span>" +
      "</span>"

    return html
  }

  return label
}
