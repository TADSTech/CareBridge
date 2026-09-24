/**
 * Render CareBridge pitch HTML → PDF with Puppeteer.
 * Keeps colors via printBackground + print-color-adjust in the HTML.
 *
 * Usage: bun scripts/render-pitch.mjs
 */
import puppeteer from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "pitch", "carebridge-pitch.html");
const pdfPath = path.join(root, "CareBridge-Pitch-Deck.pdf");

const browser = await puppeteer.launch({
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--font-render-hinting=none",
    "--force-color-profile=srgb",
    "--disable-gpu",
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "networkidle0",
    timeout: 60000,
  });

  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await new Promise((r) => setTimeout(r, 400));

  await page.pdf({
    path: pdfPath,
    width: "1280px",
    height: "720px",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    pageRanges: "",
  });

  console.log(`PDF written: ${pdfPath}`);
} finally {
  await browser.close();
}
