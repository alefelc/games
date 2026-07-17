import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("compilación y proxy adaptativo v2.13.0", () => {
  it("acepta una URL directa durante el build sin fijarla en el código", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");

    expect(dockerfile).toContain("ARG VITE_GAME_MASTER_URL=");
    expect(dockerfile).toContain(
      "VITE_GAME_MASTER_URL=${VITE_GAME_MASTER_URL}",
    );
  });

  it("permite configurar el destino del proxy en tiempo de ejecución", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const nginxTemplate = readFileSync("deploy/default.conf.template", "utf8");

    expect(dockerfile).toContain(
      "ENV GAME_MASTER_UPSTREAM=https://gm.teanimas.com",
    );
    expect(dockerfile).toContain(
      "COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template",
    );
    expect(nginxTemplate).toContain("proxy_pass ${GAME_MASTER_UPSTREAM}/;");
  });
});
