import { CompositeLayer } from "@deck.gl/core";
import { ScatterplotLayer, ArcLayer } from "@deck.gl/layers";
import GL from "@luma.gl/constants";

// Default props for NodePieLayer
const defaultProps = {
  id: "node-pie-layer",
  data: [],
  pickable: true,
  autoHighlight: true,
  highlightColor: [255, 255, 255, 128],
  onClick: { type: "function", value: null, compare: false },
  onHover: { type: "function", value: null, compare: false },
  getPosition: {
    type: "accessor",
    value: (d) => d.position || [d.x || 0, d.y || 0, d.z || 0],
  },
  getRadius: { type: "accessor", value: (d) => d.radius || d.size || 5 },
  getFillColor: { type: "accessor", value: (d) => d.color || [255, 140, 0] },
  getLineColor: {
    type: "accessor",
    value: (d) => d.lineColor || [0, 0, 0, 255],
  },
  getLineWidth: { type: "accessor", value: (d) => d.lineWidth || 1 },
  hasPie: {
    type: "accessor",
    value: (d) => Boolean(d.pie && d.pie.length > 0),
  },
  getPieData: { type: "accessor", value: (d) => d.pie || [] },
  getPieValue: { type: "accessor", value: (d) => d },
  getPieColor: {
    type: "accessor",
    value: (d, i) => {
      const colors = [
        [66, 133, 244, 230], // Blue
        [219, 68, 55, 230], // Red
        [244, 160, 0, 230], // Yellow
        [15, 157, 88, 230], // Green
        [171, 71, 188, 230], // Purple
        [66, 66, 66, 230], // Gray
      ];
      return colors[i % colors.length];
    },
  },
  stroked: { type: "boolean", value: true },
  filled: { type: "boolean", value: true },
  radiusScale: { type: "number", value: 1 },
  radiusMinPixels: { type: "number", value: 1 },
  radiusMaxPixels: { type: "number", value: 100 },
  lineWidthScale: { type: "number", value: 1 },
  lineWidthMinPixels: { type: "number", value: 1 },
  lineWidthMaxPixels: { type: "number", value: 10 },
  parameters: {
    type: "object",
    value: {
      depthTest: false,
      blend: true,
      blendFunc: [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA],
      blendEquation: GL.FUNC_ADD,
    },
    compare: false,
  },
};

/**
 * A layer for rendering nodes with pie charts inside
 */
class NodePieLayer extends CompositeLayer {
  getPickingInfo({ info }) {
    // Add the original node object and segment info to the picking info
    if (info.object) {
      const isPieSegment =
        info.index >= 0 &&
        info.layer &&
        info.layer.id.includes("-pie-segments");

      return {
        ...info,
        object: {
          ...info.object,
          type: isPieSegment ? "pieSegment" : "node",
          segmentIndex: isPieSegment ? info.index : -1,
        },
      };
    }
    return info;
  }

  renderLayers() {
    const {
      id,
      data,
      pickable,
      autoHighlight,
      highlightColor,
      parameters,
      onClick,
      onHover,
      getPosition,
      getRadius,
      getFillColor,
      getLineColor,
      getLineWidth,
      hasPie,
      getPieData,
      getPieValue,
      getPieColor,
      stroked,
      filled,
      radiusScale,
      radiusMinPixels,
      radiusMaxPixels,
      lineWidthScale,
      lineWidthMinPixels,
      lineWidthMaxPixels,
      updateTriggers = {},
    } = this.props;

    const layers = [];

    // Filter nodes with and without pie charts
    const nodesWithoutPie = data.filter((d) => !hasPie(d));
    const nodesWithPie = data.filter((d) => hasPie(d));

    // Render nodes without pie charts
    if (nodesWithoutPie.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: `${id}-nodes-regular`,
          data: nodesWithoutPie,
          pickable,
          autoHighlight,
          highlightColor,
          parameters,
          getPosition,
          getRadius,
          getFillColor,
          getLineColor,
          getLineWidth,
          stroked,
          filled,
          radiusScale,
          radiusMinPixels,
          radiusMaxPixels,
          lineWidthScale,
          lineWidthMinPixels,
          lineWidthMaxPixels,
          onClick,
          onHover,
          updateTriggers,
        })
      );
    }

    // Render nodes with pie charts
    if (nodesWithPie.length > 0) {
      // Background circles for pie chart nodes
      layers.push(
        new ScatterplotLayer({
          id: `${id}-nodes-pie-bg`,
          data: nodesWithPie,
          pickable,
          autoHighlight,
          highlightColor,
          parameters,
          getPosition,
          getRadius,
          getFillColor,
          getLineColor,
          getLineWidth,
          stroked,
          filled,
          radiusScale,
          radiusMinPixels,
          radiusMaxPixels,
          lineWidthScale,
          lineWidthMinPixels,
          lineWidthMaxPixels,
          onClick,
          onHover,
          updateTriggers,
        })
      );

      // Generate arcs for each pie segment in each node
      const pieSegments = [];
      nodesWithPie.forEach((node) => {
        const position = getPosition(node);
        const radius = getRadius(node) * 0.9; // Slightly smaller than the node
        const pieData = getPieData(node);

        let startAngle = 0;
        const totalValue = pieData.reduce(
          (sum, segment) => sum + getPieValue(segment),
          0
        );

        pieData.forEach((segment, i) => {
          const value = getPieValue(segment);
          const endAngle = startAngle + (value / totalValue) * 2 * Math.PI;

          pieSegments.push({
            ...node,
            pieSegment: segment,
            pieSegmentIndex: i,
            position,
            radius,
            startAngle,
            endAngle,
            color: getPieColor(segment, i),
          });

          startAngle = endAngle;
        });
      });

      // Create arc layers for the pie segments
      if (pieSegments.length > 0) {
        layers.push(
          new ArcLayer({
            id: `${id}-pie-segments`,
            data: pieSegments,
            pickable,
            autoHighlight,
            highlightColor,
            parameters,
            getSourcePosition: (d) => d.position,
            getTargetPosition: (d) => d.position,
            getSourceColor: (d) => d.color,
            getTargetColor: (d) => d.color,
            getWidth: (d) => d.radius * 2,
            getHeight: (d) => d.radius * 2,
            getSourceAngle: (d) => d.startAngle,
            getTargetAngle: (d) => d.endAngle,
            widthUnits: "pixels",
            widthScale: 1,
            widthMinPixels: 1,
            widthMaxPixels: 100,
            onClick,
            onHover,
            updateTriggers: {
              getSourcePosition: updateTriggers.getPosition,
              getTargetPosition: updateTriggers.getPosition,
              getWidth: updateTriggers.getRadius,
              getHeight: updateTriggers.getRadius,
              getSourceColor: updateTriggers.getPieColor,
              getTargetColor: updateTriggers.getPieColor,
            },
          })
        );
      }
    }

    return layers;
  }
}

NodePieLayer.layerName = "NodePieLayer";
NodePieLayer.defaultProps = defaultProps;

export default NodePieLayer;
