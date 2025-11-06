// Type definitions for phylotree.js
import * as d3 from "d3";

declare module "phylotree" {
  export interface PhylotreeNode {
    name?: string;
    branch_length?: number;
    parent?: PhylotreeNode;
    children?: PhylotreeNode[];
    attribute?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface PhylotreeRenderOptions {
    container?:
      | HTMLElement
      | d3.Selection<HTMLElement, unknown, null, undefined>;
    width?: number;
    height?: number;
    "top-bottom-spacing"?: number | string;
    "left-right-spacing"?: number | string;
    "maximum-per-node-spacing"?: number;
    "minimum-per-node-spacing"?: number;
    "maximum-per-level-spacing"?: number;
    "minimum-per-level-spacing"?: number;
    "show-scale"?: boolean;
    "align-tips"?: boolean;
    brush?: boolean;
    reroot?: boolean;
    hide?: boolean;
    zoom?: boolean;
    "restrict-editing"?: boolean;
    compression?: number;
    "font-size"?: number;
    "node-styler"?: (node: PhylotreeNode, element: SVGElement) => void;
    "edge-styler"?: (edge: unknown, element: SVGElement) => void;
    label?: (node: PhylotreeNode) => string;
    "internal-names"?: boolean;
    selectable?: boolean;
    collapsible?: boolean;
    [key: string]: unknown;
  }

  export interface PhylotreeLayout {
    width: number;
    height: number;
  }

  export interface Phylotree {
    // Core methods
    svg(
      svg_container:
        | SVGSVGElement
        | d3.Selection<SVGSVGElement, unknown, null, undefined>
    ): Phylotree;
    layout(options?: PhylotreeRenderOptions): PhylotreeLayout;
    render(options?: PhylotreeRenderOptions): Phylotree;
    update(): Phylotree;
    refresh(): Phylotree;

    // Tree manipulation
    reroot(node?: PhylotreeNode): Phylotree;
    sort_ascending(asc?: boolean): Phylotree;
    ladderize(asc?: boolean): Phylotree;

    // Selection and styling
    style_nodes(
      styler: (node: PhylotreeNode, element: SVGElement) => void
    ): Phylotree;
    style_edges(
      styler: (edge: unknown, element: SVGElement) => void
    ): Phylotree;
    node_span(attr?: string): Phylotree;

    // Data access
    get_nodes(): PhylotreeNode[];
    getTips?(): PhylotreeNode[];
    getNodes?(): PhylotreeNode[];
    get_newick(): string;

    // Event handling
    on(event: string, callback: (...args: unknown[]) => void): Phylotree;

    // Branch operations
    branch_length(): Phylotree;
    branch_name(): Phylotree;

    // Selection
    selection(): PhylotreeNode[];
    modify_selection(callback: (selection: PhylotreeNode[]) => void): Phylotree;

    // Utilities
    count_all_leaves(): number;
    placenodes(): Phylotree;

    [key: string]: unknown;
  }

  // Constructor function
  export class PhylotreeClass {
    constructor(newick: string, bootstrap_values?: boolean);

    // Core methods
    svg(
      svg_container:
        | SVGSVGElement
        | d3.Selection<SVGSVGElement, unknown, null, undefined>
    ): PhylotreeClass;
    layout(options?: PhylotreeRenderOptions): PhylotreeLayout;
    render(options?: PhylotreeRenderOptions): PhylotreeClass;
    update(): PhylotreeClass;
    refresh(): PhylotreeClass;

    // Tree manipulation
    reroot(node?: PhylotreeNode): PhylotreeClass;
    sort_ascending(asc?: boolean): PhylotreeClass;
    ladderize(asc?: boolean): PhylotreeClass;

    // Selection and styling
    style_nodes(
      styler: (node: PhylotreeNode, element: SVGElement) => void
    ): PhylotreeClass;
    style_edges(
      styler: (edge: unknown, element: SVGElement) => void
    ): PhylotreeClass;
    node_span(attr?: string): PhylotreeClass;

    // Data access
    get_nodes(): PhylotreeNode[];
    getTips?(): PhylotreeNode[];
    getNodes?(): PhylotreeNode[];
    get_newick(): string;

    // Event handling
    on(event: string, callback: (...args: unknown[]) => void): PhylotreeClass;

    // Branch operations
    branch_length(): PhylotreeClass;
    branch_name(): PhylotreeClass;

    // Selection
    selection(): PhylotreeNode[];
    modify_selection(
      callback: (selection: PhylotreeNode[]) => void
    ): PhylotreeClass;

    // Utilities
    count_all_leaves(): number;
    placenodes(): PhylotreeClass;

    [key: string]: unknown;
  }

  export const phylotree: typeof PhylotreeClass;
  export default phylotree;
}
