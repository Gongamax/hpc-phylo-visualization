// Tiny Newick parser (client-side)
// Returns a tree object: { name, length, children: [...] }
// Source: minimal parser adapted for browser use.

function parseNewick(s) {
  let idx = 0;
  function skipWhitespace() {
    while (idx < s.length && /\s/.test(s[idx])) idx++;
  }

  function parseSubtree() {
    skipWhitespace();
    let children = [];
    if (s[idx] === "(") {
      idx++; // skip '('
      while (true) {
        children.push(parseSubtree());
        skipWhitespace();
        if (s[idx] === ",") {
          idx++;
          continue;
        }
        if (s[idx] === ")") {
          idx++;
          break;
        }
        throw new Error(
          "Unexpected character in Newick at " + idx + ": " + s[idx]
        );
      }
    }

    // parse name
    skipWhitespace();
    let name = "";
    while (
      idx < s.length &&
      s[idx] !== ":" &&
      s[idx] !== "," &&
      s[idx] !== ")" &&
      s[idx] !== ";"
    ) {
      name += s[idx++];
    }
    name = name.trim();

    // parse branch length
    let length = null;
    if (s[idx] === ":") {
      idx++; // skip ':'
      let num = "";
      while (idx < s.length && /[0-9.eE+-]/.test(s[idx])) num += s[idx++];
      length = parseFloat(num);
    }

    return {
      name: name || null,
      length: isNaN(length) ? null : length,
      children: children,
    };
  }

  const tree = parseSubtree();
  // consume trailing semicolon if present
  skipWhitespace();
  if (s[idx] === ";") idx++;
  return tree;
}

function newickToCytoscapeElements(tree) {
  const elements = [];
  let idCounter = 0;

  function nextId() {
    return "n" + idCounter++;
  }

  function walk(node) {
    const myId = nextId();
    const label = node.name || myId;
    const classes =
      node.children && node.children.length > 0 ? "internal" : "leaf";
    elements.push({ data: { id: myId, label }, classes });
    if (node.children) {
      for (const child of node.children) {
        const childId = walk(child);
        // include branch length (child.length) as edge data.length so MST can use it
        const edgeData = {
          id: "e-" + myId + "-" + childId,
          source: myId,
          target: childId,
        };
        if (child.length != null) edgeData.length = child.length;
        elements.push({ data: edgeData });
      }
    }
    return myId;
  }

  walk(tree);
  return elements;
}

// Export for CommonJS/Browser
if (typeof window !== "undefined") {
  window.parseNewick = parseNewick;
  window.newickToCytoscapeElements = newickToCytoscapeElements;
}
