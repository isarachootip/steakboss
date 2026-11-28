import fs from "node:fs/promises";
import path from "node:path";
import { applyAdDisclaimerWatermark } from "../src/services/image-watermark.service";

const TARGET_DIR = path.resolve(process.cwd(), "public/images/products");
const IMAGE_EXT_REGEX = /\.(jpe?g|png|webp)$/i;

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const entries = await fs.readdir(TARGET_DIR);
  const imageFiles = entries.filter((name) => IMAGE_EXT_REGEX.test(name)).sort();

  let appliedCount = 0;
  let skippedCount = 0;

  for (const filename of imageFiles) {
    const filePath = path.join(TARGET_DIR, filename);
    const input = await fs.readFile(filePath);
    const result = await applyAdDisclaimerWatermark(input, { force });

    if (result.applied) {
      await fs.writeFile(filePath, result.buffer);
      appliedCount += 1;
      console.log(
        `[stamped] ${filename} (${result.width}x${result.height}, ${Math.round(result.buffer.length / 1024)} KB)`
      );
    } else {
      skippedCount += 1;
      console.log(`[skipped] ${filename} (already watermarked)`);
    }
  }

  console.log(
    `\nDone: ${appliedCount} stamped, ${skippedCount} skipped, ${imageFiles.length} total.`
  );
}

main().catch((err: unknown) => {
  console.error("Watermark script failed:", err);
  process.exit(1);
});
