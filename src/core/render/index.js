import {
  select as d3Select,
  line as d3Line,
  curveMonotoneX as d3CurveMonotoneX, selectAll
} from "d3"

import {
  centerTranslation,
  getRadius,
  calculateNeedleHeight,
  formatCurrentValueText,
  sumArrayTill,
  getInnerRadius,
} from "../util"
import { getNeedleTransition } from "../util/get-needle-transition"
import {
  configureArc,
  configureArcHover,
  configureScale,
  configureStroke,
  configureTickData,
  configureTicks,
  configureTooltipLabels,
} from "../config/configure"

import {
  showTooltip,
  hideTooltip,
  moveTooltip,
} from "./tooltip"

export const update = ({d3_refs, newValue, config}) => {
  const scale = configureScale(config)
  const ratio = scale(newValue)
  const range = config.maxAngle - config.minAngle

  let newAngle = config.minAngle + ratio * range
  if (newAngle < config.minAngle) {
    newAngle = config.minAngle - 10;
  } else if (newAngle > config.maxAngle) {
    newAngle = config.maxAngle + 10;
  }

  // update the pointer
  d3_refs.pointer
      .transition()
      .duration(config.needleTransitionDuration)
      .ease(getNeedleTransition(config.needleTransition))
      .attr("transform", `rotate(${newAngle})`)
  d3_refs.current_value_text.text(formatCurrentValueText(newValue, config))
}

export const render = ({container, config}) => {
  const r = getRadius(config)
  const centerTx = centerTranslation(r)

  const svg = _renderSVG({ container, config })

  _renderArcs({ config, svg, centerTx })
  _renderLabels({ config, svg, centerTx, r })
  _renderTitleText({config, svg})
  return {
    current_value_text: _renderCurrentValueText({config, svg}),
    pointer: _renderNeedle({config, svg, r, centerTx}),
  }
}

// helper function to render individual parts of gauge
function _renderSVG({container, config}) {
  return d3Select(container)
      .append("svg:svg")
      .attr("class", "speedometer")
      .attr("width", config.width)
      .attr("height", config.height)
}

function _renderArcs({config, svg, centerTx}) {
  const tickData = configureTickData(config)
  const arc = configureArc(config)
  const arcHover = configureArcHover(config)
  const strokeWidth = configureStroke(config)

  const segmentsColor = [];

  let arcs = svg
      .append("g")
      .attr("class", "arc")
      .attr("transform", centerTx)
  arcs
      .selectAll("path")
      .data(tickData)
      .enter()
      .append("path")
      .attr("class", "speedo-segment")
      .attr("fill", (d, i) => {
        let color = null;
        if (config.customSegmentStops.length === 0) {
          color = config.arcColorFn(d * i)
        } else {
          color = config.segmentColors && config.segmentColors[i]
              ? config.segmentColors[i]
              : config.arcColorFn(d * i)
        }
        segmentsColor.push(color);
        return color
      })
      .attr("d", arc())
      .attr("stroke", "#fff")
      .attr("stroke-width", strokeWidth)

  if (config.growSegmentOnHover || config.segmentLabels.length) {

    const toolTip = _initTooltip({parent: svg.node().parentNode})
    const onShowTooltip = showTooltip(toolTip)
    const onHideTooltip = hideTooltip(toolTip)
    const onMoveTooltip = moveTooltip(toolTip)
    const htmlLabels = configureTooltipLabels(config, segmentsColor)

    const useGrowSegmentOnHover = !!config.growSegmentOnHover;
    const useTooltips = config.segmentLabels.length > 0;

    const onMouseenter = (d, i, groups) => {
      if (useGrowSegmentOnHover){
        const el = d3Select(groups[i]);
        el.classed('hover', true);
        el.transition()
            .duration(70)
            .attr("d", arcHover(i))
      }

      if (useTooltips) {
        const html = htmlLabels(i)
        html && onShowTooltip(html)
      }

    }

    const onMouseout = (d, i, groups) => {
      if (useGrowSegmentOnHover) {
        const el = d3Select(groups[i]);
        el.classed('hover', false);
        el.transition()
            .duration(70)
            .attr("d", arc(i))
      }

      if (useTooltips) {
        onHideTooltip()
      }

    }

    const onMousemove = (d, i, groups) => {
      if (useTooltips) {
        onMoveTooltip(svg.node().parentNode)
      }
    }

    arcs
        .selectAll("path")
        .on("mouseenter", onMouseenter)
        .on("mouseout", onMouseout)
        .on("mousemove", onMousemove)
  }

}

function _renderLabels({config, svg, centerTx, r}) {

  const ticks = configureTicks(config)
  const tickData = configureTickData(config)
  const scale = configureScale(config)
  const range = config.maxAngle - config.minAngle

  const strokeWidth = configureStroke(config)
  const {customSegmentLabels} = config;

  r = r - strokeWidth;

  if (config.positionLabel === 'inner') {
    r = r - config.ringWidth - config.ringInset
  }

  let lg = svg
      .append("g")
      .attr("class", "label")
      .attr("transform", centerTx)

  const getNewAngle = (tick, i) => {
    const ratio =
        config.customSegmentStops.length === 0
            ? scale(tick)
            : sumArrayTill(tickData, i)
    const newAngle = config.minAngle + ratio * range;
    return newAngle;
  }

  // const maxContentLength = Math.max(...(customSegmentLabels || tickData).map(tick => tick.toString().length)) * 7;
  //
  // const minPlaceLength = ticks.reduce((minLength, currentTick, index, ticks) => {
  //   if (index) {
  //     const previwAngle = getNewAngle(ticks[index - 1], index - 1);
  //     const currentAngle = getNewAngle(currentTick, index);
  //     const angle = Math.abs(previwAngle - currentAngle);
  //     const lenght = Math.tan(deg2rad(angle/2)) * Math.abs(config.labelInset - r) * 2;
  //     return !minLength ? lenght : lenght < minLength ? lenght : minLength;
  //   }
  //   return minLength;
  // }, null);

  // const writingMode = maxContentLength < minPlaceLength ? null : "tb"

  lg.selectAll("text")
      .data(ticks)
      .enter()
      .append("text")
      .attr("transform", (d, i) => {
        return `rotate(${getNewAngle(d, i)}) translate(0, ${config.labelInset - r})`
      })
      // .attr("writing-mode", writingMode)
      .text((d,i) => {
        if (customSegmentLabels && customSegmentLabels[i]) {
          return customSegmentLabels[i]
        }
        return config.labelFormat(d)
      })
      .attr("class", "segment-value")
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", config.textColor)
}

function _renderCurrentValueText({config, svg}) {
  return (
      svg
          .append("g")
          .attr("transform", `translate(${config.width / 2}, ${config.width / 2})`)
          .append("text")
          .attr("class", "current-value")
          .attr("text-anchor", "middle")
          .attr("y", 23)
          .text(config.currentValue || "")
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .style("fill", config.textColor)
  )
}

function _renderNeedle({config, svg, r, centerTx}) {
  const needleLength = calculateNeedleHeight({
    heightRatio: config.needleHeightRatio,
    radius: r,
  })

  const lineData = [
    [config.pointerWidth / 2, 0],
    [0, -needleLength],
    [-(config.pointerWidth / 2), 0],
    [0, config.pointerTailLength],
    [config.pointerWidth / 2, 0],
  ]

  const pointerLine = d3Line().curve(d3CurveMonotoneX)

  let pg = svg
      .append("g")
      .data([lineData])
      .attr("class", "pointer")
      .attr("transform", centerTx)
      .style("fill", config.needleColor)

  return pg
      .append("path")
      .attr("d", pointerLine)
      .attr("transform", `rotate(${config.minAngle})`)
}

function _initTooltip({parent}) {
  d3Select(parent).style("position", "relative")
  return d3Select(parent).append("span")
      .style("opacity", 0)
      .style("background-color", "rgba(255,255,255,.8)")
      .style("border", "1px solid rgba(0,0,0,.5)")
      .style("border-radius", "4px")
      .style("padding", "5px")
      .style("position", "absolute")
      .style("display", "block")
}

function _renderTitleText({config, svg}) {
  const { title } = config;
  return (
      title ? svg
          .append("g")
          .attr("transform", `translate(${config.width / 2}, ${config.width / 2})`)
          .append("text")
          .attr("class", "title")
          .attr("text-anchor", "middle")
          .attr("y", 40)
          .text(title)
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .style("fill", config.textColor) : null
  )
}