// Small Raindrop.io REST client shared by the popup and the options page.
const API = "https://api.raindrop.io/rest/v1";

async function rdFetch(path, token) {
  const res = await fetch(API + path, {
    headers: { Authorization: "Bearer " + token }
  });
  if (res.status === 401) throw new Error("TOKEN");
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// All collections (root + nested), flat list with parent ids.
async function getAllCollections(token) {
  const [roots, kids] = await Promise.all([
    rdFetch("/collections", token),
    rdFetch("/collections/childrens", token)
  ]);
  return [...(roots.items || []), ...(kids.items || [])].map((c) => ({
    id: c._id,
    title: c.title,
    parent: c.parent ? c.parent.$id : null,
    sort: typeof c.sort === "number" ? c.sort : 0
  }));
}

// Every bookmark in one collection (not nested), in Raindrop's manual order.
async function getBookmarks(collectionId, token) {
  const out = [];
  for (let page = 0; page < 20; page++) {
    const data = await rdFetch(
      `/raindrops/${collectionId}?perpage=50&page=${page}&sort=-sort`,
      token
    );
    const items = data.items || [];
    for (const b of items) out.push({ id: b._id, title: b.title || b.link, link: b.link });
    if (items.length < 50) break;
  }
  return out;
}

async function getUnsortedCount(token) {
  try {
    const data = await rdFetch("/raindrops/-1?perpage=1", token);
    return data.count || 0;
  } catch {
    return null;
  }
}

// Builds { id, title, links, folders: [...] } for a root collection.
async function getTree(rootId, token) {
  const all = await getAllCollections(token);
  const byParent = new Map();
  for (const c of all) {
    if (!byParent.has(c.parent)) byParent.set(c.parent, []);
    byParent.get(c.parent).push(c);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
  }
  const root = all.find((c) => c.id === rootId);
  if (!root) throw new Error("COLLECTION");

  async function build(c) {
    const [links, folders] = await Promise.all([
      getBookmarks(c.id, token),
      Promise.all((byParent.get(c.id) || []).map(build))
    ]);
    return { id: c.id, title: c.title, links, folders };
  }
  return build(root);
}
