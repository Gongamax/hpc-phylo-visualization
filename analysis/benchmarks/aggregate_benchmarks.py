#!/usr/bin/env python3
"""
aggregate_benchmarks.py

Aggregates all benchmark results from different tools into a single comprehensive table
similar to c.csv format.

Usage:
    python aggregate_benchmarks.py

Output:
    comprehensive_benchmark_results.csv
"""

import pandas as pd
import os
from pathlib import Path

# Paths
THESIS_DIR = Path(__file__).parent.parent.parent
PERF_TESTS_DIR = THESIS_DIR / "analysis" / "performance_tests"
POC_DIR = THESIS_DIR / "proofs_of_concept"
RESULTS_DIR = THESIS_DIR / "results" / "benchmark_tables"

# Input files
BENCHMARK_FILES = {
    "web_benchmark_results.csv": PERF_TESTS_DIR,
    "web_benchmark_extended_results.csv": PERF_TESTS_DIR,
    "cytoscape_benchmark_results.csv": PERF_TESTS_DIR,
    "benchmark_results.csv": POC_DIR / "PoC-GraphGL",
    "force_graph_benchmark_results.csv": POC_DIR / "force-graph-PoC",
    "sigma_benchmark_results.csv": POC_DIR / "PoC-Sigma",
}

# Output file
OUTPUT_FILE = RESULTS_DIR / "comprehensive_benchmark_results.csv"

# Ensure results directory exists
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def normalize_dataset_name(name):
    """Normalize dataset names for consistency across tools"""
    import re

    # Remove node count info in parentheses and common suffixes
    name = re.sub(r"\s*\(\d+\s*nodes\)", "", name, flags=re.IGNORECASE)
    name = name.strip().lower()

    # Remove common prefixes
    name = re.sub(
        r"^(phylo:\s*|simulated\s*-\s*ete3\s*-\s*|enterobase\s*-\s*\w+\s*-\s*|pubmlst\s*-\s*\w+\s*-\s*)",
        "",
        name,
        flags=re.IGNORECASE,
    )

    # Normalize separators
    name = name.replace("_", " ").replace("-", " ")
    name = re.sub(r"\s+", " ", name).strip()

    # Create canonical mappings based on keywords
    if "1k" in name or "tree 1k" in name:
        return "Simulated 1K"
    elif "3k" in name or "tree 3k" in name:
        return "Simulated 3K"
    elif "10k" in name or "tree 10k" in name:
        return "Simulated 10K"
    elif "30k" in name or "tree 30k" in name:
        return "Simulated 30K"
    elif "50k" in name or "tree 50k" in name:
        return "Simulated 50K"
    elif "200k" in name or "tree 200k" in name:
        return "Simulated 200K"
    elif "100k" in name and "salmonella" in name:
        return "Salmonella 100K"

    # Bacteria mappings
    elif "haemophilus" in name or "h. influenzae" in name or "h influenzae" in name:
        if "cgmlst" in name:
            return "H. influenzae cgMLST"
        else:
            return "H. influenzae MLST"

    elif (
        "campylobacter" in name
        or "coli" in name
        and ("mlst" in name or "cgmlst" in name)
    ):
        if "cgmlst" in name:
            return "C. coli cgMLST"
        else:
            return "C. coli MLST"

    elif "neisseria" in name:
        if "cgmlst" in name or "l200" in name:
            return "Neisseria cgMLST"
        else:
            return "Neisseria MLST"

    elif (
        "staphylococcus" in name
        or "aureus" in name
        or "s. aureus" in name
        or "s aureus" in name
    ):
        if "cgmlst" in name:
            return "S. aureus cgMLST"
        elif "nj" in name:
            return "S. aureus NJ"
        else:
            return "S. aureus MLST"

    elif "pneumoniae" in name or "s. pneumoniae" in name or "s pneumoniae" in name:
        if "mlst" in name:
            return "S. pneumoniae MLST"
        else:
            return "S. pneumoniae"

    elif "clostridium" in name:
        if "goeburst" in name:
            return "Clostridium goeBURST"
        else:
            return "Clostridium UPGMA"

    elif "vibrio" in name:
        if "goeburst" in name:
            return "Vibrio goeBURST"
        else:
            return "Vibrio UPGMA"

    # Fallback
    return name.title()


def format_time(ms_value):
    """Format time value with proper units (ms or s)"""
    if pd.isna(ms_value) or ms_value == 0:
        return "..."

    if ms_value < 1000:
        return f"{int(round(ms_value))} ms"
    else:
        return f"{ms_value / 1000:.2f} s"


def read_web_benchmark(filepath):
    """Read web_benchmark_results.csv (iTOL, Phylotree, PhyloScape)"""
    if not filepath.exists():
        print(f"⚠️  File not found: {filepath}")
        return pd.DataFrame()

    df = pd.read_csv(filepath)
    # Tool, Dataset, Nodes, Run1-7, Median_Total, ...
    results = []
    for _, row in df.iterrows():
        results.append(
            {
                "Dataset": normalize_dataset_name(row["Dataset"]),
                "Tool": row["Tool"],
                "Nodes": row["Nodes"],
                "Time_ms": row["Median_Total(ms)"],
            }
        )
    return pd.DataFrame(results)


def read_extended_benchmark(filepath):
    """Read web_benchmark_extended_results.csv (PhyD3, PhyloViz, GrapeTree)"""
    if not filepath.exists():
        print(f"⚠️  File not found: {filepath}")
        return pd.DataFrame()

    df = pd.read_csv(filepath)
    results = []
    for _, row in df.iterrows():
        results.append(
            {
                "Dataset": normalize_dataset_name(row["Dataset"]),
                "Tool": row["Tool"],
                "Nodes": row.get("Nodes", 0),
                "Time_ms": row["Median_Total(ms)"],
            }
        )
    return pd.DataFrame(results)


def read_graphgl_benchmark(filepath):
    """Read Graph.gl benchmark results"""
    if not filepath.exists():
        print(f"⚠️  File not found: {filepath}")
        return pd.DataFrame()

    df = pd.read_csv(filepath)
    results = []
    for _, row in df.iterrows():
        dataset_name = row["Dataset"]
        if "Phylo:" in dataset_name:
            dataset_name = normalize_dataset_name(dataset_name)
            results.append(
                {
                    "Dataset": dataset_name,
                    "Tool": "Graph.gl",
                    "Nodes": row["Nodes"],
                    "Time_ms": float(row["medianTotal"]),
                }
            )
    return pd.DataFrame(results)


def read_force_graph_benchmark(filepath):
    """Read 3D Force Graph benchmark results"""
    if not filepath.exists():
        print(f"⚠️  File not found: {filepath}")
        return pd.DataFrame()

    df = pd.read_csv(filepath)
    results = []
    for _, row in df.iterrows():
        dataset_name = normalize_dataset_name(row["Dataset"])
        tool_name = f"3d-force-graph ({row['Mode']})"
        results.append(
            {
                "Dataset": dataset_name,
                "Tool": tool_name,
                "Nodes": row["Nodes"],
                "Time_ms": float(row["Median Total (ms)"]),
            }
        )
    return pd.DataFrame(results)


def read_sigma_benchmark(filepath):
    """Read Sigma.js benchmark results"""
    if not filepath.exists():
        print(f"⚠️  File not found: {filepath}")
        return pd.DataFrame()

    df = pd.read_csv(filepath)
    results = []
    for _, row in df.iterrows():
        results.append(
            {
                "Dataset": normalize_dataset_name(row["Dataset"]),
                "Tool": "Sigma.js",
                "Nodes": row["Nodes"],
                "Time_ms": float(row["Median Total (ms)"]),
            }
        )
    return pd.DataFrame(results)


def read_cytoscape_benchmark(filepath):
    """Read Cytoscape benchmark results"""
    if not filepath.exists():
        print(f"⚠️  File not found: {filepath}")
        return pd.DataFrame()

    df = pd.read_csv(filepath)
    results = []
    for _, row in df.iterrows():
        if row["status"] == "Success":
            # Extract dataset name from filename
            dataset = row["dataset_name"].replace("_edgelist.csv", "")
            results.append(
                {
                    "Dataset": normalize_dataset_name(dataset),
                    "Tool": "Cytoscape.js",
                    "Nodes": 0,  # Not provided in cytoscape output
                    "Time_ms": float(row["median_load_time"]) * 1000,  # Convert s to ms
                }
            )
    return pd.DataFrame(results)


def main():
    print("🔄 Aggregating benchmark results...\n")

    all_results = []

    # Read all benchmark files
    readers = {
        "web_benchmark_results.csv": read_web_benchmark,
        "web_benchmark_extended_results.csv": read_extended_benchmark,
        "cytoscape_benchmark_results.csv": read_cytoscape_benchmark,
        "benchmark_results.csv": read_graphgl_benchmark,
        "force_graph_benchmark_results.csv": read_force_graph_benchmark,
        "sigma_benchmark_results.csv": read_sigma_benchmark,
    }

    for filename, base_path in BENCHMARK_FILES.items():
        filepath = base_path / filename
        reader = readers.get(filename)

        if reader:
            print(f"📁 Reading {filename}...")
            df = reader(filepath)
            if not df.empty:
                all_results.append(df)
                print(f"   ✓ Found {len(df)} entries")
            else:
                print(f"   ⚠️  No data or file not found")

    if not all_results:
        print("\n❌ No benchmark results found!")
        return

    # Combine all results
    combined = pd.concat(all_results, ignore_index=True)

    # Take the maximum node count for each Dataset+Tool combination (most accurate)
    combined = combined.groupby(["Dataset", "Tool"], as_index=False).agg(
        {"Nodes": "max", "Time_ms": "first"}
    )

    # Create pivot table (Datasets as rows, Tools as columns)
    # Only use Dataset as index to avoid duplicates from varying node counts
    pivot = combined.pivot_table(
        index="Dataset", columns="Tool", values="Time_ms", aggfunc="first"
    )

    # Format the output
    pivot_formatted = pivot.copy()
    for col in pivot_formatted.columns:
        pivot_formatted[col] = pivot_formatted[col].apply(format_time)

    # Reset index to make Dataset a column
    pivot_formatted = pivot_formatted.reset_index()

    # Rename Dataset column to Datasets
    pivot_formatted = pivot_formatted.rename(columns={"Dataset": "Datasets"})

    # Sort by dataset name alphabetically
    pivot_formatted = pivot_formatted.sort_values("Datasets")

    # Reorder columns (Datasets first, then tools alphabetically)
    cols = ["Datasets"] + sorted(
        [c for c in pivot_formatted.columns if c != "Datasets"]
    )
    pivot_formatted = pivot_formatted[cols]

    # Save to CSV
    pivot_formatted.to_csv(OUTPUT_FILE, index=False)

    print(f"\n✅ Aggregation complete!")
    print(f"📊 Output saved to: {OUTPUT_FILE}")
    print(f"📈 Total datasets: {len(pivot_formatted)}")
    print(f"🔧 Total tools: {len(pivot_formatted.columns) - 1}")

    # Print preview
    print("\n📋 Preview (first 10 rows):")
    print(pivot_formatted.head(10).to_string(index=False))


if __name__ == "__main__":
    main()
