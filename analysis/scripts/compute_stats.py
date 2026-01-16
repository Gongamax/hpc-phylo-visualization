import os
import json
import csv
import re
from ete3 import Tree

# -----------------------
# Config
# -----------------------
BASE_DIR = "../data"
OUTPUT_FILE = "../results/dataset_summary.csv"
HEADER = [
    "Dataset", "Source", "Scheme", "Profiles",
    "Nodes", "Edges", "Download Date", "Notes"
]

# -----------------------
# Helper functions
# -----------------------
def extract_metadata(metadata_path):
    """Read metadata.json if it exists."""
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            return json.load(f)
    return {}

def clean_newick(filepath):
    """
    Read a Newick file and remove empty leaf nodes or dangling commas.
    Returns a cleaned Newick string (does not overwrite original file).
    """
    with open(filepath, "r") as f:
        newick = f.read().strip()

    # Remove double commas
    while ',,' in newick:
        newick = newick.replace(',,', ',')

    # Remove empty parentheses
    newick = re.sub(r'\(\s*\)', '', newick)

    # Remove trailing commas before closing parenthesis
    newick = re.sub(r',\)', ')', newick)

    # Remove leading commas after opening parenthesis
    newick = re.sub(r'\(,', '(', newick)

    return newick

def count_tree_nodes_edges(tree_path):
    """Load a Newick tree safely and count nodes and edges."""
    try:
        cleaned_newick = clean_newick(tree_path)
        t = Tree(cleaned_newick, format=1, quoted_node_names=True)
        num_profiles = len(t.get_leaves())   # actual number of profiles
        num_nodes = len(t)                    # total nodes including internal
        num_edges = num_nodes - 1

        return num_profiles, num_nodes, num_edges
    except Exception as e:
        print(f"❌ Error processing {tree_path}: {e}")
        return None, None, None

# -----------------------
# Main processing
# -----------------------
def main():
    results = []

    for root, dirs, files in os.walk(BASE_DIR):
        for file in files:
            if file.endswith((".nwk", ".tree", ".newick")):
                tree_path = os.path.join(root, file)
                metadata_path = os.path.join(root, "metadata.json")
                meta = extract_metadata(metadata_path)

                num_profiles, num_nodes, num_edges = count_tree_nodes_edges(tree_path)
                if num_nodes is None:
                    continue

                # Infer dataset name and source from folder structure
                relative_path = os.path.relpath(root, BASE_DIR)
                parts = relative_path.split(os.sep)
                dataset_name = meta.get("name", parts[-1] if parts else os.path.basename(root))
                source = meta.get("source", parts[0] if len(parts) > 0 else "Unknown")

                results.append({
                    "Dataset": dataset_name,
                    "Source": source,
                    "Scheme": meta.get("scheme", "Unknown"),
                    "Profiles": num_profiles,
                    "Nodes": num_nodes,
                    "Edges": num_edges,
                    "Download Date": meta.get("download_date", "Unknown"),
                    "Notes": meta.get("notes", ""),
                })

                print(f"✅ Processed {tree_path}")

    # Write CSV
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=HEADER)
        writer.writeheader()
        writer.writerows(results)

    print("\n✅ Dataset summary generated at:", OUTPUT_FILE)
    print(f"📊 Total datasets processed: {len(results)}")


if __name__ == "__main__":
    main()
