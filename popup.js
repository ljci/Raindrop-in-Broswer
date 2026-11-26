// Popup: shows one Raindrop collection and its nested subfolders.
// Data is fetched live from Raindrop every time the popup opens.
// The only thing cached is the last result in session storage (wiped when the
// browser closes) so the popup draws instantly while it refreshes.

const $ = (id) => document.getElementById(id);
const content = $("content");
const q = $("q");
const emptyMsg = $("empty");
const statusEl = $("status");

let settings = {};
let collapsed = {};
let selIndex = 0;

$("settings").onclick = () => chrome.runtime.openOptionsPage();
$("refresh").onclick = () => load(true);

init();

async function init() {
  settings = await chrome.storage.local.get(["token", "collectionId", "collectionTitle"]);
  collapsed = (await chrome.storage.local.get("collapsed")).collapsed || {};

  if (!settings.token || !settings.collectionId) {
    showSetup();
    return;
  }
  $("title").textContent = settings.collectionTitle || "Quick links";

  const cached = (await chrome.storage.session.get("tree")).tree;
  if (cached && cached.id === settings.collectionId) render(cached);
  load(false);
}

async function load(manual) {
  statusEl.textContent = manual ? "Refreshing…" : statusEl.textContent;
  try {
    const [tree, inbox] = await Promise.all([
      getTree(settings.collectionId, settings.token),
      getUnsortedCount(settings.token)
    ]);
    await chrome.storage.session.set({ tree });
    render(tree);
    if (inbox) {
      $("inbox").textContent = `Inbox ${inbox}`;
      $("inbox").hidden = false;
    }
    statusEl.textContent = "Live from Raindrop · no browser bookmarks";
  } catch (e) {
    if (e.message === "TOKEN") showError("Your Raindrop token was rejected. Update it in Settings.");
    else if (e.message === "COLLECTION") showError("That folder no longer exists. Pick another in Settings.");
    else if (!content.childElementCount) showError("Couldn't reach Raindrop. Check your connection and try Refresh.");
    else statusEl.textContent = "Offline · showing last loaded links";
  }
}

function showSetup() {
  content.replaceChildren();
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = "Add your Raindrop token and pick a folder to get started.";
  const b = document.createElement("button");
  b.className = "btn primary";
  b.textContent = "Open settings";
  b.style.margin = "4px 10px 8px";
  b.onclick = () => chrome.runtime.openOptionsPage();
  content.append(p, b);
  q.hidden = true;
  statusEl.textContent = "Not set up yet";
}

function showError(text) {
  content.replaceChildren();
  const p = document.createElement("p");
  p.className = "muted error";
  p.textContent = text;
  content.append(p);
  statusEl.textContent = "";
}

// ---------- rendering ----------

function favicon(url) {
  const u = new URL(chrome.runtime.getURL("/_favicon/"));
  u.searchParams.set("pageUrl", url);
  u.searchParams.set("size", "32");
  return u.toString();
}

function linkEl(b, cls) {
  const a = document.createElement("a");
  a.className = cls + " item";
  a.href = b.link;
  a.title = b.link;
  a.dataset.search = (b.title + " " + b.link).toLowerCase();
  const img = document.createElement("img");
  img.className = "fav";
  img.alt = "";
  img.src = favicon(b.link);
  img.onerror = () => {
    const l = document.createElement("span");
    l.className = "fav letter";
    l.textContent = (b.title || "?").trim().charAt(0).toUpperCase();
    img.replaceWith(l);
  };
  const t = document.createElement("span");
  t.className = "t";
  t.textContent = b.title;
  a.append(img, t);
  a.addEventListener("click", (e) => openLink(e, b.link));
  a.addEventListener("auxclick", (e) => { if (e.button === 1) openLink(e, b.link); });
  return a;
}

function countLinks(f) {
  return f.links.length + f.folders.reduce((n, c) => n + countLinks(c), 0);
}

function folderEl(f) {
  const wrap = document.createElement("div");
  wrap.className = "group" + (collapsed[f.id] ? " closed" : "");
  wrap.dataset.id = f.id;

  const head = document.createElement("div");
  head.className = "folder";
  const chev = document.createElement("span");
  chev.className = "chev";
  chev.textContent = "▼";
  const name = document.createElement("span");
  name.className = "t";
  name.textContent = f.title;
  const count = document.createElement("span");
  count.className = "count";
  count.textContent = countLinks(f);
  head.append(chev, name, count);
  head.onclick = () => {
    wrap.classList.toggle("closed");
    collapsed[f.id] = wrap.classList.contains("closed");
    chrome.storage.local.set({ collapsed });
  };

  const kids = document.createElement("div");
  kids.className = "kids";
  for (const b of f.links) kids.append(linkEl(b, "row"));
  for (const c of f.folders) kids.append(folderEl(c));

  wrap.append(head, kids);
  return wrap;
}

function render(tree) {
  q.hidden = false;
  content.replaceChildren();
  $("title").textContent = tree.title;

  if (tree.links.length) {
    const tiles = document.createElement("div");
    tiles.className = "tiles";
    for (const b of tree.links) tiles.append(linkEl(b, "tile"));
    content.append(tiles);
  }
  if (tree.links.length && tree.folders.length) {
    const sep = document.createElement("div");
    sep.className = "sep";
    content.append(sep);
  }
  for (const f of tree.folders) content.append(folderEl(f));

  if (!countLinks(tree)) {
    emptyMsg.textContent = "This folder is empty. Add links to it in Raindrop.";
    emptyMsg.hidden = false;
  }
  applyFilter();
}

// ---------- search + keyboard ----------

function visibleItems() {
  return [...content.querySelectorAll(".item")].filter((el) => el.offsetParent !== null);
}

function applyFilter() {
  const v = q.value.toLowerCase().trim();
  const searching = v.length > 0;
  content.classList.toggle("searching", searching);

  for (const el of content.querySelectorAll(".item")) {
    el.hidden = searching && !el.dataset.search.includes(v);
  }
  // Groups: hide if nothing matches inside; force-open while searching.
  const groups = [...content.querySelectorAll(".group")].reverse(); // deepest first
  for (const g of groups) {
    const any = [...g.querySelectorAll(".item")].some((i) => !i.hidden);
    g.hidden = searching && !any;
    if (searching) g.classList.remove("closed");
    else g.classList.toggle("closed", !!collapsed[g.dataset.id]);
  }
  const tiles = content.querySelector(".tiles");
  if (tiles) tiles.hidden = searching && ![...tiles.children].some((i) => !i.hidden);
  const sep = content.querySelector(".sep");
  if (sep) sep.hidden = searching;

  const total = content.querySelectorAll(".item").length;
  if (total) {
    const any = visibleItems().length > 0;
    emptyMsg.hidden = any;
    emptyMsg.textContent = "No match here. Press Enter to search all of Raindrop.";
  }
  selIndex = 0;
  highlight();
}

function highlight() {
  const items = visibleItems();
  items.forEach((el, i) => el.classList.toggle("sel", q.value && i === selIndex));
  if (q.value && items[selIndex]) items[selIndex].scrollIntoView({ block: "nearest" });
}

q.addEventListener("input", applyFilter);
q.addEventListener("keydown", (e) => {
  const items = visibleItems();
  if (e.key === "ArrowDown") { e.preventDefault(); selIndex = Math.min(selIndex + 1, items.length - 1); highlight(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); selIndex = Math.max(selIndex - 1, 0); highlight(); }
  else if (e.key === "Enter") {
    e.preventDefault();
    if (items.length) openLink(e, items[selIndex].href);
    else if (q.value.trim()) {
      chrome.tabs.create({ url: "https://app.raindrop.io/my/0/" + encodeURIComponent(q.value.trim()) });
      window.close();
    }
  }
});

// Click = open in current tab (like a bookmarks bar).
// Cmd/Ctrl-click or middle-click = open in a new background tab.
function openLink(e, url) {
  e.preventDefault();
  if (e.metaKey || e.ctrlKey || e.button === 1) {
    chrome.tabs.create({ url, active: false });
  } else {
    chrome.tabs.update({ url });
    window.close();
  }
}
