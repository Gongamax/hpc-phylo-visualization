import { parse as parseNewick } from "@vibbioinfocore/phylio";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const simpleNewick = "((A:0.1,B:0.2):0.3,C:0.4);";
const result = parseNewick(simpleNewick);

console.log("Phylio output structure:");
console.log(JSON.stringify(result, null, 2));

const haemophilusNewickPath = join(
  __dirname,
  "../../data/pubmlst/haemophilus_influenzae/haemophilus_influenzae-MLST_tree.newick"
);

try {
  const newickString = readFileSync(haemophilusNewickPath, "utf-8");
  console.log(`\nLoaded newick file: ${newickString.length} characters`);

  console.log("Parsing with phylio...");
  const startTime = performance.now();
  const haemophilusData = parseNewick(newickString);
  const endTime = performance.now();

  console.log(`Parse time: ${(endTime - startTime).toFixed(2)}ms`);
  console.log("H. influenzae MLST Phylio output (first 500 chars):");
  console.log(JSON.stringify(haemophilusData, null, 2).substring(0, 500));
} catch (error) {
  console.error("Error loading H. influenzae Newick file:", error);
}
