import fs from "node:fs";
import path from "node:path";

const SOURCE_HTML = path.resolve(process.cwd(), "steakboss-store.html");
const OUT_DIR = path.resolve(process.cwd(), "public/images/products");

const ASSET_NAMES = [
  "hero.jpg",
  "packcard.jpg",
  "kp-plated.jpg",
  "kp-pack.jpg",
  "pork-plated.jpg",
  "pork-pack.jpg",
  "chk-plated.jpg",
  "chk-pack.jpg",
  "clean-plated.jpg",
  "clean-pack.jpg",
  "prem-plated.jpg",
  "prem-pack.jpg",
  "prem-wide.jpg",
  "set-plated.jpg",
  "set-pack.jpg",
];

function extractAssets() {
  if (!fs.existsSync(SOURCE_HTML)) {
    throw new Error(`Missing source file: ${SOURCE_HTML}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const html = fs.readFileSync(SOURCE_HTML, "utf8");
  const matches = [...html.matchAll(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g)];

  if (matches.length !== ASSET_NAMES.length) {
    throw new Error(`Expected ${ASSET_NAMES.length} images, found ${matches.length}`);
  }

  for (let i = 0; i < matches.length; i++) {
    const base64 = matches[i][1];
    const filename = ASSET_NAMES[i];
    const targetPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(targetPath, Buffer.from(base64, "base64"));
    const kb = Math.round(fs.statSync(targetPath).size / 1024);
    console.log(`Extracted ${filename} (${kb} KB)`);
  }
}

extractAssets();
