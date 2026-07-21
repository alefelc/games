import { readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const testsRoot = resolve(packageRoot, "src/tests");
const vitestCli = resolve(packageRoot, "../node_modules/vitest/vitest.mjs");
const batchSize = Number.parseInt(process.env.TEST_BATCH_SIZE ?? "1", 10);

if (!Number.isInteger(batchSize) || batchSize < 1) {
  throw new Error("TEST_BATCH_SIZE debe ser un entero mayor que cero.");
}

const allTestFiles = readdirSync(testsRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.test\.[cm]?[jt]sx?$/.test(entry.name))
  .map((entry) => relative(packageRoot, resolve(testsRoot, entry.name)))
  .sort((a, b) => a.localeCompare(b));

if (allTestFiles.length === 0) {
  throw new Error("No se encontraron pruebas del frontend.");
}

const shardSpec = process.env.TEST_SHARD?.trim();
let testFiles = allTestFiles;
if (shardSpec) {
  const match = /^(\d+)\/(\d+)$/.exec(shardSpec);
  if (!match) throw new Error("TEST_SHARD debe tener el formato índice/total, por ejemplo 1/4.");
  const shardIndex = Number.parseInt(match[1], 10);
  const shardCount = Number.parseInt(match[2], 10);
  if (shardIndex < 1 || shardCount < 1 || shardIndex > shardCount) {
    throw new Error("TEST_SHARD contiene un índice inválido.");
  }
  testFiles = allTestFiles.filter((_, index) => index % shardCount === shardIndex - 1);
  console.log(`Shard ${shardIndex}/${shardCount}: ${testFiles.length} de ${allTestFiles.length} archivos.`);
}

console.log(`Ejecutando ${testFiles.length} archivos de prueba en lotes de ${batchSize}.`);

for (let index = 0; index < testFiles.length; index += batchSize) {
  const batch = testFiles.slice(index, index + batchSize);
  const batchNumber = Math.floor(index / batchSize) + 1;
  const batchCount = Math.ceil(testFiles.length / batchSize);

  console.log(`\n[frontend ${batchNumber}/${batchCount}] ${batch.join(", ")}`);

  const result = spawnSync(
    process.execPath,
    [vitestCli, "run", ...batch, "--pool=threads", "--maxWorkers=1", "--reporter=dot"],
    {
      cwd: packageRoot,
      env: { ...process.env, NODE_ENV: "test" },
      stdio: "inherit",
      timeout: 120_000,
    },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.signal) {
    throw new Error(`El lote ${batchNumber} terminó por señal ${result.signal}.`);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\nSuite frontend completa: ${testFiles.length} archivos validados sin recursos pendientes.`);
