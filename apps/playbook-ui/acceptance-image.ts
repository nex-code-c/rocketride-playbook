import { readFile } from "node:fs/promises";
import { RocketRideClient } from "rocketride";

async function loadEnv() {
  const text = await readFile(new URL("../../.env", import.meta.url), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

async function main() {
  await loadEnv();
  const imagePath = process.argv[2];
  if (!imagePath) throw new Error("Pass an image path.");
  const pipeline = JSON.parse(await readFile(new URL("./src/process-instructions.pipe", import.meta.url), "utf8"));
  const image = await readFile(imagePath);
  const client = new RocketRideClient({ requestTimeout: 180_000 });
  await client.connect();
  try {
    const { token } = await client.use({ pipeline, source: "webhook_1", ttl: 300, pipelineTraceLevel: "summary", name: "Playbook acceptance · handwritten instructions" });
    const result = await client.send(token, new Uint8Array(image), { name: "handwritten-jasmine-batch.png", source_type: "written_instructions" }, "image/png");
    const serialized = JSON.stringify(result);
    const required = ["JASMINE", "40", "195", "8", "300", "41", "4", "milk"];
    const missing = required.filter((value) => !serialized.toLocaleLowerCase().includes(value.toLocaleLowerCase()));
    if (missing.length) throw new Error(`Pipeline result missed required facts: ${missing.join(", ")}\n${serialized}`);
    console.log("Handwritten-image pipeline acceptance passed.");
    console.log(serialized);
    await client.terminate(token).catch(() => undefined);
  } finally {
    await client.disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
