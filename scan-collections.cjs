const fs = require("fs");
const path = require("path");

// Extensions à analyser
const EXTENSIONS = [".js", ".ts", ".jsx", ".tsx"];

// Fonction récursive pour scanner les fichiers
function scanDir(dir, results = new Set()) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !["node_modules", "dist", "build"].includes(entry.name)) {
      scanDir(fullPath, results);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      const content = fs.readFileSync(fullPath, "utf-8");

      // Cherche tous les "collection('xxx')" ou "db.collection('xxx')"
      const regex = /(?:collection\s*\(|db\.collection\s*\()[`'"]([a-zA-Z0-9_-]+)[`'"]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        results.add(match[1]);
      }
    }
  }
  return results;
}

// Lance le scan depuis le dossier courant
const root = process.cwd();
const collections = scanDir(root);

console.log("\n📂 Collections Firestore trouvées :\n");
console.log([...collections].sort().join("\n"));
