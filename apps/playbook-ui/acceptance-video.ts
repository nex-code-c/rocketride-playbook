import { readFile } from "node:fs/promises";
import { RocketRideClient } from "rocketride";

// End-to-end acceptance for the video path. The instruction pipeline has
// acceptance-image.ts; this is its counterpart, so "did anyone test video?"
// is answerable by running a command instead of trusting memory.
//
//   corepack pnpm --filter local-playbook acceptance:video -- <video> [fact,fact,...]
//
// A run costs roughly 22 tokens and takes about 30 seconds.

async function loadEnv() {
  const text = await readFile(new URL("../../.env", import.meta.url), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const CAP_MS = 5 * 60 * 1000;

async function main() {
  await loadEnv();
  const videoPath = process.argv[2];
  if (!videoPath) throw new Error("Pass a video path. Optional second argument: comma-separated facts the draft must contain.");
  const required = (process.argv[3] || "").split(",").map((value) => value.trim()).filter(Boolean);

  const pipeline = JSON.parse(await readFile(new URL("./src/process-video.pipe", import.meta.url), "utf8"));
  const video = await readFile(videoPath);
  console.log(`input: ${(video.length / 1048576).toFixed(1)} MB`);

  const client = new RocketRideClient({ requestTimeout: CAP_MS });
  const startedAt = Date.now();
  const elapsed = () => ((Date.now() - startedAt) / 1000).toFixed(1);
  let token: string | undefined;
  let creditsBefore: number | undefined;

  try {
    // Staging DNS is intermittently flaky; a single failure is not a verdict.
    let session: unknown = null;
    for (let attempt = 1; attempt <= 6 && !session; attempt += 1) {
      try { session = await client.connect(); } catch { await new Promise((r) => setTimeout(r, 6000)); }
    }
    if (!session) throw new Error("Could not reach RocketRide after 6 attempts.");
    const orgId = (session as { organization: { id: string } }).organization.id;
    creditsBefore = (await (client as never as { billing: { getCreditBalance(id: string): Promise<{ balances: { tokens: number } }> } })
      .billing.getCreditBalance(orgId)).balances.tokens;

    ({ token } = await client.use({ pipeline, source: "webhook_1", ttl: 900, pipelineTraceLevel: "summary", name: `Video acceptance · ${videoPath}` }));

    // A hung run must never outlive this process — an abandoned pipeline
    // blocks every later run and keeps billing.
    const run = client.send(token, new Uint8Array(video), { name: videoPath.split(/[\\/]/).pop() }, "video/mp4");
    const outcome = await Promise.race([
      run.then((result) => ({ done: true as const, result })),
      new Promise<{ done: false }>((resolve) => setTimeout(() => resolve({ done: false }), CAP_MS)),
    ]);
    if (!outcome.done) throw new Error(`No result within ${CAP_MS / 60000} minutes. The run was terminated.`);

    const serialized = JSON.stringify(outcome.result);
    if (/"error"\s*:/.test(serialized)) throw new Error(`Pipeline returned an error: ${serialized.slice(0, 300)}`);

    const record = JSON.parse(serialized)?.playbook?.[0]?.[0];
    const steps: string[] = record?.steps_json ?? [];
    const ingredients: string[] = record?.ingredients_json ?? [];
    if (!steps.length) throw new Error("No steps were extracted. A silent recording cannot produce a playbook.");

    const missing = required.filter((fact) => !serialized.toLocaleLowerCase().includes(fact.toLocaleLowerCase()));
    if (missing.length) throw new Error(`Draft is missing required facts: ${missing.join(", ")}`);

    console.log(`\nPASS in ${elapsed()}s`);
    console.log(`  title       ${record?.playbook_title}`);
    console.log(`  station     ${record?.station}`);
    console.log(`  steps       ${steps.length}`);
    console.log(`  ingredients ${ingredients.length}`);
    console.log(`  safety      ${(record?.safety_checks_json ?? []).length} (empty is honest when the narration skipped it)`);
    if (record?.confidence_json) console.log(`  confidence  ${JSON.stringify(record.confidence_json)}`);
    await client.terminate(token).catch(() => undefined);
    token = undefined;
  } finally {
    if (token) await client.terminate(token).catch(() => undefined);
    if (creditsBefore !== undefined) {
      try {
        const session = await client.connect().catch(() => null);
        if (session) {
          const orgId = (session as { organization: { id: string } }).organization.id;
          const after = (await (client as never as { billing: { getCreditBalance(id: string): Promise<{ balances: { tokens: number } }> } })
            .billing.getCreditBalance(orgId)).balances.tokens;
          console.log(`  cost        ${(creditsBefore - after).toFixed(1)} tokens`);
        }
      } catch { /* balance is a nicety, not the verdict */ }
    }
    await client.disconnect().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
