import { parse as parseNewick } from "@vibbioinfocore/phylio";

const simpleNewick = "((A:0.1,B:0.2):0.3,C:0.4);";
const result = parseNewick(simpleNewick);

console.log("Phylio output structure:");
console.log(JSON.stringify(result, null, 2));
