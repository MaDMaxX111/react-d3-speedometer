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

  const arc = d3Arc()
    .innerRadius(r - config.ringWidth - config.ringInset)
    .outerRadius(r - config.ringInset)
    .startAngle((d, i) => {
      const ratio = sumArrayTill(tickData, i)
      return deg2rad(config.minAngle + ratio * range)
    })
    .endAngle((d, i) => {
      const ratio = sumArrayTill(tickData, i + 1)
      return deg2rad(config.minAngle + ratio * range)
    })

  return arc
}

function _configureStroke(config) {
  const { paddingSegment, width, majorTicks } = config;
  if (paddingSegment && majorTicks > 1) {
    return  Math.ceil((width / majorTicks) * 0.1);
  }
  return 0;
}

function _configureArcHover(config) {

  // var arc = d3.svg.arc().outerRadius(arcsRadiusOuter[i]);
  // var arcOver = d3.svg.arc().outerRadius(arcsRadiusOuter[i] + 5);
  //
  // if (startAngle !== false) {
  //   arc.startAngle(startAngle);
  //   arcOver.startAngle(startAngle);
  // }
  // if (endAngle !== false) {
  //   arc.endAngle(endAngle);
  //   arcOver.endAngle(endAngle);
  // }
  // if (donut) {
  //   arc.innerRadius(arcsRadiusInner[i]);
  //   arcOver.innerRadius(arcsRadiusInner[i]);
  // }
  //
  // if (arc.cornerRadius && cornerRadius) {
  //   arc.cornerRadius(cornerRadius);
  //   arcOver.cornerRadius(cornerRadius);
  // }
  const tickData = configureTickData(config)

  const range = config.maxAngle - config.minAngle
  const r = config.width / 2

  const arc = d3Arc()
      .innerRadius(r - config.ringWidth - config.ringInset + 10)
      .outerRadius(r - config.ringInset +10)
      .startAngle((d, i) => {
        const ratio = sumArrayTill(tickData, i) * 10;
        return deg2rad(config.minAngle + ratio * range)
      })
      .endAngle((d, i) => {
        const ratio = sumArrayTill(tickData, i + 1)
        return deg2rad(config.minAngle + ratio * range)
      })
  return arc
}
