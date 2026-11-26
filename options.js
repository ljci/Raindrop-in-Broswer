const tokenEl = document.getElementById("token");
const folderEl = document.getElementById("folder");
const msg = document.getElementById("msg");

function say(text, isError) {
  msg.textContent = text;
  msg.classList.toggle("error", !!isError);
}

// Flatten the collection tree into indented options ("Browser", "  Office", ...).
function toOptions(all) {
  const byParent = new Map();
  for (const c of all) {
    if (!byParent.has(c.parent)) byParent.set(c.parent, []);
    byParent.get(c.parent).push(c);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
  }
  const out = [];
  const walk = (parent, depth) => {
    for (const c of byParent.get(parent) || []) {
      out.push({ id: c.id, title: c.title, label: "   ".repeat(depth) + c.title });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

async function loadFolders(selectedId) {
  const token = tokenEl.value.trim();
  if (!token) return say("Paste your token first.", true);
  say("Loading folders…");
  try {
    const opts = toOptions(await getAllCollections(token));
    folderEl.replaceChildren();
    for (const o of opts) {
      const op = document.createElement("option");
      op.value = o.id;
      op.textContent = o.label;
      op.dataset.title = o.title;
      folderEl.append(op);
    }
    folderEl.disabled = false;
    const fallback = opts.find((o) => o.title.toLowerCase() === "browser");
    const pick = selectedId || (fallback && fallback.id);
    if (pick) folderEl.value = String(pick);
    say(`Found ${opts.length} folders.`);
  } catch (e) {
    say(e.message === "TOKEN" ? "That token was rejected. Check it and try again." : "Couldn't reach Raindrop. Try again.", true);
  }
}

document.getElementById("load").onclick = () => loadFolders();

document.getElementById("save").onclick = async () => {
  const token = tokenEl.value.trim();
  if (!token) return say("Paste your token first.", true);
  if (folderEl.disabled) return say("Load folders and pick one first.", true);
  const opt = folderEl.selectedOptions[0];
  await chrome.storage.local.set({
    token,
    collectionId: Number(folderEl.value),
    collectionTitle: opt.dataset.title
  });
  await chrome.storage.session.remove("tree");
  say(`Saved. The popup now shows "${opt.dataset.title}".`);
};

(async () => {
  const s = await chrome.storage.local.get(["token", "collectionId"]);
  if (s.token) {
    tokenEl.value = s.token;
    loadFolders(s.collectionId);
  }
})();
