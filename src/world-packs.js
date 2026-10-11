const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const privatePackDir = path.join(path.resolve(process.env.DND_DATA_DIR || path.join(rootDir, 'data')), "private-world-packs");

function loadWorldContext(scene) {
  ensurePrivatePackDir();
  const records = [];
  for (const file of fs.readdirSync(privatePackDir)) {
    if (!file.endsWith(".json")) continue;
    const fullPath = path.join(privatePackDir, file);
    try {
      const pack = JSON.parse(fs.readFileSync(fullPath, "utf8"));
      for (const record of pack.records || []) {
        records.push({
          packId: pack.id || path.basename(file, ".json"),
          packTitle: pack.title || "Private world pack",
          contentPolicy: pack.contentPolicy || "private_user_context",
          title: record.title,
          text: record.text,
          tags: record.tags || [],
          location: record.location || "",
          region: record.region || ""
        });
      }
    } catch {
      // Invalid private packs should not break play.
    }
  }
  return rankWorldRecords(records, scene).slice(0, 5);
}

function ensurePrivatePackDir() {
  fs.mkdirSync(privatePackDir, { recursive: true });
}

function rankWorldRecords(records, scene) {
  const needle = `${scene.location || ""} ${scene.title || ""}`.toLowerCase();
  return records
    .map((record) => {
      const hay = `${record.title} ${record.text} ${record.location} ${record.region} ${(record.tags || []).join(" ")}`.toLowerCase();
      const score = hay.includes(needle) ? 5 : keywordScore(hay, needle);
      return { record, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.record);
}

function keywordScore(hay, needle) {
  return needle.split(/[\s,·]+/).filter((word) => word.length > 3 && hay.includes(word)).length;
}

module.exports = { loadWorldContext, privatePackDir };
