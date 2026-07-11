export async function validateRender(page, tool) {
  if (tool.validation === "svg") {
    return validateSvg(page);
  }

  if (tool.validation === "canvas") {
    return validateCanvas(page);
  }

  if (tool.validation === "cytoscape") {
    return validateCytoscape(page);
  }

  if (tool.validation === "grapetree") {
    return validateGrapeTree(page);
  }

  return {
    rendered: "unknown",
    render_artifact: "",
    validation_detail: "No validation strategy configured",
  };
}

async function validateGrapeTree(page) {
  const result = await page.evaluate(() => {
    const status = document.getElementById("waiting-information")?.textContent ?? "";
    const nodes = document.querySelectorAll(".node").length;
    const svg = document.querySelector("svg");
    const canvas = document.querySelector("canvas");
    const artifact = svg ? "svg" : canvas ? "canvas" : "";
    const rendered = /Complete/i.test(status) && nodes > 0;

    return {
      rendered,
      artifact,
      detail: `status="${status}" nodes=${nodes}`,
    };
  });

  return {
    rendered: String(result.rendered),
    render_artifact: result.artifact,
    validation_detail: result.detail,
  };
}

async function validateCytoscape(page) {
  const result = await page.evaluate(() => {
    const cy = window.__lastCytoscape;
    const metrics = window.__lastCytoscapeMetrics;
    if (!cy || !metrics) {
      return { rendered: false, artifact: "canvas", detail: "No Cytoscape benchmark instance found" };
    }

    const nodes = cy.nodes().length;
    const edges = cy.edges().length;
    const canvas = document.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();
    const rendered = nodes > 0 && edges > 0 && rect && rect.width > 0 && rect.height > 0;

    return {
      rendered,
      artifact: "canvas",
      detail: `cytoscape nodes=${nodes} edges=${edges} canvas=${Math.round(rect?.width ?? 0)}x${Math.round(rect?.height ?? 0)}`,
    };
  });

  return {
    rendered: String(result.rendered),
    render_artifact: result.artifact,
    validation_detail: result.detail,
  };
}

async function validateSvg(page) {
  const result = await page.evaluate(() => {
    const svg = document.querySelector("svg");
    if (!svg) return { rendered: false, artifact: "", detail: "No svg element found" };

    const width = svg.getBoundingClientRect().width;
    const height = svg.getBoundingClientRect().height;
    const marks = svg.querySelectorAll("path,line,circle,text,g").length;
    const rendered = width > 0 && height > 0 && marks > 0;

    return {
      rendered,
      artifact: "svg",
      detail: `svg ${Math.round(width)}x${Math.round(height)} marks=${marks}`,
    };
  });

  return {
    rendered: String(result.rendered),
    render_artifact: result.artifact,
    validation_detail: result.detail,
  };
}

async function validateCanvas(page) {
  const result = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll("canvas")];
    if (!canvases.length) {
      return { rendered: false, artifact: "", detail: "No canvas element found" };
    }

    for (const canvas of canvases) {
      const width = canvas.width;
      const height = canvas.height;
      const rect = canvas.getBoundingClientRect();
      if (width === 0 || height === 0 || rect.width === 0 || rect.height === 0) continue;

      try {
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          return {
            rendered: true,
            artifact: "canvas",
            detail: `canvas ${width}x${height}; pixel inspection unavailable`,
          };
        }

        const sampleWidth = Math.min(width, 64);
        const sampleHeight = Math.min(height, 64);
        const samples = [
          [0, 0],
          [Math.max(0, Math.floor(width / 2 - sampleWidth / 2)), Math.max(0, Math.floor(height / 2 - sampleHeight / 2))],
          [Math.max(0, width - sampleWidth), Math.max(0, height - sampleHeight)],
          [Math.max(0, Math.floor(width * 0.25 - sampleWidth / 2)), Math.max(0, Math.floor(height * 0.25 - sampleHeight / 2))],
          [Math.max(0, Math.floor(width * 0.75 - sampleWidth / 2)), Math.max(0, Math.floor(height * 0.75 - sampleHeight / 2))],
        ];
        let nonTransparent = 0;

        for (const [x, y] of samples) {
          const pixels = context.getImageData(x, y, sampleWidth, sampleHeight).data;
          for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] > 0) nonTransparent++;
          }
        }

        if (nonTransparent > 0) {
          return {
            rendered: true,
            artifact: "canvas",
            detail: `canvas ${width}x${height} nontransparent_sample=${nonTransparent}`,
          };
        }
      } catch {
        return {
          rendered: true,
          artifact: "canvas",
          detail: `canvas ${width}x${height}; tainted or webgl canvas`,
        };
      }
    }

    return { rendered: false, artifact: "canvas", detail: "Canvas exists but appears blank" };
  });

  return {
    rendered: String(result.rendered),
    render_artifact: result.artifact,
    validation_detail: result.detail,
  };
}
