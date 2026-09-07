import { readFile } from 'node:fs/promises';
import { RocketRideClient } from 'rocketride';

// release.ts publishes a version that already exists on the rail. This is the
// step before it: pack the app folder, ship it through the registry, and move
// every audience that was serving the old version onto the new one, so a rung
// never gets left behind on a build we just replaced.

async function loadWorkspaceEnv() {
	const text = await readFile(new URL('../../.env', import.meta.url), 'utf8');
	for (const line of text.split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
		if (!match || process.env[match[1]]) continue;
		process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
	}
}

// whereApp already reports the audience in the '@me' / '@team/<name>' form
// publishApp expects. Rebuilding it from the rung produced '@team/@team/Name'
// and '@personal', so a deploy could repoint a target that was not the one
// already serving. Read the handle, do not derive it.
const targetFor = (row: { rung: string; handle?: string }): string => row.handle || (row.rung === 'user' ? '@me' : `@${row.rung}`);

// addApp returns as soon as the bytes are accepted; the server build runs on
// after it. Checking buildStatus immediately caught 'building' and threw
// BEFORE anything was published, which left the new version on the rail
// serving nobody while the deploy reported failure. Wait the build out.
async function settledDeployment(client: RocketRideClient, appId: string) {
	for (let attempt = 1; attempt <= 30; attempt += 1) {
		const [latest] = await client.listDeployments(appId);
		if (!latest) throw new Error('No app deployment exists after addApp.');
		if (latest.buildStatus !== 'building') return latest;
		if (attempt === 1) console.log(`  v${latest.registryVersion} is building...`);
		await new Promise((resolve) => setTimeout(resolve, 10_000));
	}
	throw new Error('The build did not finish within five minutes.');
}

async function deploy() {
	await loadWorkspaceEnv();
	const uri = process.env.ROCKETRIDE_DEPLOY_URI;
	const auth = process.env.ROCKETRIDE_DEPLOY_APIKEY;
	if (!uri || !auth) throw new Error('RocketRide staging deployment credentials are not configured.');

	const appId = 'prabhjeev_sohi.playbook';
	const comment = process.argv[2] || 'Playbook update';
	const client = new RocketRideClient({ uri, auth, requestTimeout: 300_000 });
	try {
		await client.connect();

		const before = await client.whereApp(appId);
		console.log('Serving now:', before.map((row) => `${targetFor(row)} -> v${row.version}`).join(', ') || '(nothing)');

		const verified = await client.deploy.verifyApp('.');
		for (const check of verified.checks.filter((entry) => !entry.ok)) console.error(`  ${check.id}: ${check.note}`);
		if (!verified.ok) throw new Error('verifyApp failed; nothing was deployed.');
		console.log(`Verified ${verified.fileCount} files (${(verified.uncompressedBytes / 1048576).toFixed(1)} MB uncompressed).`);

		await client.deploy.addApp('.', { comment });

		const latest = await settledDeployment(client, appId);
		if (latest.buildStatus !== 'ok') {
			console.error((await client.buildLog(appId, latest.registryVersion)).log.slice(-4000));
			throw new Error(`v${latest.registryVersion} build is ${latest.buildStatus}, not publishable.`);
		}
		console.log(`Deployed v${latest.registryVersion} (${latest.buildStatus}).`);

		const targets = [...new Set(before.map(targetFor))];
		for (const target of targets.length ? targets : ['@me']) {
			await client.publishApp(appId, latest.registryVersion, target);
			console.log(`Published v${latest.registryVersion} to ${target}.`);
		}

		const after = await client.whereApp(appId);
		const stale = after.filter((row) => row.version !== latest.registryVersion);
		if (stale.length) throw new Error(`Still serving an older version on: ${stale.map(targetFor).join(', ')}`);
		console.log(`All audiences serve v${latest.registryVersion}: ${after.map(targetFor).join(', ')}.`);

		// There used to be a fetch of `<uri>/apps/<appId>/v<n>/remoteEntry.js`
		// here, meant to catch a bundle that was published but not yet servable.
		// That path 404s for every version, including ones that have served for
		// days, so it only ever produced false failures. buildStatus 'ok' is the
		// documented "servable bytes exist" signal and whereApp is the authority
		// on bindings; both are checked above. A real end-to-end check has to
		// load the app in the shell — and note the shell prefers a local dev
		// server when dev mode is on for this app, so turn that off first or you
		// will be looking at localhost, not at what you just deployed.
		console.log('Open the app in the shell with dev mode off to confirm the deployed bundle.');
	} finally {
		await client.disconnect();
	}
}

deploy().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
