import { CompositeLayer } from "@deck.gl/core";
import { LineLayer, PathLayer } from "@deck.gl/layers";
import GL from "@luma.gl/constants";

// Default props for EdgeLayer
const defaultProps = {
  id: "edge-layer",
  data: [],
  pickable: true,
  autoHighlight: true,
  highlightColor: [255, 255, 255, 128],
  onClick: { type: "function", value: null, compare: false },
  onHover: { type: "function", value: null, compare: false },
  getSourcePosition: {
    type: "accessor",
    value: (d) =>
      d.sourcePosition || [d.source.x || 0, d.source.y || 0, d.source.z || 0],
  },
  getTargetPosition: {
    type: "accessor",
    value: (d) =>
      d.targetPosition || [d.target.x || 0, d.target.y || 0, d.target.z || 0],
  },
  getControlPoints: { type: "accessor", value: (d) => d.controlPoints || [] },
  getPath: { type: "accessor", value: null, compare: false },
  getColor: { type: "accessor", value: (d) => d.color || [180, 180, 180, 255] },
  getWidth: { type: "accessor", value: (d) => d.width || 1 },
  widthUnits: { type: "string", value: "pixels" },
  widthScale: { type: "number", value: 1 },
  widthMinPixels: { type: "number", value: 1 },
  widthMaxPixels: { type: "number", value: 10 },
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
 * A composite layer for rendering graph edges as lines or curves
 */
class EdgeLayer extends CompositeLayer {
  getPickingInfo({ info }) {
    // Add the original edge object to the picking info
    return info.object
      ? {
          ...info,
          object: {
            ...info.object,
            type: "edge",
          },
        }
      : info;
  }

  renderLayers() {
    const {
      id,
      data,
      pickable,
      autoHighlight,
      highlightColor,
      onClick,
      onHover,
      getSourcePosition,
      getTargetPosition,
      getControlPoints,
      getPath,
      getColor,
      getWidth,
      widthUnits,
      widthScale,
      widthMinPixels,
      widthMaxPixels,
      parameters,
      updateTriggers = {},
    } = this.props;

    const layers = [];

    // Filter edges into straight lines and curves
    const straightEdges = [];
    const curvedEdges = [];

    data.forEach((edge) => {
      const controlPoints = getControlPoints(edge);
      if (controlPoints && controlPoints.length > 0) {
        curvedEdges.push(edge);
      } else {
        straightEdges.push(edge);
      }
    });

    // Render straight edges as LineLayer
    if (straightEdges.length > 0) {
      layers.push(
        new LineLayer({
          id: `${id}-straight`,
          data: straightEdges,
          pickable,
          autoHighlight,
          highlightColor,
          onClick,
          onHover,
          getSourcePosition,
          getTargetPosition,
          getColor,
          getWidth,
          widthUnits,
          widthScale,
          widthMinPixels,
          widthMaxPixels,
          parameters,
          updateTriggers,
        })
      );
    }

    // Render curved edges as PathLayer
    if (curvedEdges.length > 0) {
      const getPathForCurve = (edge) => {
        const source = getSourcePosition(edge);
        const target = getTargetPosition(edge);
        const controlPoints = getControlPoints(edge);

        // Create a path with control points
        return [source, ...controlPoints, target];
      };

      layers.push(
        new PathLayer({
          id: `${id}-curved`,
          data: curvedEdges,
          pickable,
          autoHighlight,
          highlightColor,
          onClick,
          onHover,
          getPath: getPath || getPathForCurve,
          getColor,
          getWidth,
          widthUnits,
          widthScale,
          widthMinPixels,
          widthMaxPixels,
          parameters,
          updateTriggers: {
            getPath: updateTriggers.getPath || updateTriggers.getControlPoints,
            getColor: updateTriggers.getColor,
            getWidth: updateTriggers.getWidth,
          },
        })
      );
    }

    return layers;
  }
}

EdgeLayer.layerName = "EdgeLayer";
EdgeLayer.defaultProps = defaultProps;

export default EdgeLayer;
