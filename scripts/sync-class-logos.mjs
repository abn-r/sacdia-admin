import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, "..");
const defaultSource = path.resolve(adminRoot, "../sacdia-app/assets/img/logos-clases");
const source = process.argv[2] ? path.resolve(process.argv[2]) : defaultSource;
const target = path.join(adminRoot, "public/img/logos-clases");

if (!fs.existsSync(source)) {
  console.error(`Source not found: ${source}`);
  console.error("Usage: pnpm sync:class-logos [path-to-logos-clases]");
  process.exit(1);
}

fs.mkdirSync(target, { recursive: true });

const files = fs.readdirSync(source).filter((file) => file.endsWith(".png"));
if (files.length === 0) {
  console.error(`No PNG files found in ${source}`);
  process.exit(1);
}

for (const file of files) {
  fs.copyFileSync(path.join(source, file), path.join(target, file));
}

console.log(`Synced ${files.length} class logos to ${target}`);
