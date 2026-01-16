from ete3 import Tree
import random


# Function to generate a random phylogenetic tree in Newick format
def generate_tree(n_leaves: int, output_file: str):
    print(f"Generating tree with {n_leaves:,} profiles...")

    # Generate a random tree topology
    t = Tree()
    t.populate(n_leaves, names_library=[f"Species_{i}" for i in range(1, n_leaves + 1)])

    # Assign random branch lengths
    for node in t.traverse():
        node.dist = round(random.uniform(0.001, 0.2), 4)

    # Write tree to Newick file
    newick_str = t.write(
        format=5
    )  # format=5 preserves internal node labels and branch lengths
    with open(output_file, "w") as f:
        f.write(newick_str)

    print(f"✅ Saved {n_leaves:,} leaf tree to {output_file}\n")


if __name__ == "__main__":
    generate_tree(500_000, "tree_500k.newick")

    print("All trees generated successfully!")
