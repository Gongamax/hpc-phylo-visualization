#!/usr/bin/env python3
"""
Generate thesis-ready CSV and LaTeX tables from eval/results/summary.csv.
"""

from pathlib import Path

try:
    import pandas as pd
except ModuleNotFoundError as exc:
    raise SystemExit(
        f"Missing Python package '{exc.name}'. Install dependencies with:\n"
        f"  python3 -m pip install -r {Path(__file__).resolve().parent / 'requirements.txt'}"
    ) from exc


ROOT = Path(__file__).resolve().parent
SUMMARY_CSV = ROOT / "results" / "summary.csv"
TABLE_DIR = ROOT / "tables"


def format_ms(value):
    if pd.isna(value):
        return "---"
    if value >= 1000:
        return f"{value / 1000:.2f} s"
    return f"{value:.1f} ms"


def build_performance_table(df):
    table = df.copy()
    table["failure_kinds"] = table["failure_kinds"].fillna("---").replace("", "---")
    table["Success"] = table["successful_runs"].astype(str) + "/" + table["runs"].astype(str)
    table["Validated"] = table["validated_runs"].astype(str) + "/" + table["runs"].astype(str)
    table["Total"] = table["median_total_ms"].apply(format_ms)
    table["Render"] = table["median_render_ms"].apply(format_ms)
    table["Memory"] = table["median_heap_delta_mb"].apply(
        lambda value: "---" if pd.isna(value) else f"{value:.1f} MB"
    )

    return table[
        [
            "tool",
            "dataset",
            "nodes",
            "edges",
            "Success",
            "Validated",
            "Total",
            "Render",
            "Memory",
            "failure_kinds",
        ]
    ].rename(
        columns={
            "tool": "Tool",
            "dataset": "Dataset",
            "nodes": "Nodes",
            "edges": "Edges",
            "failure_kinds": "Failures",
        }
    )


def build_capability_table(df):
    successful = df[df["successful_runs"] > 0].copy()
    if successful.empty:
        return pd.DataFrame(
            columns=["Tool", "Datasets attempted", "Datasets rendered", "Max nodes rendered", "Median total at max"]
        )

    rows = []
    for tool, group in df.groupby("tool"):
        ok = group[group["successful_runs"] > 0].sort_values("nodes")
        max_row = ok.iloc[-1] if not ok.empty else None
        rows.append(
            {
                "Tool": tool,
                "Datasets attempted": len(group),
                "Datasets rendered": len(ok),
                "Max nodes rendered": int(max_row["nodes"]) if max_row is not None and not pd.isna(max_row["nodes"]) else 0,
                "Median total at max": format_ms(max_row["median_total_ms"]) if max_row is not None else "---",
            }
        )

    return pd.DataFrame(rows)


def write_table(name, table):
    csv_path = TABLE_DIR / f"{name}.csv"
    tex_path = TABLE_DIR / f"{name}.tex"

    table.to_csv(csv_path, index=False)
    tex_path.write_text(to_latex_table(table), encoding="utf8")


def latex_escape(value):
    text = str(value)
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    for raw, escaped in replacements.items():
      text = text.replace(raw, escaped)
    return text


def to_latex_table(table):
    columns = list(table.columns)
    alignment = "l" * len(columns)
    lines = [
        rf"\begin{{tabular}}{{{alignment}}}",
        r"\hline",
        " & ".join(latex_escape(column) for column in columns) + r" \\",
        r"\hline",
    ]

    for _, row in table.iterrows():
        lines.append(" & ".join(latex_escape(row[column]) for column in columns) + r" \\")

    lines.extend([r"\hline", r"\end{tabular}", ""])
    return "\n".join(lines)


def main():
    if not SUMMARY_CSV.exists():
        raise FileNotFoundError(f"Run the benchmark first: {SUMMARY_CSV} does not exist")

    TABLE_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(SUMMARY_CSV)

    write_table("performance_summary", build_performance_table(df))
    write_table("tool_capability", build_capability_table(df))
    print(f"Wrote tables to {TABLE_DIR}")


if __name__ == "__main__":
    main()
