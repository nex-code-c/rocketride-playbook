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

function targetFor(rung: string, handle?: string): string {
	if (rung === 'user') return '@me';
	if (rung === 'team') return `@team/${handle}`;
	return `@${rung}`;
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
		console.log('Serving now:', before.map((row) => `${targetFor(row.rung, row.handle)} -> v${row.version}`).join(', ') || '(nothing)');

		const verified = await client.deploy.verifyApp('.');
		for (const check of verified.checks.filter((entry) => !entry.ok)) console.error(`  ${check.id}: ${check.note}`);
		if (!verified.ok) throw new Error('verifyApp failed; nothing was deployed.');
		console.log(`Verified ${verified.fileCount} files (${(verified.uncompressedBytes / 1048576).toFixed(1)} MB uncompressed).`);

		await client.deploy.addApp('.', { comment });

		const [latest] = await client.listDeployments(appId);
		if (!latest) throw new Error('No app deployment exists after addApp.');
		if (latest.buildStatus !== 'ok') {
			console.error((await client.buildLog(appId, latest.registryVersion)).log.slice(-4000));
			throw new Error(`v${latest.registryVersion} build is ${latest.buildStatus}, not publishable.`);
		}
		console.log(`Deployed v${latest.registryVersion} (${latest.buildStatus}).`);

		const targets = [...new Set(before.map((row) => targetFor(row.rung, row.handle)))];
		for (const target of targets.length ? targets : ['@me']) {
			await client.publishApp(appId, latest.registryVersion, target);
			console.log(`Published v${latest.registryVersion} to ${target}.`);
		}

		const after = await client.whereApp(appId);
		const stale = after.filter((row) => row.version !== latest.registryVersion);
		if (stale.length) throw new Error(`Still serving an older version on: ${stale.map((row) => targetFor(row.rung, row.handle)).join(', ')}`);

		// buildStatus can report ok before the bundle is actually servable, so
		// ask for the real asset rather than trusting the status alone.
		const assetUrl = `${uri.replace(/:443$/, '')}/apps/${appId}/v${latest.registryVersion}/remoteEntry.js`;
		for (let attempt = 1; attempt <= 12; attempt += 1) {
			const response = await fetch(assetUrl).catch(() => undefined);
			if (response && response.ok) {
				console.log(`Bundle is serving (${assetUrl}).`);
				return;
			}
			console.log(`  waiting for the bundle to serve (attempt ${attempt}: ${response ? response.status : 'no response'})`);
			await new Promise((resolve) => setTimeout(resolve, 10_000));
		}
		throw new Error(`v${latest.registryVersion} is published but ${assetUrl} is not serving yet.`);
	} finally {
		await client.disconnect();
	}
}

deploy().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
