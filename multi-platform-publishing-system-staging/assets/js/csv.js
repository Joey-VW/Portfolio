export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => String(cell || "").trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    if (row.some((cell) => String(cell || "").trim())) rows.push(row);
  }

  return rows;
}

export function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/^./, (first) => first.toLowerCase());
}

export function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);

  return rows.slice(1).map((row, index) => {
    const item = { rowNumber: index + 2 };
    headers.forEach((header, columnIndex) => {
      item[header] = String(row[columnIndex] || "").trim();
    });
    return item;
  });
}

export function getCell(row, names, fallback = "") {
  for (const name of names) {
    const normalized = normalizeHeader(name);
    const value = row[normalized];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback;
}

export function isVisibleValue(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;
  return !["false", "no", "n", "0", "hide", "hidden", "draft", "unpublished"].includes(text);
}

export async function loadCsvObjects(url, options = {}) {
  if (!url) return [];
  const cacheBust = options.cacheBust ?? true;
  const separator = url.includes("?") ? "&" : "?";
  const resolvedUrl = cacheBust ? `${url}${separator}cacheBust=${Date.now()}` : url;
  const response = await fetch(resolvedUrl);
  if (!response.ok) throw new Error(`Could not load CSV: ${response.status}`);
  const text = await response.text();
  return rowsToObjects(parseCsv(text));
}
