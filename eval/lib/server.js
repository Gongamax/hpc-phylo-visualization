import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
    } catch (error) {
      lastError = error;
    }

    await wait(500);
  }

  throw new Error(`Server did not become ready at ${url}: ${lastError?.message ?? "timeout"}`);
}

export async function startToolServer(tool) {
  if (tool.buildCommand) {
    const [buildBin, buildArgs] = tool.buildCommand;
    console.log(`[${tool.id}] running build step`);
    execFileSync(buildBin, buildArgs, {
      cwd: tool.cwd,
      stdio: "inherit",
      env: { ...process.env, BROWSER: "none" },
    });
  }

  const [bin, args] = tool.command;
  const child = spawn(bin, args, {
    cwd: tool.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${tool.id}] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${tool.id}] ${chunk}`);
  });

  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.warn(`[${tool.id}] server exited with code ${code}`);
    }
  });

  const url = `http://127.0.0.1:${tool.port}`;
  await waitForHttp(url, 60_000);

  return {
    url,
    stop() {
      if (!child.killed) child.kill("SIGTERM");
    },
  };
}
