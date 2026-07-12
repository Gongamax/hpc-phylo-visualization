import fs from "node:fs";
import path from "node:path";

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function writeCsv(filePath, rows, columns) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const header = columns.join(",");
  const body = rows.map((row) => columns.map((column) => escapeCell(row[column])).join(","));
  fs.writeFileSync(filePath, [header, ...body].join("\n") + "\n");
}

export function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];

  const [headerLine, ...lines] = text.split(/\r?\n/);
  const headers = splitCsvLine(headerLine);
  return lines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index++;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value);
  return values;
}

export function appendCsv(filePath, row, columns) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, columns.join(",") + "\n");
  } else {
    const [header] = fs.readFileSync(filePath, "utf8").split(/\r?\n/, 1);
    if (header !== columns.join(",")) {
      throw new Error(
        `CSV schema mismatch for ${filePath}. Re-run without APPEND_RESULTS=1 or rebuild the file.`
      );
    }
  }

  fs.appendFileSync(filePath, columns.map((column) => escapeCell(row[column])).join(",") + "\n");
}
