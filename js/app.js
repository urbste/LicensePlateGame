const STORAGE_KEY = "french-plate-bingo";

let foundCodes = new Set();
let lastAddedCode = null;
let map = null;
let markerLayer = null;

const MARKER_COLORS = {
  current: "#0055a4",
  found: "#1f8a4c",
};

const inputEl = document.getElementById("dept-input");
const formEl = document.getElementById("entry-form");
const messageEl = document.getElementById("message");
const resultPanelEl = document.getElementById("result-panel");
const resultCodeEl = document.getElementById("result-code");
const resultNameEl = document.getElementById("result-name");
const foundCountEl = document.getElementById("found-count");
const totalCountEl = document.getElementById("total-count");
const foundListEl = document.getElementById("found-list");
const bingoGridEl = document.getElementById("bingo-grid");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFileEl = document.getElementById("import-file");
const resetBtn = document.getElementById("reset-btn");

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.found)) {
      foundCodes = new Set(data.found.map((c) => c.toUpperCase()));
    }
  } catch {
    foundCodes = new Set();
  }
}

function saveState() {
  const payload = {
    found: [...foundCodes].sort(compareCodes),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function compareCodes(a, b) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, "fr");
}

function setMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function renderBingoGrid() {
  bingoGridEl.innerHTML = "";
  for (const dept of DEPARTMENTS) {
    const tile = document.createElement("div");
    tile.className = "dept-tile";
    tile.title = dept.name;
    if (foundCodes.has(dept.code)) tile.classList.add("found");
    if (dept.code === lastAddedCode) tile.classList.add("recent");
    tile.innerHTML = `<span class="code">${dept.code}</span>${dept.name}`;
    bingoGridEl.appendChild(tile);
  }
}

function renderFoundList() {
  foundListEl.innerHTML = "";
  const sorted = [...foundCodes].sort(compareCodes);
  if (sorted.length === 0) {
    const hint = document.createElement("span");
    hint.className = "empty-hint";
    hint.textContent = "Noch keine Nummern eingetragen.";
    foundListEl.appendChild(hint);
    return;
  }

  for (const code of sorted) {
    const dept = DEPARTMENT_BY_CODE[code];
    const chip = document.createElement("span");
    chip.className = "found-chip";
    chip.innerHTML = `${code} <small>${dept.name}</small>`;
    foundListEl.appendChild(chip);
  }
}

function renderStats() {
  foundCountEl.textContent = String(foundCodes.size);
  totalCountEl.textContent = String(DEPARTMENTS.length);
}

function ensureMap() {
  if (map) return;
  map = L.map("map", { scrollWheelZoom: false }).setView([46.6, 2.4], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 18,
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
}

function createDeptMarker(dept, isCurrent) {
  const radius = isCurrent ? 9 : 6;
  const marker = L.circleMarker([dept.lat, dept.lng], {
    radius,
    fillColor: isCurrent ? MARKER_COLORS.current : MARKER_COLORS.found,
    color: "#ffffff",
    weight: 2,
    fillOpacity: 0.95,
  });
  marker.bindTooltip(`${dept.code} — ${dept.name}`, { direction: "top", offset: [0, -8] });
  return marker;
}

function renderMapMarkers(focusDept) {
  if (!map) return;
  markerLayer.clearLayers();

  for (const code of foundCodes) {
    const dept = DEPARTMENT_BY_CODE[code];
    if (!dept) continue;
    const isCurrent = code === (focusDept?.code ?? lastAddedCode);
    createDeptMarker(dept, isCurrent).addTo(markerLayer);
  }
}

function showDepartmentOnMap(dept) {
  ensureMap();
  resultPanelEl.classList.remove("hidden");
  resultCodeEl.textContent = dept.code;
  resultNameEl.textContent = dept.name;

  renderMapMarkers(dept);

  const zoom = dept.code.length > 2 ? 8 : 7;
  map.setView([dept.lat, dept.lng], zoom);
  setTimeout(() => map.invalidateSize(), 100);
}

function addDepartment(rawInput) {
  const code = normalizeCode(rawInput);
  if (!code) {
    setMessage("Unbekannte Nummer — bitte 01–95, 2A/2B oder 971–976 eingeben.", "error");
    return false;
  }

  const dept = DEPARTMENT_BY_CODE[code];
  if (!dept) {
    setMessage("Département nicht gefunden.", "error");
    return false;
  }

  const isNew = !foundCodes.has(code);
  foundCodes.add(code);
  lastAddedCode = code;
  saveState();
  renderAll();

  showDepartmentOnMap(dept);
  if (isNew) {
    setMessage(`Neu gefunden: ${dept.code} — ${dept.name}`, "success");
  } else {
    setMessage(`Schon erfasst: ${dept.code} — ${dept.name}`, "info");
  }
  return true;
}

function renderAll() {
  renderStats();
  renderFoundList();
  renderBingoGrid();
}

function exportToFile() {
  const lines = [
    "# Plaque Bingo France",
    `# Exportiert: ${new Date().toLocaleString("de-DE")}`,
    `# Gefunden: ${foundCodes.size} / ${DEPARTMENTS.length}`,
    "",
    ...[...foundCodes].sort(compareCodes).map((code) => {
      const dept = DEPARTMENT_BY_CODE[code];
      return `${code}\t${dept.name}`;
    }),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `plaque-bingo-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  setMessage("Liste als Textdatei exportiert.", "success");
}

function importFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    const imported = new Set(foundCodes);
    let added = 0;

    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const token = trimmed.split(/\s+/)[0];
      const code = normalizeCode(token);
      if (code && DEPARTMENT_BY_CODE[code] && !imported.has(code)) {
        imported.add(code);
        added += 1;
      }
    }

    foundCodes = imported;
    saveState();
    renderAll();
    if (foundCodes.size > 0) {
      ensureMap();
      resultPanelEl.classList.remove("hidden");
      renderMapMarkers();
      map.setView([46.6, 2.4], 5);
    }
    setMessage(
      added > 0
        ? `${added} neue Département(s) importiert.`
        : "Import abgeschlossen (keine neuen Einträge).",
      added > 0 ? "success" : "info"
    );
  };
  reader.readAsText(file);
}

function resetGame() {
  if (!confirm("Wirklich alle Einträge löschen?")) return;
  foundCodes = new Set();
  lastAddedCode = null;
  localStorage.removeItem(STORAGE_KEY);
  resultPanelEl.classList.add("hidden");
  if (markerLayer) markerLayer.clearLayers();
  renderAll();
  setMessage("Spiel zurückgesetzt.", "info");
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = inputEl.value;
  if (addDepartment(value)) {
    inputEl.value = "";
    inputEl.focus();
  }
});

exportBtn.addEventListener("click", exportToFile);
importBtn.addEventListener("click", () => importFileEl.click());
importFileEl.addEventListener("change", () => {
  const file = importFileEl.files?.[0];
  if (file) importFromFile(file);
  importFileEl.value = "";
});
resetBtn.addEventListener("click", resetGame);

loadState();
renderAll();
totalCountEl.textContent = String(DEPARTMENTS.length);
