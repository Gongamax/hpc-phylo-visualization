#!/usr/bin/env python
"""
csv_to_latex.py

Converts the comprehensive benchmark CSV to a LaTeX table.
"""

import pandas as pd
from pathlib import Path

RESULTS_DIR = Path(__file__).parent.parent.parent / "results"
INPUT_FILE = RESULTS_DIR / "benchmark_tables" / "comprehensive_benchmark_results.csv"
OUTPUT_FILE = RESULTS_DIR / "benchmark_tables" / "benchmark_table.tex"


def main():
    # Read CSV
    df = pd.read_csv(INPUT_FILE)

    # Limit to top datasets for readability (or all if you want)
    print(f"Total datasets: {len(df)}")
    choice = input("Show all datasets? (y/n, default=top 20): ").strip().lower()

    if choice == "y":
        df_display = df
    else:
        df_display = df.head(20)

    # Shorten column names for table
    df_display = df_display.rename(
        columns={
            "3d-force-graph (2D)": "Force-Graph",
            "Cytoscape.js": "Cytoscape",
            "GrapeTree": "GrapeTree",
            "PhyloScape": "PhyloScape",
            "Phylotree.js": "Phylotree",
            "iTOL": "iTOL",
        }
    )

    # Generate LaTeX
    latex = []
    latex.append(r"\begin{table}[htbp]")
    latex.append(r"    \centering")
    latex.append(
        r"    \caption{Performance benchmark results for phylogenetic visualization tools. Times shown are median render times across 7 runs.}"
    )
    latex.append(r"    \label{tab:benchmark_results}")
    latex.append(r"    \small")
    latex.append(r"    \begin{tabular}{l" + "r" * (len(df_display.columns) - 1) + "}")
    latex.append(r"        \toprule")

    # Header
    header = (
        " & ".join([col.replace("_", r"\_") for col in df_display.columns]) + r" \\"
    )
    latex.append(f"        {header}")
    latex.append(r"        \midrule")

    # Rows
    for _, row in df_display.iterrows():
        dataset = str(row["Datasets"]).replace("_", r"\_")
        values = [str(v) if pd.notna(v) and v != "..." else "---" for v in row[1:]]
        row_str = f"        {dataset} & " + " & ".join(values) + r" \\"
        latex.append(row_str)

    latex.append(r"        \bottomrule")
    latex.append(r"    \end{tabular}")
    latex.append(r"\end{table}")

    # Write to file
    latex_str = "\n".join(latex)
    OUTPUT_FILE.write_text(latex_str)

    print(f"\n✅ LaTeX table saved to: {OUTPUT_FILE}")
    print("\nTo use in your thesis:")
    print("1. Add to preamble: \\usepackage{booktabs}")
    print(
        "2. Insert in document: \\input{../results/benchmark_tables/benchmark_table.tex}"
    )
    print("\nOr copy the table code directly from the .tex file!")


if __name__ == "__main__":
    main()
