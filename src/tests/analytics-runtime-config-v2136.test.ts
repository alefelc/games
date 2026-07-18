import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GA4 integrado R14", () => {
  it("la aplicación no depende de runtime-config.js", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    expect(html).not.toContain('<script src="%BASE_URL%runtime-config.js"></script>');
    expect(html).toContain('/src/main.tsx');
  });

  it("incluye el ID real como fallback compilado", () => {
    const analytics = readFileSync(
      resolve(process.cwd(), "src/lib/analytics.ts"),
      "utf8",
    );
    expect(analytics).toContain('EMBEDDED_MEASUREMENT_ID = "G-8CMSB2VYC8"');
  });

  it("conserva un archivo estático solo para diagnóstico", () => {
    const runtime = readFileSync(
      resolve(process.cwd(), "public/runtime-config.js"),
      "utf8",
    );
    expect(runtime).toContain('G-8CMSB2VYC8');
    expect(runtime).toContain('embedded-r14');
  });
  it("la plantilla Nginx define una sola ruta de diagnóstico", () => {
    const nginx = readFileSync(
      resolve(process.cwd(), "deploy/default.conf.template"),
      "utf8",
    );
    const matches = nginx.match(/location = \/runtime-config\.js/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(nginx).toContain("try_files $uri =404");
  });

});
