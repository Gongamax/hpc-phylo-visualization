#!/usr/bin/env python
"""
visualize_benchmarks.py

Creates publication-quality visualizations from comprehensive benchmark results.
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path

# Setup
RESULTS_DIR = Path(__file__).parent.parent.parent / "results"
INPUT_FILE = RESULTS_DIR / "benchmark_tables" / "comprehensive_benchmark_results.csv"
FIGURES_DIR = RESULTS_DIR / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

# Set style for publication-quality plots
sns.set_style("whitegrid")
plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.size"] = 10
plt.rcParams["figure.dpi"] = 300


def parse_time(time_str):
    """Convert time string (e.g., '1.5 s', '500 ms') to milliseconds"""
    if pd.isna(time_str) or time_str == "..." or time_str == "N/A":
        return np.nan

    time_str = str(time_str).strip()
    if "s" in time_str:
        if "ms" in time_str:
            return float(time_str.replace("ms", "").strip())
        else:
            return float(time_str.replace("s", "").strip()) * 1000
    return float(time_str)


def load_data():
    """Load and parse the comprehensive benchmark results"""
    df = pd.read_csv(INPUT_FILE)

    # Parse all time columns
    for col in df.columns[1:]:  # Skip 'Datasets' column
        df[col] = df[col].apply(parse_time)

    return df


def plot_tool_comparison_by_size():
    """Create a bar chart comparing tools across different dataset sizes"""
    df = load_data()

    # Filter for simulated datasets with clear sizes
    size_datasets = {
        "1K": (
            df[df["Datasets"].str.contains("1K", case=False, na=False)].iloc[0]
            if len(df[df["Datasets"].str.contains("1K", case=False, na=False)]) > 0
            else None
        ),
        "3K": (
            df[df["Datasets"].str.contains("3K", case=False, na=False)].iloc[0]
            if len(df[df["Datasets"].str.contains("3K", case=False, na=False)]) > 0
            else None
        ),
        "10K": (
            df[df["Datasets"].str.contains("10K", case=False, na=False)].iloc[0]
            if len(df[df["Datasets"].str.contains("10K", case=False, na=False)]) > 0
            else None
        ),
        "30K": (
            df[df["Datasets"].str.contains("30K", case=False, na=False)].iloc[0]
            if len(df[df["Datasets"].str.contains("30K", case=False, na=False)]) > 0
            else None
        ),
        "50K": (
            df[df["Datasets"].str.contains("50K", case=False, na=False)].iloc[0]
            if len(df[df["Datasets"].str.contains("50K", case=False, na=False)]) > 0
            else None
        ),
    }

    # Remove None entries
    size_datasets = {k: v for k, v in size_datasets.items() if v is not None}

    if not size_datasets:
        print("⚠️  No size-based datasets found for comparison")
        return

    # Get tools (columns except 'Datasets')
    tools = [col for col in df.columns if col != "Datasets"]

    # Prepare data for plotting
    sizes = list(size_datasets.keys())

    fig, ax = plt.subplots(figsize=(12, 6))

    x = np.arange(len(sizes))
    width = 0.12
    colors = plt.cm.Set3(np.linspace(0, 1, len(tools)))

    for i, tool in enumerate(tools):
        values = [
            (
                size_datasets[size][tool] / 1000
                if not pd.isna(size_datasets[size][tool])
                else 0
            )
            for size in sizes
        ]
        ax.bar(x + i * width, values, width, label=tool, color=colors[i])

    ax.set_xlabel("Dataset Size (Nodes)", fontweight="bold")
    ax.set_ylabel("Render Time (seconds)", fontweight="bold")
    ax.set_title(
        "Performance Comparison Across Dataset Sizes", fontweight="bold", fontsize=14
    )
    ax.set_xticks(x + width * (len(tools) - 1) / 2)
    ax.set_xticklabels(sizes)
    ax.legend(loc="upper left", frameon=True, fancybox=True)
    ax.grid(axis="y", alpha=0.3)

    plt.tight_layout()
    plt.savefig(
        FIGURES_DIR / "tool_comparison_by_size.png", dpi=300, bbox_inches="tight"
    )
    print(f"✅ Saved: {FIGURES_DIR / 'tool_comparison_by_size.png'}")
    plt.close()


def plot_heatmap():
    """Create a heatmap showing performance across all tools and datasets"""
    df = load_data()

    # Limit to top 15 datasets for readability
    df_plot = df.head(15).copy()

    # Set datasets as index
    df_plot = df_plot.set_index("Datasets")

    # Convert to seconds for better readability
    df_plot = df_plot / 1000

    fig, ax = plt.subplots(figsize=(10, 8))

    # Create heatmap with log scale
    sns.heatmap(
        df_plot,
        annot=True,
        fmt=".1f",
        cmap="YlOrRd",
        cbar_kws={"label": "Time (seconds)"},
        ax=ax,
        linewidths=0.5,
        square=False,
    )

    ax.set_title(
        "Performance Heatmap (Top 15 Datasets)", fontweight="bold", fontsize=14
    )
    ax.set_xlabel("Tools", fontweight="bold")
    ax.set_ylabel("Datasets", fontweight="bold")

    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "performance_heatmap.png", dpi=300, bbox_inches="tight")
    print(f"✅ Saved: {FIGURES_DIR / 'performance_heatmap.png'}")
    plt.close()


def plot_scalability():
    """Create a line plot showing scalability with dataset size"""
    df = load_data()

    # Extract simulated datasets with sizes
    simulated = df[df["Datasets"].str.contains("K", case=False, na=False)].copy()

    if len(simulated) == 0:
        print("⚠️  No simulated datasets found for scalability plot")
        return

    # Extract size numbers
    def extract_size(name):
        import re

        match = re.search(r"(\d+)K", str(name), re.IGNORECASE)
        if match:
            return int(match.group(1))
        return None

    simulated["Size"] = simulated["Datasets"].apply(extract_size)
    simulated = simulated.dropna(subset=["Size"])
    simulated = simulated.sort_values("Size")

    if len(simulated) == 0:
        print("⚠️  Could not extract sizes from datasets")
        return

    # Get tools
    tools = [col for col in df.columns if col != "Datasets"]

    fig, ax = plt.subplots(figsize=(10, 6))

    colors = plt.cm.Set2(np.linspace(0, 1, len(tools)))

    for i, tool in enumerate(tools):
        values = simulated[tool] / 1000  # Convert to seconds
        ax.plot(
            simulated["Size"],
            values,
            marker="o",
            linewidth=2,
            label=tool,
            color=colors[i],
            markersize=8,
        )

    ax.set_xlabel("Dataset Size (K nodes)", fontweight="bold")
    ax.set_ylabel("Render Time (seconds)", fontweight="bold")
    ax.set_title("Scalability Analysis", fontweight="bold", fontsize=14)
    ax.legend(loc="best", frameon=True, fancybox=True)
    ax.grid(True, alpha=0.3)
    ax.set_yscale("log")

    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "scalability_analysis.png", dpi=300, bbox_inches="tight")
    print(f"✅ Saved: {FIGURES_DIR / 'scalability_analysis.png'}")
    plt.close()


def plot_median_performance():
    """Create a bar chart of median performance per tool"""
    df = load_data()

    # Calculate median for each tool (excluding NaN)
    tools = [col for col in df.columns if col != "Datasets"]
    medians = {}

    for tool in tools:
        median_val = df[tool].median()
        if not pd.isna(median_val):
            medians[tool] = median_val / 1000  # Convert to seconds

    if not medians:
        print("⚠️  No median data available")
        return

    # Sort by median
    sorted_tools = sorted(medians.items(), key=lambda x: x[1])

    fig, ax = plt.subplots(figsize=(10, 6))

    tools_sorted = [t[0] for t in sorted_tools]
    values_sorted = [t[1] for t in sorted_tools]

    colors = plt.cm.viridis(np.linspace(0.3, 0.9, len(tools_sorted)))
    bars = ax.barh(tools_sorted, values_sorted, color=colors)

    ax.set_xlabel("Median Render Time (seconds)", fontweight="bold")
    ax.set_title(
        "Overall Performance Comparison (Median)", fontweight="bold", fontsize=14
    )
    ax.grid(axis="x", alpha=0.3)

    # Add value labels
    for i, bar in enumerate(bars):
        width = bar.get_width()
        ax.text(
            width,
            bar.get_y() + bar.get_height() / 2,
            f"{width:.2f}s",
            ha="left",
            va="center",
            fontsize=9,
            fontweight="bold",
        )

    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "median_performance.png", dpi=300, bbox_inches="tight")
    print(f"✅ Saved: {FIGURES_DIR / 'median_performance.png'}")
    plt.close()


if __name__ == "__main__":
    print("📊 Generating benchmark visualizations...\n")

    print("1️⃣  Creating tool comparison by size...")
    plot_tool_comparison_by_size()

    print("2️⃣  Creating performance heatmap...")
    plot_heatmap()

    print("3️⃣  Creating scalability analysis...")
    plot_scalability()

    print("4️⃣  Creating median performance comparison...")
    plot_median_performance()

    print(f"\n✅ All visualizations saved to: {FIGURES_DIR}")
    print("🎉 Done! Use these in your thesis!")
