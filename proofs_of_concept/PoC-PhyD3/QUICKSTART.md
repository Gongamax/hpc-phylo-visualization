# Quick Start Guide

## Problem Solved

The browser was throwing `TypeError: Module name '@vibbioinfocore/phyd3-parser-compat' does not resolve to a valid URL` because ES modules in the browser cannot directly import npm packages by name.

## Solution

We use **esbuild** as a bundler to resolve all npm dependencies and create a single `bundle.js` file that the browser can load.

## Quick Commands

```bash
# First time setup
npm install

# Build the project (creates dist/bundle.js)
npm run build

# Start the server
npm run serve

# Or do both at once
npm run dev

# Watch mode (auto-rebuild on changes)
npm run watch
# (then run npm run serve in another terminal)
```

## Project Structure

```
PoC-PhyD3/
├── index.html           # Main HTML file (loads dist/bundle.js)
├── main.js              # Source code with ES6 imports
├── dist/
│   └── bundle.js        # Bundled file (created by esbuild)
├── node_modules/        # Dependencies
├── package.json         # Project config with scripts
└── README.md            # Full documentation
```

## Key Libraries Used

1. **@vibbioinfocore/phylio** - Parses Newick format
2. **@vibbioinfocore/phyd3** - Visualizes phylogenetic trees
3. **@vibbioinfocore/phyd3-parser-compat** - PhyloXML compatibility layer

## Workflow

1. Edit `main.js` (source code)
2. Run `npm run build` (creates bundle)
3. Run `npm run serve` (starts server)
4. Open `http://localhost:8080` in browser

## Testing

Open the demo and try these Newick strings:

- Simple: `(A,B,(C,D));`
- With lengths: `((Human:0.2,Chimp:0.3):0.3,(Mouse:0.5,Rat:0.4):0.2);`
- Complex: `(((A:0.2,B:0.3):0.3,(C:0.5,D:0.3):0.2):0.3,E:0.7):0.0;`
