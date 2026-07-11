#!/usr/bin/env python3
"""
Create thesis-friendly figures from eval/results/summary.csv.

Outputs:
  eval/figures/scalability_total_time.png
  eval/figures/time_memory_tradeoff.png
  eval/figures/real_dataset_total_time.png
"""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".matplotlib-cache"))
os.environ.setdefault("XDG_CACHE_HOME", str(ROOT / ".cache"))
os.environ.setdefault("MPLBACKEND", "Agg")
(ROOT / ".matplotlib-cache").mkdir(exist_ok=True)
(ROOT / ".cache").mkdir(exist_ok=True)

try:
    import matplotlib.pyplot as plt
    import pandas as pd
except ModuleNotFoundError as exc:
    missing = exc.name
    raise SystemExit(
        f"Missing Python package '{missing}'. Install plotting dependencies with:\n"
        f"  python3 -m pip install -r {Path(__file__).resolve().parent / 'requirements.txt'}"
    ) from exc


SUMMARY_CSV = ROOT / "results" / "summary.csv"
FIGURE_DIR = ROOT / "figures"

COLORS = {
    "3d-force-graph": "#1f77b4",
    "Phylotree.js": "#d62728",
    "GraphGL": "#ff7f0e",
    "Sigma.js": "#2ca02c",
}

MARKERS = {
    "3d-force-graph": "s",
    "Phylotree.js": "o",
    "GraphGL": "^",
    "Sigma.js": "D",
}


def configure_matplotlib():
    plt.rcParams.update(
        {
            "font.family": "serif",
            "font.size": 10,
            "axes.labelsize": 11,
            "axes.titlesize": 12,
            "legend.fontsize": 9,
            "figure.dpi": 140,
            "savefig.dpi": 300,
        }
    )


def load_summary():
    if not SUMMARY_CSV.exists():
        raise FileNotFoundError(f"Run the benchmark first: {SUMMARY_CSV} does not exist")

    df = pd.read_csv(SUMMARY_CSV)
    df = df[df["successful_runs"] > 0].copy()
    df["median_total_s"] = df["median_total_ms"] / 1000
    return df


def plot_scalability(df):
    synthetic = df[df["dataset_group"] == "synthetic"].sort_values("nodes")
    if synthetic.empty:
        return

    fig, ax = plt.subplots(figsize=(6.2, 3.8))

    for tool, group in synthetic.groupby("tool"):
        group = group.sort_values("nodes")
        ax.plot(
            group["nodes"],
            group["median_total_s"],
            marker=MARKERS.get(tool, "o"),
            color=COLORS.get(tool),
            linewidth=1.8,
            markersize=5,
            label=tool,
        )

    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("Tree size (nodes)")
    ax.set_ylabel("Median total time (s)")
    ax.grid(True, which="both", linestyle=":", linewidth=0.7, alpha=0.7)
    ax.legend(frameon=True)
    fig.tight_layout()
    fig.savefig(FIGURE_DIR / "scalability_total_time.png")
    plt.close(fig)


def plot_time_memory_tradeoff(df):
    memory = df.dropna(subset=["median_heap_delta_mb"]).copy()
    if memory.empty:
        return

    fig, ax_time = plt.subplots(figsize=(6.2, 3.8))
    ax_memory = ax_time.twinx()

    pivot = memory.sort_values(["nodes", "tool"])
    labels = [f"{row.tool}\n{row.dataset}" for row in pivot.itertuples()]
    x = range(len(pivot))

    ax_time.plot(
        x,
        pivot["median_total_ms"],
        color="#1f77b4",
        marker="s",
        linewidth=1.7,
        label="median total time",
    )
    ax_memory.plot(
        x,
        pivot["median_heap_delta_mb"],
        color="#d62728",
        marker="o",
        linewidth=1.7,
        label="median heap delta",
    )

    ax_time.set_ylabel("Median total time (ms)", color="#1f77b4")
    ax_memory.set_ylabel("Median heap delta (MB)", color="#d62728")
    ax_time.tick_params(axis="x", labelrotation=45)
    ax_time.set_xticks(list(x), labels, ha="right")
    ax_time.grid(True, axis="y", linestyle=":", linewidth=0.7, alpha=0.7)

    lines = ax_time.get_lines() + ax_memory.get_lines()
    ax_time.legend(lines, [line.get_label() for line in lines], loc="upper left")
    fig.tight_layout()
    fig.savefig(FIGURE_DIR / "time_memory_tradeoff.png")
    plt.close(fig)


def plot_real_datasets(df):
    real = df[df["dataset_group"] == "real"].copy()
    if real.empty:
        return

    fig, ax = plt.subplots(figsize=(6.2, 3.8))
    pivot = real.pivot_table(index="dataset", columns="tool", values="median_total_s")
    pivot.plot(kind="bar", ax=ax, color=[COLORS.get(column) for column in pivot.columns])

    ax.set_xlabel("")
    ax.set_ylabel("Median total time (s)")
    ax.grid(True, axis="y", linestyle=":", linewidth=0.7, alpha=0.7)
    ax.legend(title="")
    fig.tight_layout()
    fig.savefig(FIGURE_DIR / "real_dataset_total_time.png")
    plt.close(fig)


def main():
    configure_matplotlib()
    FIGURE_DIR.mkdir(parents=True, exist_ok=True)
    df = load_summary()

    plot_scalability(df)
    plot_time_memory_tradeoff(df)
    plot_real_datasets(df)

    print(f"Wrote figures to {FIGURE_DIR}")


if __name__ == "__main__":
    main()
