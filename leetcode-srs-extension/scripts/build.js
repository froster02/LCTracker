const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const isWatch = process.argv.includes("--watch");
const isProd = process.argv.includes("--prod");

const DEV_API_BASE = "http://localhost:3000";
const PROD_API_BASE = process.env.PROD_API_BASE ?? "https://lctracker-webapp.vercel.app";

const STATIC_FILES = ["manifest.json", "popup.html", "popup.css", "icon16.png", "icon48.png", "icon128.png"];

function copyStaticFiles() {
  fs.mkdirSync(DIST, { recursive: true });
  for (const file of STATIC_FILES) {
    fs.copyFileSync(path.join(ROOT, file), path.join(DIST, file));
  }
}

const buildOptions = {
  entryPoints: {
    background: path.join(ROOT, "src/background/index.js"),
    content: path.join(ROOT, "src/content/index.js"),
    "content-main": path.join(ROOT, "src/content/main-world.js"),
    popup: path.join(ROOT, "src/popup/index.js"),
  },
  bundle: true,
  format: "iife",
  target: "chrome110",
  outdir: DIST,
  logLevel: "info",
  define: {
    "process.env.API_BASE": JSON.stringify(isProd ? PROD_API_BASE : DEV_API_BASE),
  },
};

async function run() {
  copyStaticFiles();

  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    await esbuild.build(buildOptions);
    console.log(`Build complete (${isProd ? "production" : "development"}) -> dist/`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
