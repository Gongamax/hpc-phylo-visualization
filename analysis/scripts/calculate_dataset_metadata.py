import os
import csv
import argparse
from pathlib import Path
from collections import defaultdict


def analyze_mlst_file(file_path):
    """
    Analyze an MLST/cgMLST file to extract profile length and distinct elements.
    Robustly handles both Profile Definitions and Isolate Datasets.
    """
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f, delimiter="\t")
            header = next(reader)

            # --- FIX 1: Normalize headers to handle case sensitivity ---
            # e.g., "st", "ST", "ST (MLST)"
            header_map = {h.lower(): i for i, h in enumerate(header)}

            # Try to find the ST column index dynamically
            st_col_index = -1
            possible_st_names = ["st", "st (mlst)", "sequence type", "profile"]

            for name in possible_st_names:
                if name in header_map:
                    st_col_index = header_map[name]
                    break

            # If we can't find an 'ST' column, fall back to column 0
            # (only if it looks like a profile file), or return error.
            if st_col_index == -1:
                # Warning: Assuming Col 0 is risky, but necessary fallback for some formats
                st_col_index = 0

            # --- FIX 2: Better Profile Length Calculation ---
            # Instead of guessing what ISN'T a locus, verify what IS excluded.
            # Add common metadata columns often found in MLST exports.
            metadata_cols = {
                "st",
                "st (mlst)",
                "sequence type",
                "clonal_complex",
                "cc",
                "species",
                "lineage",
                "mlst",
                "id",
                "strain",
                "isolate",
                "name",
                "country",
                "year",
                "source",
                "date",
                "alt_id",
            }

            # Count columns that are NOT in our exclusion list
            loci_columns = [col for col in header if col.lower() not in metadata_cols]
            profile_length = len(loci_columns)

            # --- Count distinct STs ---
            distinct_sts = set()
            total_isolates = 0

            for row in reader:
                if row:
                    # distinct_sts.add(row[0]) <--- OLD BUGGY WAY
                    if len(row) > st_col_index:
                        st_val = row[st_col_index].strip()
                        # Optional: Don't count "NA" or empty strings as a distinct Type
                        if st_val and st_val not in ["NA", "-", "?"]:
                            distinct_sts.add(st_val)
                    total_isolates += 1

            return profile_length, len(distinct_sts), total_isolates

    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
        return None, None, None


def find_dataset_files(datasets_dir):
    """
    Recursively find all MLST/cgMLST dataset files.
    Args:
        datasets_dir: Root directory containing datasets
    Returns:
        dict: Mapping of dataset name to file path
    """

    dataset_files = {}

    # PubMLST datasets

    pubmlst_dir = Path(datasets_dir) / "pubmlst"

    if pubmlst_dir.exists():
        for organism_dir in pubmlst_dir.iterdir():
            if organism_dir.is_dir():
                organism_name = organism_dir.name.replace("_", " ").title()
                # Look for MLST and cgMLST files
                for file_path in organism_dir.glob("*"):
                    if file_path.is_file():
                        if "MLST" in file_path.name and "cgMLST" not in file_path.name:
                            key = f"{organism_name} - MLST"
                            dataset_files[key] = file_path
                        elif "cgMLST" in file_path.name:
                            key = f"{organism_name} - cgMLST"
                            dataset_files[key] = file_path

    # EnteroBase datasets

    enterobase_dir = Path(datasets_dir) / "enterobase"
    if enterobase_dir.exists():
        # EnteroBase files are directly in the enterobase folder
        for file_path in enterobase_dir.glob("*.txt"):
            if file_path.is_file() and "scheme_data" in file_path.name:
                # Extract organism name from filename (e.g., clostridium_scheme_data.txt -> Clostridium)
                organism_name = file_path.stem.replace("_scheme_data", "").title()
                key = f"{organism_name} - cgMLST (EnteroBase)"
                dataset_files[key] = file_path

        # Also check for Salmonella TSV files
        for file_path in enterobase_dir.glob("salmonella*.tsv"):
            if file_path.is_file():
                # Extract size info from filename (e.g., salmonella-sample-10k.tsv)
                if "10k" in file_path.name.lower():
                    key = "Salmonella 10K - cgMLST (EnteroBase)"
                elif "50k" in file_path.name.lower():
                    key = "Salmonella 50K - cgMLST (EnteroBase)"
                else:
                    key = f"Salmonella - cgMLST (EnteroBase)"
                dataset_files[key] = file_path

    return dataset_files


def build_dataset_name_from_file(file_path):
    """Generate a human-friendly dataset name from a file path."""
    stem = file_path.stem
    return stem.replace("_", " ").replace("-", " ").title()


def get_dataset_files_from_input(input_path, default_datasets_dir):
    """Resolve dataset files from a specific file/directory or fallback default datasets dir."""
    if input_path is None:
        return find_dataset_files(default_datasets_dir)

    path = Path(input_path).expanduser().resolve()
    dataset_files = {}

    if path.is_file():
        dataset_files[build_dataset_name_from_file(path)] = path
        return dataset_files

    if path.is_dir():
        # If user points directly to the default datasets root, keep rich naming rules.
        if path.samefile(default_datasets_dir):
            return find_dataset_files(path)

        # Otherwise, analyze all files in the provided directory recursively.
        for file_path in sorted(path.rglob("*")):
            if file_path.is_file():
                key = build_dataset_name_from_file(file_path)
                if key in dataset_files:
                    key = f"{key} ({file_path.parent.name})"
                dataset_files[key] = file_path
        return dataset_files

    print(f"Path does not exist: {path}")
    return {}


def main(cli_path=None):
    """Main function to analyze all datasets and print results."""
    # Get workspace root
    script_dir = Path(__file__).parent
    workspace_root = script_dir.parent
    datasets_dir = workspace_root / "datasets"
    print("=" * 80)
    print("Dataset Metadata Calculator")
    print("=" * 80)
    print()
    # Find dataset files from CLI path (file/dir) or fallback default datasets dir
    dataset_files = get_dataset_files_from_input(cli_path, datasets_dir)
    if not dataset_files:
        print("No dataset files found!")
        return

    # Analyze each dataset
    results = []
    for dataset_name, file_path in sorted(dataset_files.items()):
        print(f"Analyzing: {dataset_name}")
        print(f"  File: {file_path}")
        profile_len, distinct_elements, total_isolates = analyze_mlst_file(file_path)
        if profile_len is not None:
            results.append(
                {
                    "dataset": dataset_name,
                    "file": str(file_path),
                    "profile_length": profile_len,
                    "distinct_elements": distinct_elements,
                    "total_isolates": total_isolates,
                }
            )
            print(f"  ✓ Profile Length: {profile_len} loci")
            print(f"  ✓ Distinct Elements: {distinct_elements:,} STs/CTs")
            print(f"  ✓ Total Isolates: {total_isolates:,}")
        else:
            print(f"  ✗ Failed to analyze")
        print()

    # Print summary table
    print("=" * 80)
    print("SUMMARY TABLE (LaTeX format)")
    print("=" * 80)
    print()

    for result in results:
        dataset = result["dataset"]
        typing_method = "cgMLST" if "cgMLST" in dataset else "MLST (7 loci)"
        profile_len = result["profile_length"]
        distinct = result["distinct_elements"]
        # Format organism name in italics
        organism = dataset.split(" - ")[0]

        if (
            "Campylobacter" in organism
            or "Haemophilus" in organism
            or "Neisseria" in organism
            or "Staphylococcus" in organism
            or "Streptococcus" in organism
            or "Clostridium" in organism
            or "Vibrio" in organism
            or "Salmonella" in organism
        ):
            organism_latex = f"\\textit{{{organism}}}"
        else:
            organism_latex = organism
        unit = "CTs" if "cgMLST" in dataset else "STs"

        print(
            f"{organism_latex} & {typing_method} & {profile_len} & "
            f"{distinct:,} {unit} & \\cite{{...}} \\\\"
        )
    print()
    print("=" * 80)

    # Save results to CSV for further analysis
    output_file = workspace_root / "results" / "dataset_metadata_calculated.csv"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "dataset",
                "profile_length",
                "distinct_elements",
                "total_isolates",
                "file",
            ],
        )
        writer.writeheader()
        writer.writerows(results)

    print(f"Results saved to: {output_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Analyze MLST/cgMLST dataset files and compute metadata."
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=None,
        help="Optional path to a dataset file or directory (defaults to workspace datasets folder).",
    )
    args = parser.parse_args()
    main(args.path)
