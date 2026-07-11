
const state = {
  recipes: [],
  mode: localStorage.getItem("bookMode") || "adapted",
  portions: Number(localStorage.getItem("portions") || 1),
  menu: null,
  favorites: new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
  installPrompt: null
};

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

const $ = (id) => document.getElementById(id);

function isoWeekInfo(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  const monday = new Date(d);
  const localDay = monday.getDay() || 7;
  monday.setDate(monday.getDate() - localDay + 1);
  monday.setHours(0,0,0,0);
  return { year: date.getUTCFullYear(), week, monday };
}

function weekKey() {
  const {year, week} = isoWeekInfo();
  return `${year}-W${String(week).padStart(2, "0")}-${state.mode}-${state.portions}`;
}

function seededRandom(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function() {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(array, rng) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function recipeTitle(r) {
  return state.mode === "adapted" ? r.titolo_adattato : r.titolo_originale;
}
function recipeIngredients(r) {
  return state.mode === "adapted" ? r.ingredienti_adattati : r.ingredienti_originali;
}
function recipeProcedure(r) {
  return state.mode === "adapted" ? r.procedimento_adattato : r.procedimento_originale;
}

function eligibleRecipes(meal) {
  return state.recipes.filter(r => {
    if (!r.pasti.includes(meal)) return false;
    if (r.categoria === "Contorni") return false;
    if (state.mode === "adapted" && r.compatibilita === "non_compatibile") return false;
    if (meal === "cena" && !["Secondi piatti", "Primi piatti"].includes(r.categoria)) return false;
    return true;
  });
}

function generateMenu(force = false) {
  const key = weekKey();
  if (!force) {
    const saved = localStorage.getItem(`menu:${key}`);
    if (saved) {
      state.menu = JSON.parse(saved);
      renderMenu();
      renderShopping();
      return;
    }
  }

  const rng = seededRandom(key + (force ? `-${Date.now()}` : ""));
  let lunches = shuffle(eligibleRecipes("pranzo").filter(r => r.categoria === "Primi piatti"), rng);
  let dinners = shuffle(eligibleRecipes("cena").filter(r => r.categoria === "Secondi piatti"), rng);

  if (lunches.length < 7) lunches = shuffle(eligibleRecipes("pranzo"), rng);
  if (dinners.length < 7) dinners = shuffle(eligibleRecipes("cena"), rng);

  const used = new Set();
  const pick = (pool) => {
    const found = pool.find(r => !used.has(r.id));
    if (found) used.add(found.id);
    return found || pool[0];
  };

  state.menu = DAYS.map(day => ({
    day,
    lunch: pick(lunches),
    dinner: pick(dinners)
  }));

  localStorage.setItem(`menu:${key}`, JSON.stringify(state.menu));
  renderMenu();
  renderShopping();
}

function scaleIngredient(line, factor) {
  const match = line.match(/^\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)?\s+(.*)$/i);
  if (!match) return line;
  const quantity = Number(match[1].replace(",", ".")) * factor;
  const unit = match[2] || "";
  const value = Number.isInteger(quantity) ? quantity : Math.round(quantity * 10) / 10;
  return `${value}${unit} ${match[3]}`;
}

function renderMenu() {
  const {year, week, monday} = isoWeekInfo();
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  $("weekLabel").textContent = `Settimana ${week} del ${year} · ${monday.toLocaleDateString("it-IT")} – ${sunday.toLocaleDateString("it-IT")}`;

  $("weekGrid").innerHTML = state.menu.map((entry, index) => `
    <article class="day-card">
      <h3>${entry.day}</h3>
      ${mealHtml("Pranzo", entry.lunch, index, "lunch")}
      ${mealHtml("Cena", entry.dinner, index, "dinner")}
    </article>
  `).join("");

  document.querySelectorAll("[data-open-recipe]").forEach(btn => {
    btn.addEventListener("click", () => openRecipe(Number(btn.dataset.openRecipe)));
  });
  document.querySelectorAll("[data-change-meal]").forEach(btn => {
    btn.addEventListener("click", () => changeMeal(Number(btn.dataset.day), btn.dataset.slot));
  });
}

function mealHtml(label, recipe, dayIndex, slot) {
  if (!recipe) return `<div class="meal"><span class="meal-label">${label}</span><p>Nessuna ricetta disponibile.</p></div>`;
  return `
    <div class="meal">
      <span class="meal-label">${label}</span>
      <p class="meal-title">${escapeHtml(recipeTitle(recipe))}</p>
      <div class="meal-actions">
        <button data-open-recipe="${recipe.id}">Apri ricetta</button>
        <button class="secondary" data-change-meal data-day="${dayIndex}" data-slot="${slot}">Cambia</button>
      </div>
    </div>
  `;
}

function changeMeal(dayIndex, slot) {
  const meal = slot === "lunch" ? "pranzo" : "cena";
  const category = slot === "lunch" ? "Primi piatti" : "Secondi piatti";
  let pool = eligibleRecipes(meal).filter(r => r.categoria === category);
  if (!pool.length) pool = eligibleRecipes(meal);

  const currentIds = new Set(state.menu.flatMap(d => [d.lunch?.id, d.dinner?.id]));
  const current = state.menu[dayIndex][slot];
  const candidates = pool.filter(r => r.id !== current?.id && !currentIds.has(r.id));
  const available = candidates.length ? candidates : pool.filter(r => r.id !== current?.id);
  if (!available.length) return;

  const replacement = available[Math.floor(Math.random() * available.length)];
  state.menu[dayIndex][slot] = replacement;
  localStorage.setItem(`menu:${weekKey()}`, JSON.stringify(state.menu));
  renderMenu();
  renderShopping();
}

function shoppingCategory(name) {
  const s = name.toLowerCase();
  if (/(pollo|tacchino|carne|manzo|vitello|bresaola|prosciutto|pesce|merluzzo|orata|sogliola|uov|albume)/.test(s)) return "Carne, pesce e uova";
  if (/(latte|yogurt|ricotta|formaggio|latticin)/.test(s)) return "Latticini";
  if (/(zucchin|carot|spinac|bieta|finocch|valeriana|fiori di zucca|verdura)/.test(s)) return "Verdure";
  if (/(pasta|riso|farina|pane|fette biscottate|cous cous)/.test(s)) return "Pasta, riso e farine";
  if (/(olio|sale|brodo|acqua)/.test(s)) return "Dispensa e condimenti";
  return "Altro";
}

function normalizeIngredient(line) {
  return line
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildShoppingList() {
  const factor = state.portions / 2;
  const numeric = new Map();
  const loose = new Set();

  for (const day of state.menu || []) {
    for (const r of [day.lunch, day.dinner]) {
      if (!r) continue;
      for (const raw of recipeIngredients(r)) {
        const line = normalizeIngredient(raw);
        const match = line.match(/^\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)?\s+(.*)$/i);
        if (match) {
          const qty = Number(match[1].replace(",", ".")) * factor;
          const unit = (match[2] || "").toLowerCase();
          const name = match[3].trim();
          const key = `${unit}|${name.toLowerCase()}`;
          if (!numeric.has(key)) numeric.set(key, {qty: 0, unit, name});
          numeric.get(key).qty += qty;
        } else if (line) {
          loose.add(line);
        }
      }
    }
  }

  const items = [];
  for (const value of numeric.values()) {
    const qty = Number.isInteger(value.qty) ? value.qty : Math.round(value.qty * 10) / 10;
    items.push({
      id: `${value.unit}:${value.name}`,
      text: `${qty}${value.unit} ${value.name}`,
      category: shoppingCategory(value.name)
    });
  }
  for (const line of loose) {
    items.push({id: `loose:${line}`, text: line, category: shoppingCategory(line)});
  }
  return items.sort((a,b) => a.category.localeCompare(b.category) || a.text.localeCompare(b.text));
}

function shoppingChecksKey() {
  return `shoppingChecks:${weekKey()}`;
}

function renderShopping() {
  if (!state.menu) return;
  const items = buildShoppingList();
  const checks = new Set(JSON.parse(localStorage.getItem(shoppingChecksKey()) || "[]"));
  const groups = {};
  for (const item of items) (groups[item.category] ||= []).push(item);

  $("shoppingList").innerHTML = Object.entries(groups).map(([category, rows]) => `
    <section class="shopping-group">
      <h3>${escapeHtml(category)}</h3>
      ${rows.map(row => `
        <label class="shopping-item ${checks.has(row.id) ? "checked" : ""}">
          <input type="checkbox" data-shopping-id="${escapeAttr(row.id)}" ${checks.has(row.id) ? "checked" : ""}>
          <span>${escapeHtml(row.text)}</span>
        </label>
      `).join("")}
    </section>
  `).join("");

  document.querySelectorAll("[data-shopping-id]").forEach(input => {
    input.addEventListener("change", () => {
      const active = new Set(JSON.parse(localStorage.getItem(shoppingChecksKey()) || "[]"));
      input.checked ? active.add(input.dataset.shoppingId) : active.delete(input.dataset.shoppingId);
      localStorage.setItem(shoppingChecksKey(), JSON.stringify([...active]));
      renderShopping();
    });
  });
}

function renderRecipeResults() {
  const terms = $("ingredientSearch").value.toLowerCase().split(",").map(x => x.trim()).filter(Boolean);
  const meal = $("mealFilter").value;
  const category = $("categoryFilter").value;
  const compatibleOnly = $("compatibleOnly").checked;

  const rows = state.recipes.filter(r => {
    if (meal && !r.pasti.includes(meal)) return false;
    if (category && r.categoria !== category) return false;
    if (compatibleOnly && state.mode === "adapted" && r.compatibilita === "non_compatibile") return false;
    const hay = `${recipeTitle(r)} ${recipeIngredients(r).join(" ")}`.toLowerCase();
    return terms.every(t => hay.includes(t));
  });

  $("resultCount").textContent = `${rows.length} ricette trovate`;
  $("recipeResults").innerHTML = rows.map(recipeCardHtml).join("");
  bindRecipeCards();
}

function recipeCardHtml(r) {
  const favorite = state.favorites.has(r.id);
  return `
    <article class="recipe-card">
      <h3>${escapeHtml(recipeTitle(r))}</h3>
      <div class="recipe-meta">
        <span class="badge">${escapeHtml(r.categoria)}</span>
        <span class="badge">${r.tempo} min</span>
        ${state.mode === "adapted" ? `<span class="badge ${r.compatibilita === "non_compatibile" ? "warn" : ""}">${escapeHtml(r.compatibilita.replaceAll("_"," "))}</span>` : ""}
      </div>
      <div class="recipe-actions">
        <button data-open-recipe="${r.id}">Apri</button>
        <button class="favorite-btn ${favorite ? "active" : ""}" data-favorite="${r.id}">${favorite ? "★ Preferita" : "☆ Preferita"}</button>
      </div>
    </article>
  `;
}

function bindRecipeCards() {
  document.querySelectorAll("[data-open-recipe]").forEach(btn => {
    btn.addEventListener("click", () => openRecipe(Number(btn.dataset.openRecipe)));
  });
  document.querySelectorAll("[data-favorite]").forEach(btn => {
    btn.addEventListener("click", () => toggleFavorite(Number(btn.dataset.favorite)));
  });
}

function toggleFavorite(id) {
  state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
  localStorage.setItem("favorites", JSON.stringify([...state.favorites]));
  renderRecipeResults();
  renderFavorites();
}

function renderFavorites() {
  const rows = state.recipes.filter(r => state.favorites.has(r.id));
  $("favoriteResults").innerHTML = rows.length
    ? rows.map(recipeCardHtml).join("")
    : `<p class="muted">Non hai ancora salvato ricette preferite.</p>`;
  bindRecipeCards();
}

function openRecipe(id) {
  const r = state.recipes.find(x => x.id === id);
  if (!r) return;
  const factor = state.portions / Math.max(r.porzioni || 2, 1);
  const ingredients = recipeIngredients(r).map(x => scaleIngredient(x, factor));
  const procedure = recipeProcedure(r);

  $("recipeDetail").innerHTML = `
    <h2 class="detail-title">${escapeHtml(recipeTitle(r))}</h2>
    <div class="recipe-meta">
      <span class="badge">${escapeHtml(r.categoria)}</span>
      <span class="badge">${r.tempo} min</span>
      <span class="badge">${state.portions} ${state.portions === 1 ? "persona" : "persone"}</span>
    </div>
    ${state.mode === "adapted" && r.modifiche.length ? `
      <section class="detail-section">
        <h3>Variazioni rispetto all’originale</h3>
        ${r.modifiche.map(m => `<div class="change"><strong>${escapeHtml(m.da)}</strong><br>→ ${escapeHtml(m.a)}<br><small>${escapeHtml(m.motivazione)}</small></div>`).join("")}
      </section>
    ` : ""}
    <section class="detail-section">
      <h3>Ingredienti</h3>
      <ul>${ingredients.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    </section>
    <section class="detail-section">
      <h3>Procedimento</h3>
      <ol>${procedure.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ol>
    </section>
  `;
  $("recipeDialog").showModal();
}

function shareShopping() {
  const text = [
    "Lista della spesa settimanale",
    "",
    ...buildShoppingList().map(x => `• ${x.text}`)
  ].join("\n");
  if (navigator.share) {
    navigator.share({title: "Lista della spesa", text}).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => alert("Lista copiata negli appunti."));
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function escapeAttr(value = "") { return escapeHtml(value); }

const DB_NAME = "ricettario-antireflusso-db";
const DB_VERSION = 1;
const STORE = "appdata";

function openAppDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openAppDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openAppDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function validateRecipes(data) {
  return Array.isArray(data) && data.length > 0 && data.every(r =>
    r.id !== undefined &&
    typeof r.titolo_originale === "string" &&
    typeof r.titolo_adattato === "string" &&
    Array.isArray(r.ingredienti_originali) &&
    Array.isArray(r.ingredienti_adattati) &&
    Array.isArray(r.procedimento_originale) &&
    Array.isArray(r.procedimento_adattato)
  );
}

async function loadLocalDatabase() {
  const saved = await idbGet("recipes");
  const meta = await idbGet("meta");
  if (validateRecipes(saved)) return {recipes: saved, meta: meta || {version: 0}};

  const bundled = await fetch("data/recipes.json", {cache:"no-store"}).then(r => r.json());
  if (!validateRecipes(bundled)) throw new Error("Database iniziale non valido");
  const initialMeta = {version: 0, updated_at: null, source: "bundled"};
  await idbSet("recipes", bundled);
  await idbSet("meta", initialMeta);
  return {recipes: bundled, meta: initialMeta};
}

function renderDatabaseStatus(meta = {}) {
  $("dbVersion").textContent = `Versione locale: ${meta.version ?? 0}`;
  $("dbUpdatedAt").textContent = meta.updated_at
    ? `Aggiornata: ${new Date(meta.updated_at).toLocaleString("it-IT")}`
    : "Database iniziale incluso nell'app";
}

function showUpdateMessage(message, error = false) {
  const box = $("updateMessage");
  box.textContent = message;
  box.classList.remove("hidden");
  box.style.background = error ? "#ffe4e1" : "";
  box.style.color = error ? "#7a1f16" : "";
  setTimeout(() => box.classList.add("hidden"), 7000);
}

async function fetchRemoteJson(url) {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
    cache: "no-store",
    headers: {"Accept":"application/json"}
  });
  if (!response.ok) throw new Error(`Errore HTTP ${response.status}`);
  return response.json();
}

async function checkDatabaseUpdates({silent=false, force=false} = {}) {
  try {
    if (!navigator.onLine) {
      if (!silent) showUpdateMessage("Nessuna connessione: uso il database locale.", true);
      return;
    }

    const remote = await fetchRemoteJson("./database/version.json");
    const local = await idbGet("meta") || {version:0};

    if (!force && Number(remote.version) <= Number(local.version || 0)) {
      if (!silent) showUpdateMessage("Il database è già aggiornato.");
      renderDatabaseStatus(local);
      return;
    }

    const data = await fetchRemoteJson(remote.recipes_url || "./database/recipes.json");
    if (!validateRecipes(data)) throw new Error("Database remoto non valido");

    const meta = {
      version: Number(remote.version),
      updated_at: remote.updated_at || new Date().toISOString(),
      total_recipes: remote.total_recipes || data.length,
      source: "github-pages"
    };
    await idbSet("recipes", data);
    await idbSet("meta", meta);

    state.recipes = data;
    renderDatabaseStatus(meta);
    renderRecipeResults();
    renderFavorites();
    generateMenu(true);

    let details = "";
    try {
      const log = await fetchRemoteJson(remote.changelog_url || "./database/changelog.json");
      if (Array.isArray(log.changes)) details = " " + log.changes.join(" • ");
    } catch (_) {}

    showUpdateMessage(`Database aggiornato alla versione ${remote.version}.${details}`);
  } catch (e) {
    if (!silent) showUpdateMessage(`Aggiornamento non riuscito: ${e.message}. Rimane attiva la versione locale.`, true);
  }
}

async function init() {
  const local = await loadLocalDatabase();
  state.recipes = local.recipes;
  renderDatabaseStatus(local.meta);

  $("bookMode").value = state.mode;
  $("portions").value = String(state.portions);
  $("originalWarning").classList.toggle("hidden", state.mode !== "original");

  const categories = [...new Set(state.recipes.map(r => r.categoria))].sort();
  $("categoryFilter").innerHTML += categories.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");

  generateMenu();
  renderRecipeResults();
  renderFavorites();

  $("bookMode").addEventListener("change", e => {
    state.mode = e.target.value;
    localStorage.setItem("bookMode", state.mode);
    $("originalWarning").classList.toggle("hidden", state.mode !== "original");
    generateMenu();
    renderRecipeResults();
    renderFavorites();
  });

  $("portions").addEventListener("change", e => {
    state.portions = Number(e.target.value);
    localStorage.setItem("portions", String(state.portions));
    generateMenu();
    renderShopping();
  });

  $("regenerateBtn").addEventListener("click", () => generateMenu(true));
  $("checkUpdatesBtn").addEventListener("click", () => checkDatabaseUpdates({force:true}));
  $("ingredientSearch").addEventListener("input", renderRecipeResults);
  $("mealFilter").addEventListener("change", renderRecipeResults);
  $("categoryFilter").addEventListener("change", renderRecipeResults);
  $("compatibleOnly").addEventListener("change", renderRecipeResults);
  $("shareShoppingBtn").addEventListener("click", shareShopping);
  $("closeDialog").addEventListener("click", () => $("recipeDialog").close());
  $("recipeDialog").addEventListener("click", e => {
    if (e.target === $("recipeDialog")) $("recipeDialog").close();
  });

  $("checkAllBtn").addEventListener("click", () => {
    localStorage.setItem(shoppingChecksKey(), JSON.stringify(buildShoppingList().map(x => x.id)));
    renderShopping();
  });
  $("clearChecksBtn").addEventListener("click", () => {
    localStorage.removeItem(shoppingChecksKey());
    renderShopping();
  });

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(x => x.classList.remove("active"));
      tab.classList.add("active");
      $(tab.dataset.tab).classList.add("active");
    });
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }

  checkDatabaseUpdates({silent:true});
}

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  state.installPrompt = e;
  $("installBtn").classList.remove("hidden");
});
$("installBtn").addEventListener("click", async () => {
  if (!state.installPrompt) return;
  state.installPrompt.prompt();
  await state.installPrompt.userChoice;
  state.installPrompt = null;
  $("installBtn").classList.add("hidden");
});

init();
