args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 2) {
  stop("usage: ggtree_render.R <input.newick> <output.pdf>")
}

if (!requireNamespace("ape", quietly = TRUE)) {
  stop("missing R package: ape")
}
if (!requireNamespace("ggtree", quietly = TRUE)) {
  stop("missing R package: ggtree")
}
if (!requireNamespace("ggplot2", quietly = TRUE)) {
  stop("missing R package: ggplot2")
}

input_path <- args[[1]]
output_path <- args[[2]]
dir.create(dirname(output_path), showWarnings = FALSE, recursive = TRUE)

total_start <- proc.time()[["elapsed"]]
parse_start <- proc.time()[["elapsed"]]
tree <- ape::read.tree(input_path)
parse_ms <- (proc.time()[["elapsed"]] - parse_start) * 1000

nodes <- length(tree$tip.label) + tree$Nnode
edges <- nrow(tree$edge)

render_start <- proc.time()[["elapsed"]]
plot <- ggtree::ggtree(tree)
ggplot2::ggsave(output_path, plot = plot, width = 12, height = 8, units = "in")
render_ms <- (proc.time()[["elapsed"]] - render_start) * 1000

memory_mb <- as.numeric(gc()[, "max used"][2]) * 8 / 1024 / 1024

cat(jsonlite::toJSON(list(
  nodes = nodes,
  edges = edges,
  load_ms = 0,
  parse_ms = parse_ms,
  render_ms = render_ms,
  total_ms = (proc.time()[["elapsed"]] - total_start) * 1000,
  memory_mb = memory_mb,
  render_artifact = output_path,
  rendered = file.exists(output_path) && file.info(output_path)$size > 0
), auto_unbox = TRUE))
