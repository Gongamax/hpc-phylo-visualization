import { CompositeLayer } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";
import GL from "@luma.gl/constants";

// Default props for NodeLayer
const defaultProps = {
  id: "node-layer",
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
 * A composite layer for rendering graph nodes as circles
 */
class NodeLayer extends CompositeLayer {
  getPickingInfo({ info }) {
    // Add the original node object to the picking info
    return info.object
      ? {
          ...info,
          object: {
            ...info.object,
            type: "node",
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
      parameters,
      updateTriggers = {},
    } = this.props;

    return [
      new ScatterplotLayer({
        id: `${id}-core`,
        data,
        pickable,
        autoHighlight,
        highlightColor,
        onClick,
        onHover,
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
        parameters,
        updateTriggers,
      }),
    ];
  }
}

NodeLayer.layerName = "NodeLayer";
NodeLayer.defaultProps = defaultProps;

export default NodeLayer;
