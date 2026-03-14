import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const isWatch = args.includes("--watch");

const buildOptions = {
  entryPoints: [path.join(__dirname, "src/preload/index.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  outfile: path.join(__dirname, "dist/preload/index.js"),
  sourcemap: true,
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log("Watching preload file for changes...");
    } else {
      await esbuild.build(buildOptions);
      console.log("Preload built successfully.");
    }
  } catch (error) {
    console.error("Failed to build preload:", error);
    process.exit(1);
  }
}

await build();
