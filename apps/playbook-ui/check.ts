import { readFile } from 'node:fs/promises';
import { RocketRideClient } from 'rocketride';

async function loadWorkspaceEnv() {
	const envUrl = new URL('../../.env', import.meta.url);
	const text = await readFile(envUrl, 'utf8').catch(() => '');
	for (const line of text.split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
		if (!match || process.env[match[1]]) continue;
		process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
	}
}

 async function check() {
	await loadWorkspaceEnv();
	const pipelineFiles = ['./src/process-video.pipe', './src/process-instructions.pipe'];
	const required = ['ROCKETRIDE_URI', 'ROCKETRIDE_APIKEY'];
	const providerKeys = ['ROCKETRIDE_GROQ_KEY'];
	const missing = required.filter((name) => !process.env[name]);

	if (missing.length) {
		throw new Error(`Missing environment variables: ${missing.join(', ')}`);
	}
	const missingProviders = providerKeys.filter((name) => !process.env[name]);
	if (missingProviders.length) {
		console.warn(`AI upload acceptance is blocked until these provider keys are configured: ${missingProviders.join(', ')}`);
	}

	const client = new RocketRideClient();
	try {
		await client.connect();
		for (const pipelineFile of pipelineFiles) {
			const pipeline = JSON.parse(await readFile(new URL(pipelineFile, import.meta.url), 'utf8')) as Record<string, unknown>;
			const result = await client.validate({ pipeline });
			if (result.errors.length) {
				throw new Error(`${pipelineFile} validation failed:\n${result.errors.map(String).join('\n')}`);
			}
			if (result.warnings.length) console.warn(`${pipelineFile} warnings:`, result.warnings);
		}
		const directory = await client.fsStat('playbook');
		if (!directory.exists) await client.fsMkdir('playbook');
		const probePath = 'playbook/setup-check.json';
		const probe = { app: 'playbook', checkedAt: new Date().toISOString() };
		await client.fsWriteJson(probePath, probe);
		const stored = await client.fsReadJson<typeof probe>(probePath);
		if (stored.app !== probe.app || stored.checkedAt !== probe.checkedAt) {
			throw new Error('Staging persistence round trip returned unexpected data.');
		}
		const signedUrl = await client.fsGetUrl(probePath, 60);
		const publicResponse = await fetch(signedUrl);
		const publicStored = await publicResponse.json() as typeof probe;
		if (!publicResponse.ok || publicStored.checkedAt !== probe.checkedAt) {
			throw new Error('Signed worker snapshot URL could not be read without the SDK.');
		}
		await client.fsDelete(probePath);
		console.log('Playbook setup is ready.');
	} finally {
		await client.disconnect();
	}

	if (process.env.ROCKETRIDE_DEPLOY_URI && process.env.ROCKETRIDE_DEPLOY_APIKEY) {
		const deployClient = new RocketRideClient({
			uri: process.env.ROCKETRIDE_DEPLOY_URI,
			auth: process.env.ROCKETRIDE_DEPLOY_APIKEY,
		});
		try {
			await deployClient.connect();
			const deployments = await deployClient.listDeployments('prabhjeev_sohi.playbook');
			const latest = deployments[0];
			if (latest) console.log(`Latest app deployment: v${latest.registryVersion} (${latest.buildStatus}, ${latest.state}); rungs: ${latest.rungs.join(', ') || 'none'}`);
		} finally {
			await deployClient.disconnect();
		}
	}
}

check().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
