import { execFileSync } from "node:child_process";
import os from "node:os";
import { round } from "./stats.js";

function execVersion(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function collectWebglInfo(browser) {
  if (!browser) return {};

  let page;
  try {
    page = await browser.newPage();
    return await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return { webgl_vendor: "", webgl_renderer: "" };

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        webgl_vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        webgl_renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      };
    });
  } catch {
    return { webgl_vendor: "", webgl_renderer: "" };
  } finally {
    await page?.close();
  }
}

export async function collectEnvironment(browser, options) {
  const browserVersion = browser ? await browser.version() : "";
  const webgl = await collectWebglInfo(browser);

  return {
    iso: new Date().toISOString(),
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? "unknown",
    logical_cpus: os.cpus().length,
    memory_gb: round(os.totalmem() / 1024 ** 3, 1),
    node_version: process.version,
    npm_version: execVersion("npm", ["--version"]),
    git_commit: execVersion("git", ["rev-parse", "--short", "HEAD"]),
    git_dirty: execVersion("git", ["status", "--short"]) ? "true" : "false",
    browser: browserVersion,
    headless: String(options.headless),
    viewport_width: options.viewport.width,
    viewport_height: options.viewport.height,
    device_scale_factor: options.deviceScaleFactor,
    runs: options.runs,
    warmup_runs: options.warmupRuns,
    ...webgl,
  };
}
