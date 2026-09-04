import { readFile } from 'node:fs/promises';
import { RocketRideClient } from 'rocketride';

async function loadWorkspaceEnv() {
	const text = await readFile(new URL('../../.env', import.meta.url), 'utf8');
	for (const line of text.split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
		if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
	}
}

async function submit() {
	await loadWorkspaceEnv();
	const uri = process.env.ROCKETRIDE_DEPLOY_URI;
	const auth = process.env.ROCKETRIDE_DEPLOY_APIKEY;
	if (!uri || !auth) throw new Error('RocketRide deployment credentials are not configured.');
	const appId = 'prabhjeev_sohi.playbook';
	const client = new RocketRideClient({ uri, auth });
	try {
		await client.connect();
		const latest = (await client.listDeployments(appId))[0];
		if (!latest || latest.buildStatus !== 'ok') throw new Error('The latest app version is not healthy.');
		if (!latest.rungs.some((rung) => rung === 'user' || rung === '@me')) throw new Error('Publish the latest version to the user audience before review.');
		if (latest.state === 'private') await client.submitApp(appId, latest.registryVersion);
		const confirmed = (await client.listDeployments(appId))[0];
		if (confirmed.state !== 'submit' && confirmed.state !== 'ready') throw new Error(`Unexpected review state: ${confirmed.state}`);
		console.log(`App v${confirmed.registryVersion} review state: ${confirmed.state}.`);
	} finally {
		await client.disconnect();
	}
}

submit().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
