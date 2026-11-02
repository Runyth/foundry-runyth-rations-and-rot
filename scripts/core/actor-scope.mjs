export function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => String(entry ?? "").trim()).filter(Boolean))];
}

export function folderPath(folder) {
  if (!folder) return "";
  const ancestors = Array.isArray(folder.ancestors) ? folder.ancestors : [];
  const ordered = [...ancestors]
    .filter(Boolean)
    .sort((a, b) => Number(a.depth ?? 0) - Number(b.depth ?? 0));
  return [...ordered.map((entry) => entry.name), folder.name]
    .filter(Boolean)
    .join("/");
}

export function matchesFolderPattern(actor, pattern) {
  const source = String(pattern ?? "").trim();
  if (!source) return true;
  try {
    return new RegExp(source, "iu").test(folderPath(actor?.folder));
  } catch {
    return true;
  }
}

export function actorMatchesPicker(actor, {
  selectedActorIds = [],
  selectedFolderIds = [],
  recursive = true
} = {}) {
  const actorIds = new Set(normalizeIdList(selectedActorIds));
  const folderIds = new Set(normalizeIdList(selectedFolderIds));
  if (actorIds.size === 0 && folderIds.size === 0) return true;
  if (actorIds.has(String(actor?.id ?? ""))) return true;

  const folder = actor?.folder;
  if (!folder) return false;
  if (folderIds.has(String(folder.id ?? ""))) return true;
  if (!recursive) return false;

  return (folder.ancestors ?? []).some((ancestor) => folderIds.has(String(ancestor?.id ?? "")));
}

export function actorMatchesSelection(actor, options = {}) {
  return matchesFolderPattern(actor, options.folderPattern)
    && actorMatchesPicker(actor, options);
}
