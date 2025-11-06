import os
import json
import csv
from ete3 import Tree

# Caminho base dos dados
BASE_DIR = "../data"

# Caminho do CSV de output
OUTPUT_FILE = "../results/dataset_summary.csv"

# Cabeçalhos do CSV
HEADER = [
    "Dataset", "Source", "Scheme", "Profiles",
    "Nodes", "Edges", "Download Date", "Notes"
]

def extract_metadata(metadata_path):
    """Lê ficheiro metadata.json se existir."""
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            return json.load(f)
    return {}

def count_tree_nodes_edges(tree_path):
    """Conta número de nós e arestas a partir de ficheiro Newick."""
    try:
        t = Tree(tree_path)
        num_nodes = len(t)
        num_edges = num_nodes - 1
        return num_nodes, num_edges
    except Exception as e:
        print(f"Erro ao processar {tree_path}: {e}")
        return None, None

def main():
    results = []
    for root, dirs, files in os.walk(BASE_DIR):
        for file in files:
            if file.endswith(".nwk") or file.endswith(".tree"):
                tree_path = os.path.join(root, file)
                metadata_path = os.path.join(root, "metadata.json")
                meta = extract_metadata(metadata_path)

                num_nodes, num_edges = count_tree_nodes_edges(tree_path)
                if num_nodes is None:
                    continue

                results.append({
                    "Dataset": meta.get("name", os.path.basename(root)),
                    "Source": meta.get("source", "Unknown"),
                    "Scheme": meta.get("scheme", "Unknown"),
                    "Profiles": meta.get("profiles", "Unknown"),
                    "Nodes": num_nodes,
                    "Edges": num_edges,
                    "Download Date": meta.get("download_date", "Unknown"),
                    "Notes": meta.get("notes", ""),
                })

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=HEADER)
        writer.writeheader()
        writer.writerows(results)

    print(f"✅ Dataset summary generated at: {OUTPUT_FILE}")
    print(f"Total datasets processed: {len(results)}")

if __name__ == "__main__":
    main()

