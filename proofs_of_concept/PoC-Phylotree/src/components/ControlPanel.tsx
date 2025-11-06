import React, { useState } from "react";

interface ControlPanelProps {
  onNewickChange: (newick: string) => void;
  onOptionsChange: (options: Record<string, unknown>) => void;
  onLayoutChange: (layout: "rectangular" | "radial" | "linear") => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onNewickChange,
  onOptionsChange,
  onLayoutChange,
}) => {
  const [newickInput, setNewickInput] = useState("");
  const [layout, setLayout] = useState<"rectangular" | "radial" | "linear">(
    "rectangular"
  );
  const [options, setOptions] = useState({
    showScale: false,
    alignTips: true,
    showBrush: true,
    fontSize: 12,
    compression: 0.2,
    internalNames: false,
  });

  // Sample Newick trees for testing
  const sampleTrees = {
    simple: "((A:0.1,B:0.2):0.05,C:0.3);",
    mammals: "((human:0.1,chimp:0.1):0.05,(mouse:0.2,rat:0.15):0.1);",
    primates:
      "(((((human:0.002,chimp:0.002):0.001,bonobo:0.003):0.008,gorilla:0.011):0.015,orangutan:0.026):0.030,((gibbon_siamang:0.008,gibbon_lar:0.008):0.036,gibbon_agile:0.044):0.012);",
    birds:
      "((((chicken:0.2,turkey:0.18):0.05,(duck:0.22,goose:0.21):0.05):0.1,((eagle:0.30,hawk:0.28):0.03,(falcon:0.29,vulture:0.32):0.03):0.08):0.15,(penguin:0.40,ostrich:0.38):0.20);",
    // Large test tree with 50+ species
    vertebrates:
      "((((((human:0.1,chimp:0.1):0.05,(gorilla:0.15,orangutan:0.15):0.05):0.1,((mouse:0.2,rat:0.18):0.02,(rabbit:0.22,guinea_pig:0.20):0.02):0.15):0.2,(((dog:0.25,wolf:0.23):0.02,(fox:0.27,coyote:0.25):0.02):0.05,((cat:0.30,tiger:0.28):0.02,(lion:0.29,leopard:0.31):0.02):0.05):0.1):0.3,((((cow:0.35,sheep:0.33):0.03,(goat:0.34,pig:0.36):0.03):0.1,((horse:0.40,donkey:0.38):0.02,(zebra:0.39,rhino:0.45):0.05):0.08):0.2,(((elephant:0.50,mammoth:0.48):0.05,(manatee:0.55,dugong:0.53):0.05):0.15,((whale:0.60,dolphin:0.58):0.03,(porpoise:0.59,orca:0.61):0.03):0.12):0.1):0.1):0.4,(((((chicken:0.70,turkey:0.68):0.05,(duck:0.72,goose:0.71):0.05):0.1,((eagle:0.80,hawk:0.78):0.03,(falcon:0.79,vulture:0.82):0.03):0.08):0.2,((penguin:0.90,albatross:0.88):0.05,(pelican:0.89,cormorant:0.91):0.05):0.15):0.3,(((salmon:1.0,trout:0.98):0.05,(tuna:1.05,mackerel:1.03):0.05):0.2,((shark:1.2,ray:1.18):0.1,(cod:1.1,herring:1.08):0.08):0.15):0.25):0.1);",
  };

  const handleNewickSubmit = () => {
    if (newickInput.trim()) {
      onNewickChange(newickInput.trim());
    }
  };

  const handleSampleTree = (treeName: keyof typeof sampleTrees) => {
    const tree = sampleTrees[treeName];
    setNewickInput(tree);
    onNewickChange(tree);
  };

  const handleLayoutChange = (
    newLayout: "rectangular" | "radial" | "linear"
  ) => {
    setLayout(newLayout);
    onLayoutChange(newLayout);
  };

  const handleOptionChange = (key: string, value: unknown) => {
    const newOptions = { ...options, [key]: value };
    setOptions(newOptions as typeof options);

    // Convert to phylotree.js format
    const phylotreeOptions = {
      "show-scale": newOptions.showScale,
      "align-tips": newOptions.alignTips,
      brush: newOptions.showBrush,
      "font-size": newOptions.fontSize,
      compression: newOptions.compression,
      "internal-names": newOptions.internalNames,
    };

    onOptionsChange(phylotreeOptions);
  };

  return (
    <div className="control-panel">
      <h3>🌳 Phylotree.js Visualization</h3>

      {/* Sample Trees */}
      <div className="control-group">
        <h4>Sample Trees</h4>
        <div className="sample-buttons">
          <button
            onClick={() => handleSampleTree("simple")}
            className="sample-btn small"
          >
            Simple (3 species)
          </button>
          <button
            onClick={() => handleSampleTree("mammals")}
            className="sample-btn small"
          >
            Mammals (4 species)
          </button>
          <button
            onClick={() => handleSampleTree("primates")}
            className="sample-btn medium"
          >
            Primates (8 species)
          </button>
          <button
            onClick={() => handleSampleTree("birds")}
            className="sample-btn medium"
          >
            Birds (12 species)
          </button>
          <button
            onClick={() => handleSampleTree("vertebrates")}
            className="sample-btn large"
          >
            Vertebrates (50+ species)
          </button>
        </div>
      </div>

      {/* Custom Newick Input */}
      <div className="control-group">
        <h4>Custom Newick Tree</h4>
        <textarea
          className="newick-input"
          placeholder="Paste your Newick format tree here...&#10;Example: ((species1:0.1,species2:0.2):0.05,species3:0.3);"
          rows={4}
          value={newickInput}
          onChange={(e) => setNewickInput(e.target.value)}
        />
        <button onClick={handleNewickSubmit} className="load-btn">
          Load Tree
        </button>
        <div className="input-hint">
          💡 Phylotree.js can handle trees with thousands of species
          efficiently!
        </div>
      </div>

      {/* Layout Options */}
      <div className="control-group">
        <h4>Tree Layout</h4>
        <div className="layout-buttons">
          <label>
            <input
              type="radio"
              value="rectangular"
              checked={layout === "rectangular"}
              onChange={(e) =>
                handleLayoutChange(e.target.value as "rectangular")
              }
            />
            Rectangular
          </label>
          <label>
            <input
              type="radio"
              value="radial"
              checked={layout === "radial"}
              onChange={(e) => handleLayoutChange(e.target.value as "radial")}
            />
            Radial
          </label>
          <label>
            <input
              type="radio"
              value="linear"
              checked={layout === "linear"}
              onChange={(e) => handleLayoutChange(e.target.value as "linear")}
            />
            Linear
          </label>
        </div>
      </div>

      {/* Visualization Options */}
      <div className="control-group">
        <h4>Visualization Options</h4>
        <div className="options">
          <label>
            <input
              type="checkbox"
              checked={options.showScale}
              onChange={(e) =>
                handleOptionChange("showScale", e.target.checked)
              }
            />
            Show Scale
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.alignTips}
              onChange={(e) =>
                handleOptionChange("alignTips", e.target.checked)
              }
            />
            Align Tips
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.showBrush}
              onChange={(e) =>
                handleOptionChange("showBrush", e.target.checked)
              }
            />
            Enable Brush Selection
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.internalNames}
              onChange={(e) =>
                handleOptionChange("internalNames", e.target.checked)
              }
            />
            Show Internal Names
          </label>
        </div>

        <div className="sliders">
          <label>
            Font Size: {options.fontSize}px
            <input
              type="range"
              min="8"
              max="20"
              value={options.fontSize}
              onChange={(e) =>
                handleOptionChange("fontSize", parseInt(e.target.value))
              }
            />
          </label>
          <label>
            Compression: {options.compression}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.compression}
              onChange={(e) =>
                handleOptionChange("compression", parseFloat(e.target.value))
              }
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
