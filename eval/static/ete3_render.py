#!/usr/bin/env python3
"""Render a Newick tree with ETE3 and emit normalized JSON metrics."""

import json
import resource
import sys
import time
from pathlib import Path

from ete3 import Tree


def rss_mb():
    # macOS reports ru_maxrss in bytes; Linux reports KiB. This repo is used on
    # macOS, but keep the Linux fallback sane.
    value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    if sys.platform == "darwin":
        return value / 1024 / 1024
    return value / 1024


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: ete3_render.py <input.newick> <output.svg>")

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    total_start = time.perf_counter()
    parse_start = time.perf_counter()
    tree = Tree(str(input_path), format=1)
    parse_ms = (time.perf_counter() - parse_start) * 1000

    nodes = sum(1 for _ in tree.traverse())
    edges = max(nodes - 1, 0)

    render_start = time.perf_counter()
    tree.render(str(output_path), w=1200, units="px")
    render_ms = (time.perf_counter() - render_start) * 1000

    print(
        json.dumps(
            {
                "nodes": nodes,
                "edges": edges,
                "load_ms": 0,
                "parse_ms": parse_ms,
                "render_ms": render_ms,
                "total_ms": (time.perf_counter() - total_start) * 1000,
                "memory_mb": rss_mb(),
                "render_artifact": str(output_path),
                "rendered": output_path.exists() and output_path.stat().st_size > 0,
            }
        )
    )


if __name__ == "__main__":
    main()
