import { select as d3Select, mouse as d3Mouse } from "d3"

export const showTooltip = (Tooltip) => {
  return (htmlContent = null) => {
    htmlContent && Tooltip.html(htmlContent).style("opacity", 1)
    d3Select(this)
      .style("stroke", "black")
      .style("opacity", 1)
  }
}
export const moveTooltip = (Tooltip) => {
  return (d) => {
    const [mouseLeft, mouseTop] = d3Mouse(d)
    Tooltip.style("left", mouseLeft + 20 + "px").style(
      "top",
      mouseTop - 10 + "px"
    )
  }
}
export const hideTooltip = (Tooltip) => {
  return () => {
    Tooltip.style("opacity", 0)
    d3Select(this)
      .style("stroke", "none")
      .style("opacity", 0.8)
  }
}
