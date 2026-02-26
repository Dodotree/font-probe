const FontProbe = window.FontProbeLib?.FontProbe;

if (!FontProbe) {
  throw new Error("font-probe browser bundle did not load.");
}

const previewText = "The quick brown fox jumps over the lazy dog 1234567890";

const input = document.getElementById("fontInput");
const button = document.getElementById("probeButton");
const preview = document.getElementById("preview");
const results = document.getElementById("results");

if (!input || !button || !preview || !results) {
  throw new Error("Missing required DOM nodes for the example page.");
}

new FontProbe();

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toQuotedFamily(name) {
  const escaped = String(name).replaceAll('"', "\\\"");
  return `"${escaped}"`;
}

function render() {
  const rawList = String(input.value || "").trim();
  const candidates = FontProbe.splitFontFamilyList(rawList);

  preview.textContent = previewText;
  preview.style.fontFamily = rawList || "sans-serif";

  if (!candidates.length) {
    results.innerHTML = '<div class="muted">No font names provided.</div>';
    return;
  }

  const grouped = {
    available: [],
    generic: [],
    "not rendering": [],
    "not found": [],
  };

  for (const rawName of candidates) {
    const name = FontProbe.cleanFontCandidate(rawName);
    if (!name) {
      continue;
    }

    const signal = FontProbe.getFontDistinctSignal(name);
    const key = signal.label;
    if (!Object.hasOwn(grouped, key)) {
      grouped["not rendering"].push(name);
      continue;
    }

    grouped[key].push(name);
  }

  const sections = [];

  if (grouped.available.length) {
    const rows = grouped.available
      .map((name) => {
        const escapedName = escapeHtml(name);
        const styleFamily = `${toQuotedFamily(name)}, sans-serif`;
        return `
          <div class="available-row">
            <div class="available-name">${escapedName}</div>
            <div class="available-sample" style="font-family: ${escapeHtml(styleFamily)}">${escapeHtml(previewText)}</div>
          </div>
        `;
      })
      .join("");

    sections.push(`
      <div class="group">
        <div class="group-title">available</div>
        ${rows}
      </div>
    `);
  }

  const genericLine = grouped.generic.length
    ? `generic: ${grouped.generic.join(", ")}`
    : "generic: -";
  const notRenderingLine = grouped["not rendering"].length
    ? `not rendering: ${grouped["not rendering"].join(", ")}`
    : "not rendering: -";
  const notFoundLine = grouped["not found"].length
    ? `not found: ${grouped["not found"].join(", ")}`
    : "not found: -";

  sections.push(`
    <div class="group">
      <div class="group-title">others</div>
      <div>${escapeHtml(genericLine)}</div>
      <div>${escapeHtml(notRenderingLine)}</div>
      <div>${escapeHtml(notFoundLine)}</div>
    </div>
  `);

  results.innerHTML = sections.join("");
}

button.addEventListener("click", render);
input.addEventListener("input", render);

render();
