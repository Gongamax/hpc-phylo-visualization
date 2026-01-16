import csv
import sys
import re
from pathlib import Path


def clean_label(label):
    """Remove branch lengths, quotes, and comments."""
    if ":" in label:
        label = label.split(":")[0]
    label = label.strip().strip("'").strip('"')
    label = re.sub(r"\[.*?\]", "", label)  # remove comments
    return label


def newick_to_edge_list_fast(newick_path, output_csv):
    # Load and sanitize Newick
    with open(newick_path, "r") as f:
        newick = f.read().strip()

    # Remove whitespace
    newick = "".join(newick.split())

    node_counter = 0
    stack = []
    edges = []
    current_label = ""

    def new_node():
        nonlocal node_counter
        node_counter += 1
        return f"internal_{node_counter}"

    for char in newick:
        if char == "(":
            node = new_node()

            # If root-level leaf appeared before the first "("
            if current_label.strip():
                root_label = clean_label(current_label)
                edges.append([node, root_label])
                current_label = ""

            if stack:
                edges.append([stack[-1], node])
            stack.append(node)

        elif char == ",":
            if current_label.strip():
                leaf = clean_label(current_label)
                edges.append([stack[-1], leaf])
                current_label = ""

        elif char == ")":
            if current_label.strip():
                leaf = clean_label(current_label)
                edges.append([stack[-1], leaf])
                current_label = ""
            last_node = stack.pop()

        elif char == ";":
            if current_label.strip():
                leaf = clean_label(current_label)

                # If this happens at top-level
                if stack:
                    edges.append([stack[-1], leaf])
                else:
                    root = new_node()
                    edges.append([root, leaf])

        else:
            current_label += char

    # Write CSV
    with open(output_csv, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["source", "target"])
        writer.writerows(edges)

    print(f"Saved {len(edges)} edges to {output_csv}")


if __name__ == "__main__":
    # If arguments provided, use them (backward compatibility)
    if len(sys.argv) >= 3:
        newick_path = sys.argv[1]
        output_csv = sys.argv[2]
        newick_to_edge_list_fast(newick_path, output_csv)
    else:
        # Auto-discover mode: find all .newick files in data/ and convert them
        data_dir = Path(__file__).parent.parent / "data"

        if not data_dir.exists():
            print(f"Error: data directory not found at {data_dir}")
            sys.exit(1)

        # Find all .newick and .nwk files recursively
        newick_files = list(data_dir.rglob("*.newick")) + list(data_dir.rglob("*.nwk"))

        if not newick_files:
            print(f"No .newick or .nwk files found in {data_dir}")
            sys.exit(0)

        print(f"Found {len(newick_files)} Newick file(s) in {data_dir}")
        print("Converting...\n")

        converted = []
        failed = []

        for newick_path in newick_files:
            # Generate output path: same directory, append _edgelist.csv
            output_csv = newick_path.parent / f"{newick_path.stem}_edgelist.csv"

            try:
                newick_to_edge_list_fast(str(newick_path), str(output_csv))
                converted.append((newick_path, output_csv))
            except Exception as e:
                print(f"Error converting {newick_path}: {e}")
                failed.append((newick_path, str(e)))

        # Summary
        print("\n" + "=" * 60)
        print(f"Conversion complete: {len(converted)} successful, {len(failed)} failed")
        print("=" * 60)

        if converted:
            print("\nSuccessfully converted:")
            for inp, out in converted:
                print(f"  {inp.relative_to(data_dir)} -> {out.name}")

        if failed:
            print("\nFailed conversions:")
            for inp, err in failed:
                print(f"  {inp.relative_to(data_dir)}: {err}")
