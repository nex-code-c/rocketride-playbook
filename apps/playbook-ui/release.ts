import { readFile } from 'node:fs/promises';
import { RocketRideClient } from 'rocketride';

async function loadWorkspaceEnv() {
	const text = await readFile(new URL('../../.env', import.meta.url), 'utf8');
	for (const line of text.split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
		if (!match || process.env[match[1]]) continue;
		process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
	}
}

async function release() {
	await loadWorkspaceEnv();
	const uri = process.env.ROCKETRIDE_DEPLOY_URI;
	const auth = process.env.ROCKETRIDE_DEPLOY_APIKEY;
	if (!uri || !auth) throw new Error('RocketRide staging deployment credentials are not configured.');

	const appId = 'prabhjeev_sohi.playbook';
	const client = new RocketRideClient({ uri, auth });
	try {
		await client.connect();
		const deployments = await client.listDeployments(appId);
		const latest = deployments[0];
		if (!latest) throw new Error('No app deployment exists.');
		if (latest.buildStatus !== 'ok') throw new Error(`Latest deployment v${latest.registryVersion} is ${latest.buildStatus}, not publishable.`);
		await client.publishApp(appId, latest.registryVersion, '@me');
		const confirmed = (await client.listDeployments(appId)).find((item) => item.registryVersion === latest.registryVersion);
		if (!confirmed?.rungs.some((rung) => rung === '@me' || rung === 'user')) throw new Error('Staging publish was not visible on the deployment rail.');
		console.log(`Published ${appId} v${latest.registryVersion} to @me.`);
	} finally {
		await client.disconnect();
	}
}

release().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
