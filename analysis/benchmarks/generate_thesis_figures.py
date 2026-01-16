#!/usr/bin/env python3
"""
Generate two specific figures for thesis:
- Figure A: Scalability Wall (Log-Log Line Plot)
- Figure B: Real-World Performance (Grouped Bar Chart)
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path

# Set style for publication-quality figures
sns.set_style("whitegrid")
plt.rcParams["font.family"] = "serif"
plt.rcParams["font.size"] = 11
plt.rcParams["axes.labelsize"] = 12
plt.rcParams["axes.titlesize"] = 13
plt.rcParams["legend.fontsize"] = 10
plt.rcParams["xtick.labelsize"] = 10
plt.rcParams["ytick.labelsize"] = 10

# Tool color palette (consistent across both figures)
TOOL_COLORS = {
    "Force-Graph": "#2ecc71",  # Green (fastest)
    "GrapeTree": "#3498db",  # Blue
    "iTOL": "#9b59b6",  # Purple
    "PhyloScape": "#e74c3c",  # Red
    "Phylotree": "#f39c12",  # Orange
    "Cytoscape": "#e67e22",  # Dark orange (slowest)
}

# Tool markers for line plot
TOOL_MARKERS = {
    "Force-Graph": "o",  # Circle
    "GrapeTree": "s",  # Square
    "iTOL": "^",  # Triangle up
    "PhyloScape": "D",  # Diamond
    "Phylotree": "v",  # Triangle down
    "Cytoscape": "X",  # X marker
}


def load_benchmark_data():
    """Load and prepare benchmark data."""
    df = pd.read_csv(
        "../../results/benchmark_tables/comprehensive_benchmark_results.csv"
    )

    # Rename columns for consistency
    df = df.rename(
        columns={
            "Datasets": "Dataset",
            "3d-force-graph (2D)": "Force-Graph",
            "Cytoscape.js": "Cytoscape",
            "Phylotree.js": "Phylotree",
        }
    )

    # Extract node counts from dataset names for synthetic datasets
    def extract_nodes(dataset_name):
        """Extract number of nodes from dataset name."""
        if "Simulated" in dataset_name or "Tree" in dataset_name:
            # Extract number like "10K", "200K", etc.
            import re

            match = re.search(r"(\d+)[kK]", dataset_name)
            if match:
                return int(match.group(1)) * 1000
        # For real datasets, we'll need to look them up
        node_map = {
            "C. coli MLST": 9177,
            "C. coli cgMLST": 1587,
            "Clostridium UPGMA": 5454,
            "Clostridium goeBURST": 5454,
            "H. influenzae MLST": 5074,
            "H. influenzae cgMLST": 1426,
            "Neisseria MLST": 17848,
            "Neisseria cgMLST": 201379,
            "S. aureus MLST": 13102,
            "S. aureus NJ": 13102,
            "S. aureus cgMLST": 22524,
            "S. pneumoniae": 11232,
            "S. pneumoniae MLST": 11232,
            "Salmonella 100K": 100000,
            "Vibrio UPGMA": 38569,
            "Vibrio goeBURST": 38569,
        }
        return node_map.get(dataset_name, 0)

    df["Nodes"] = df["Dataset"].apply(extract_nodes)

    # Parse time values and convert to seconds
    def parse_time(value):
        """Convert time string to seconds (float)."""
        if pd.isna(value) or value == "---" or value == "":
            return np.nan

        value_str = str(value).strip()

        # Handle milliseconds
        if "ms" in value_str:
            return float(value_str.replace("ms", "").strip()) / 1000
        # Handle seconds
        elif "s" in value_str:
            return float(value_str.replace("s", "").strip())
        else:
            # Try to parse as float
            try:
                return float(value_str)
            except:
                return np.nan

    # Apply to all tool columns
    tool_columns = [
        "Force-Graph",
        "Cytoscape",
        "GrapeTree",
        "PhyloScape",
        "Phylotree",
        "iTOL",
    ]
    for col in tool_columns:
        if col in df.columns:
            df[col] = df[col].apply(parse_time)

    return df


def figure_a_scalability_wall(df, output_dir):
    """
    Figure A: The "Scalability Wall" (Log-Log Line Plot)
    Shows how each tool scales with dataset size on synthetic data.
    """
    # Filter only synthetic datasets
    synthetic_df = df[df["Dataset"].str.contains("Simulated", case=False)].copy()

    # Sort by number of nodes
    synthetic_df = synthetic_df.sort_values("Nodes")

    # Extract node counts and convert to numeric
    node_counts = synthetic_df["Nodes"].values

    # Tools to plot (excluding Force-Graph for now to add it specially)
    tools = ["Force-Graph", "Cytoscape", "GrapeTree", "iTOL", "PhyloScape", "Phylotree"]

    # Create figure
    fig, ax = plt.subplots(figsize=(10, 6))

    # Plot each tool
    for tool in tools:
        if tool not in synthetic_df.columns:
            continue

        times = synthetic_df[tool].values

        # Filter out missing values
        valid_mask = ~np.isnan(times)
        valid_nodes = node_counts[valid_mask]
        valid_times = times[valid_mask]

        if len(valid_times) > 0:
            ax.plot(
                valid_nodes,
                valid_times,
                marker=TOOL_MARKERS.get(tool, "o"),
                color=TOOL_COLORS.get(tool, "gray"),
                linewidth=2.5 if tool == "Force-Graph" else 1.5,
                markersize=8,
                label=tool,
                alpha=0.9,
            )

    # Set log scales
    ax.set_xscale("log")
    ax.set_yscale("log")

    # Labels and title
    ax.set_xlabel("Number of Nodes (log scale)", fontweight="bold")
    ax.set_ylabel("Rendering Time in Seconds (log scale)", fontweight="bold")
    ax.set_title(
        "Figure A: Scalability Analysis - Synthetic Datasets", fontweight="bold", pad=15
    )

    # Grid
    ax.grid(True, alpha=0.3, linestyle="--", linewidth=0.5)

    # Legend
    ax.legend(loc="upper left", framealpha=0.95, edgecolor="black")

    # Annotations to highlight key findings
    # Add annotation showing Force-Graph maintains sub-second performance
    ax.axhline(
        y=1.0,
        color="red",
        linestyle="--",
        linewidth=1.5,
        alpha=0.7,
        label="1-second threshold",
    )
    ax.text(
        150000, 1.2, "Interactive Threshold (1s)", color="red", fontsize=9, ha="right"
    )

    # Format y-axis to show readable values
    ax.set_yticks([0.01, 0.1, 1, 10, 100])
    ax.set_yticklabels(["10ms", "100ms", "1s", "10s", "100s"])

    # Format x-axis
    ax.set_xticks([1000, 3000, 10000, 30000, 50000, 200000])
    ax.set_xticklabels(["1K", "3K", "10K", "30K", "50K", "200K"])

    plt.tight_layout()

    # Save
    output_path = output_dir / "figure_a_scalability_wall.png"
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    print(f"✓ Figure A saved: {output_path}")

    plt.close()


def figure_b_realworld_performance(df, output_dir):
    """
    Figure B: Real-World Performance (Grouped Bar Chart)
    Shows performance on representative biological datasets.
    """
    # Select 5 representative real-world datasets
    selected_datasets = [
        "C. coli MLST",
        "Neisseria cgMLST",
        "S. aureus cgMLST",
        "Clostridium UPGMA",
        "Salmonella 100K",
    ]

    # Filter dataframe
    realworld_df = df[df["Dataset"].isin(selected_datasets)].copy()

    # Tools to compare
    tools = ["Force-Graph", "Cytoscape", "GrapeTree", "iTOL", "PhyloScape", "Phylotree"]

    # Prepare data for grouped bar chart
    datasets = realworld_df["Dataset"].values
    x = np.arange(len(datasets))
    width = 0.14  # Width of each bar

    # Create figure
    fig, ax = plt.subplots(figsize=(12, 6))

    # Plot bars for each tool
    for i, tool in enumerate(tools):
        if tool not in realworld_df.columns:
            continue

        times = realworld_df[tool].values
        offset = width * (i - len(tools) / 2 + 0.5)

        bars = ax.bar(
            x + offset,
            times,
            width,
            label=tool,
            color=TOOL_COLORS.get(tool, "gray"),
            alpha=0.85,
            edgecolor="black",
            linewidth=0.5,
        )

        # Add value labels on bars for Force-Graph (to highlight speed)
        if tool == "Force-Graph":
            for j, (bar, val) in enumerate(zip(bars, times)):
                if not np.isnan(val):
                    height = bar.get_height()
                    ax.text(
                        bar.get_x() + bar.get_width() / 2.0,
                        height,
                        f"{val:.2f}s",
                        ha="center",
                        va="bottom",
                        fontsize=8,
                        fontweight="bold",
                        color="darkgreen",
                    )

    # Add horizontal line at 1 second (interactive threshold)
    ax.axhline(y=1.0, color="red", linestyle="--", linewidth=2, alpha=0.8, zorder=10)
    ax.text(
        len(datasets) - 0.3,
        1.1,
        "Interactive Threshold (1s)",
        color="red",
        fontsize=10,
        fontweight="bold",
        ha="right",
        bbox=dict(
            boxstyle="round,pad=0.3", facecolor="white", edgecolor="red", alpha=0.8
        ),
    )

    # Labels and title
    ax.set_xlabel("Dataset", fontweight="bold", fontsize=12)
    ax.set_ylabel("Rendering Time (seconds)", fontweight="bold", fontsize=12)
    ax.set_title(
        "Figure B: Real-World Performance on Biological Datasets",
        fontweight="bold",
        pad=15,
        fontsize=13,
    )

    # X-axis
    ax.set_xticks(x)
    ax.set_xticklabels(datasets, rotation=15, ha="right")

    # Y-axis - use log scale to show full range
    ax.set_yscale("log")
    ax.set_ylim(0.01, 200)
    ax.set_yticks([0.01, 0.1, 1, 10, 100])
    ax.set_yticklabels(["10ms", "100ms", "1s", "10s", "100s"])

    # Grid
    ax.grid(True, alpha=0.3, axis="y", linestyle="--", linewidth=0.5)

    # Legend
    ax.legend(loc="upper left", ncol=2, framealpha=0.95, edgecolor="black")

    plt.tight_layout()

    # Save
    output_path = output_dir / "figure_b_realworld_performance.png"
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    print(f"✓ Figure B saved: {output_path}")

    plt.close()


def main():
    """Generate both thesis figures."""
    print("=" * 80)
    print("Thesis Figure Generator")
    print("=" * 80)
    print()

    # Load data
    print("Loading benchmark data...")
    df = load_benchmark_data()
    print(f"✓ Loaded {len(df)} datasets")
    print()

    # Output directory
    output_dir = Path("../../results/figures")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate Figure A: Scalability Wall
    print("Generating Figure A: Scalability Wall (Log-Log Line Plot)...")
    figure_a_scalability_wall(df, output_dir)
    print()

    # Generate Figure B: Real-World Performance
    print("Generating Figure B: Real-World Performance (Grouped Bar Chart)...")
    figure_b_realworld_performance(df, output_dir)
    print()

    print("=" * 80)
    print("✓ All figures generated successfully!")
    print("=" * 80)
    print()
    print("LaTeX insertion code:")
    print()
    print("\\begin{figure}[htbp]")
    print("    \\centering")
    print(
        "    \\includegraphics[width=0.95\\textwidth]{../results/figures/figure_a_scalability_wall.png}"
    )
    print(
        "    \\caption{Scalability analysis showing algorithmic complexity differences."
    )
    print("             Force-Graph demonstrates $O(N)$ or better scaling, maintaining")
    print(
        "             sub-second performance up to 200K nodes. In contrast, traditional"
    )
    print("             tools like Cytoscape exhibit $O(N^2)$ behavior, with rendering")
    print("             times growing super-linearly.}")
    print("    \\label{fig:scalability_wall}")
    print("\\end{figure}")
    print()
    print("\\begin{figure}[htbp]")
    print("    \\centering")
    print(
        "    \\includegraphics[width=0.95\\textwidth]{../results/figures/figure_b_realworld_performance.png}"
    )
    print("    \\caption{Performance comparison on representative biological datasets.")
    print(
        "             The red dashed line at 1 second marks the interactive usability"
    )
    print(
        "             threshold. Force-Graph consistently achieves sub-second performance,"
    )
    print(
        "             while established tools frequently exceed this threshold, particularly"
    )
    print("             on large cgMLST datasets.}")
    print("    \\label{fig:realworld_performance}")
    print("\\end{figure}")


if __name__ == "__main__":
    main()
