import {curveMonotoneX as d3CurveMonotoneX, line as d3Line, select as d3Select,} from "d3"

import {calculateNeedleHeight, centerTranslation, formatCurrentValueText, getRadius, sumArrayTill,} from "../util"
import {getNeedleTransition} from "../util/get-needle-transition"
import {
  configureArc,
  configureArcHover,
  configureScale,
  configureStroke,
  configureTickData,
  configureTicks,
  configureTooltipLabels,
} from "../config/configure"

import {hideTooltip, moveTooltip, showTooltip} from "./tooltip"

export const update = ({d3_refs, newValue, config}) => {
  const scale = configureScale(config)
  const ratio = scale(newValue)
  const range = config.maxAngle - config.minAngle

  let newAngle = config.minAngle + ratio * range
  if (newAngle < config.minAngle) {
    newAngle = config.minAngle - 10
  } else if (newAngle > config.maxAngle) {
    newAngle = config.maxAngle + 10
  }

  // update the pointer
  d3_refs.pointer
      .transition()
      .duration(config.needleTransitionDuration)
      .ease(getNeedleTransition(config.needleTransition))
      .attr("transform", `rotate(${newAngle})`)
      .attrTween("transform", () => {
        return function (t) {
          return `rotate(${config.minAngle + (newAngle - config.minAngle) * t})`
        }
      })
  d3_refs.current_value_text.text(formatCurrentValueText(newValue, config))
}

export const render = ({container, config}) => {
  const r = getRadius(config)
  const centerTx = centerTranslation(r)

  const svg = _renderSVG({container, config})

  const toolTip = _initTooltip({parent: svg.node().parentNode})

  _renderArcs({config, svg, centerTx, toolTip})
  _renderLabels({config, svg, centerTx, r, toolTip})
  _renderTitleText({config, svg})

  return {
    current_value_text: _renderCurrentValueText({config, svg}),
    pointer: _renderNeedle({config, svg, r, centerTx, toolTip}),
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

function _renderArcs({config, svg, centerTx, toolTip}) {
  const tickData = configureTickData(config)
  const arc = configureArc(config)
  const arcHover = configureArcHover(config)
  const strokeWidth = configureStroke(config)

  const segmentsColor = []

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
        let color = null
        if (config.customSegmentStops.length === 0) {
          color = config.arcColorFn(d * i)
        } else {
          color =
              config.segmentColors && config.segmentColors[i]
                  ? config.segmentColors[i]
                  : config.arcColorFn(d * i)
        }
        segmentsColor.push(color)
        return color
      })
      .attr("d", arc())
      .attr("stroke", "#fff")
      .attr("stroke-width", strokeWidth)

  if (config.growSegmentOnHover || config.segmentLabels.length) {
    const onShowTooltip = showTooltip(toolTip)
    const onHideTooltip = hideTooltip(toolTip)
    const onMoveTooltip = moveTooltip(toolTip)

    const htmlLabels = configureTooltipLabels(config, segmentsColor)

    const useGrowSegmentOnHover = !!config.growSegmentOnHover
    const useTooltips = config.segmentLabels.length > 0

    const onMouseenter = (d, i, groups) => {
      if (useGrowSegmentOnHover) {
        const el = d3Select(groups[i])
        el.classed("hover", true)
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
        const el = d3Select(groups[i])
        el.classed("hover", false)
        el.transition()
            .duration(70)
            .attr("d", arc(i))
      }

      if (useTooltips) {
        onHideTooltip()
      }
    }

    const onMousemove = () => {
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

function _renderLabels({config, svg, centerTx, r, toolTip}) {
  const ticks = configureTicks(config)
  const tickData = configureTickData(config)
  const scale = configureScale(config)
  const range = config.maxAngle - config.minAngle

  const strokeWidth = configureStroke(config)
  const {customSegmentLabels} = config

  r = r - strokeWidth

  if (config.positionLabel === "inner") {
    r = r - config.ringWidth
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
    const newAngle = config.minAngle + ratio * range
    return newAngle
  }

  const angles = ticks.reduce((result, tick, index) => {
    return result.concat([getNewAngle(tick, index)])
  }, [])

  // расчет ширины для лейблов
  const labelRadius = Math.abs(
      (config.positionLabel !== "inner" ? ((config.width / 2) + config.labelInset) : (config.labelInset / 4) - r)
  )

  const maxWidth = config.positionLabel == "inner" ?
      Math.sqrt(Math.pow(r, 2) - Math.pow(labelRadius, 2)):
      Math.sqrt(Math.pow(labelRadius, 2) - Math.pow(r, 2));

  const widths = angles.reduce((result, angle, index, angles) => {
    let currentAngle =
        index + 1 <= angles.length - 1
            ? angles[index + 1] - angle
            : angle + 10 - angle
    let previewAngle = index
        ? angle - angles[index - 1]
        : Math.abs(angle - 10 - angle)
    currentAngle = ((currentAngle / 2) * 3.14) / 180
    previewAngle = ((previewAngle / 2) * 3.14) / 180
    const widthLeft = r * Math.tan(previewAngle) * 0.8;
    const widthRight = r * Math.tan(currentAngle) * 0.8;
    return result.concat([
      [
        widthLeft < maxWidth ? widthLeft : maxWidth,
        widthRight < maxWidth ? widthRight: maxWidth,
      ],
    ])
  }, [])

  const labels = []
  lg.selectAll("text")
      .data(ticks)
      .enter()
      .append("text")
      .attr("transform", (d, i) => {
        return `rotate(${getNewAngle(d, i)}) translate(0, ${config.labelInset -
        r})`
      })
      .text((d, i) => {
        if (customSegmentLabels && customSegmentLabels[i]) {
          labels.push(customSegmentLabels[i])
          return customSegmentLabels[i]
        }
        labels.push(config.labelFormat(d))
        return config.labelFormat(d)
      })
      .attr("class", "segment-value")
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", config.textColor)
      .style("cursor", "pointer")
      .call(wrap, widths, config.positionLabel, svg)

  const onShowTooltip = showTooltip(toolTip)
  const onHideTooltip = hideTooltip(toolTip)
  const onMoveTooltip = moveTooltip(toolTip)

  const onMouseenter = (d, i, groups) => {
    const el = d3Select(groups[i])
    el.classed("hover", true)
    el.transition()
        .duration(70)
        .style("font-size", "16px")

    const text = labels[i]
    onShowTooltip(text)
  }

  const onMouseout = (d, i, groups) => {

    const el = d3Select(groups[i])

    el.classed("hover", false)
    el.transition()
        .duration(70)
        .style("font-size", "14px")
    onHideTooltip()
  }

  const onMousemove = () => {
    onMoveTooltip(svg.node().parentNode)
  }

  lg.selectAll(".segment-value")
      .on("mouseover", onMouseenter)
      .on("mouseout", onMouseout)
      .on("mousemove", onMousemove)
}

function _renderCurrentValueText({config, svg}) {
  return svg
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
}

function _renderNeedle({config, svg, r, centerTx, toolTip}) {
  const onShowTooltip = showTooltip(toolTip)
  const onHideTooltip = hideTooltip(toolTip)
  const onMoveTooltip = moveTooltip(toolTip)

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
  const hoverText = formatCurrentValueText(config.value, config)

  let pg = svg
      .append("g")
      .data([lineData])
      .attr("class", "pointer")
      .attr("transform", centerTx)
      .style("fill", config.needleColor)

  const onMouseenter = () => {
    onShowTooltip(hoverText)
  }

  const onMouseout = () => {
    onHideTooltip()
  }

  const onMousemove = () => {
    onMoveTooltip(svg.node().parentNode)
  }

  return pg
      .append("path")
      .attr("d", pointerLine)
      .attr("transform", `rotate(${config.minAngle})`)
      .on("mouseenter", onMouseenter)
      .on("mouseout", onMouseout)
      .on("mousemove", onMousemove)
}

function _initTooltip({parent}) {
  d3Select(parent).style("position", "relative")
  return d3Select(parent)
      .append("span")
      .style("opacity", 0)
      .style("background-color", "rgba(255,255,255,.8)")
      .style("border", "1px solid rgba(0,0,0,.5)")
      .style("border-radius", "4px")
      .style("padding", "5px")
      .style("position", "absolute")
      .style("display", "block")
}

function _renderTitleText({config, svg}) {
  const {title} = config
  return title
      ? svg
          .append("g")
          .attr(
              "transform",
              `translate(${config.width / 2}, ${config.width / 2})`
          )
          .append("text")
          .attr("class", "title")
          .attr("text-anchor", "middle")
          .attr("y", 40)
          .text(title)
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .style("fill", config.textColor)
      : null
}

function wrap(text, widths, positionLabel, svg) {
  // вставляем тестер
  let tester = svg
      .append("text")
      .attr("class", "segment-value")
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold");

  // замеряеем текст минимальной длины 5 символов
  tester.text('12345');
  const minWidth = tester.node().getComputedTextLength();

  text.each(function (t, index) {
    const width = widths[index]
    const [widthLeft, widthRight] = width
    if (widthRight + widthLeft >= minWidth) {
      let text = d3Select(this),
          words = text.text().split(/\s+/),
          line = [],
          lineNumber = 1,
          lineHeight = 1, // ems
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy") || 0),
          tspan = text
              .text(null)
              .append("tspan")
              .attr("x", 0)
              .attr("y", y)
              .attr("dy", dy + "em")

      // разбиваем на несколько строк если в этом есть необходимость
      let breakingIndex = null
      try {
        words.forEach((word, index) => {
          breakingIndex = index
          line.push(word)
          tspan.text(line.join(" "))
          const {width: contentLenght} = tspan.node().getBBox()
          if (contentLenght > widthLeft + widthRight) {
            if (line.length < 2) {
              tspan.text(line.join(" "))
              throw new Error()
            } else {
              line.pop()
              tspan.text(line.join(" "))
              line = []
              tspan = text
                  .append("tspan")
                  .attr("x", 0)
                  .attr("y", y)
                  .attr(
                      "dy",
                      (++lineNumber - (positionLabel == "inner" ? 1 : 1)) *
                      (lineHeight + dy) +
                      "em"
                  )
                  .text(word)
            }
          }
          if (lineNumber > 1) {
            throw new Error()
          }
        })
      } catch (e) {
        if (breakingIndex < words.length - 1) {
          const lastTspan = text.selectAll("tspan:last-of-type")
          lastTspan.text(lastTspan.text() + "...")
        }
      }

      // проверяем по ширине
      const {width: widthTextContent} = text.node().getBBox()
      if (widthTextContent > widthRight + widthLeft) {
        breakingIndex = null;
        try {
          text.selectAll("tspan").each(function (el, lineIndex) {
            const tspan = d3Select(this)
            tester.text(tspan.text());
            if (breakingIndex) {
              throw new Error()
            }
            while (
                tester.node().getBBox().width > widthRight + widthLeft && tester.text().length) {
              breakingIndex = lineIndex
              const text = tester.text()
              tester.text(
                  text.substring(
                      0,
                      text[text.length - 5] == " " ? text.length - 5 : text.length - 4
                  ) + "..."
              )
            }
            tspan.text(tester.text());
          })
        } catch (e) {
        }
      }

      const {width: widthText} = text.node().getBBox()
      const contentLenghtCenter = widthText / 2

      let biasX = 0
      if (contentLenghtCenter > widthRight) {
        biasX = widthRight - contentLenghtCenter
      }
      if (contentLenghtCenter > widthLeft) {
        biasX = contentLenghtCenter - widthLeft
      }
      text
          .select("tspan")
          .attr("dy", (positionLabel == "inner" ? -0.5 : -(lineNumber - 1)) + "em")
      // смещение от центра
      text.selectAll("tspan").attr("x", parseInt(biasX, 10))
    } else {
      d3Select(this).remove();
    }
  })

  // удаляем тестер
  tester.remove();
}
