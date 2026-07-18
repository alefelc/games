import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GA4 runtime config", () => {
  it("loads runtime-config.js before the application", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const runtimeIndex = html.indexOf("runtime-config.js");
    const appIndex = html.indexOf("/src/main.tsx");
    expect(runtimeIndex).toBeGreaterThan(-1);
    expect(appIndex).toBeGreaterThan(runtimeIndex);
  });

  it("supports GA4 runtime environment generation", () => {
    const dockerfile = readFileSync(resolve(process.cwd(), "Dockerfile"), "utf8");
    const script = readFileSync(
      resolve(process.cwd(), "deploy/40-runtime-config.sh"),
      "utf8",
    );
    expect(dockerfile).toContain("GA4_MEASUREMENT_ID");
    expect(dockerfile).toContain("40-runtime-config.sh");
    expect(script).toContain("runtime-config.js");
    expect(script).toContain("^G-[A-Z0-9]{4,20}$");
    const viteConfig = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
    expect(viteConfig).toContain("globIgnores: [\"**/runtime-config.js\"]");
  });
});
