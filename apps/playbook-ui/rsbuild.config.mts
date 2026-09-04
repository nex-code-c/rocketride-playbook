// =============================================================================
// MIT License
// Copyright (c) 2026 Aparavi Software AG
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

// Module Federation remote: the shell loads ./AppDescriptor at runtime.
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const moduleId = (pkg.appManifest?.id ?? 'unknown').replace(/[^a-zA-Z0-9_$]/g, '_');

export default defineConfig(() => ({
	resolve: {
		// The published shell root also exports server-oriented modules that read
		// Node's `process.env` as soon as the bundle is evaluated. Apps run in a
		// browser webview, so bind the runtime import to the small AppLayout
		// compatibility module; TypeScript still uses the official shell types.
		alias: {
			shell: path.resolve(__dirname, 'vendor/shell/index.js'),
		},
	},
	plugins: [
		pluginReact(),
		pluginModuleFederation({
			name: moduleId,
			filename: 'remoteEntry.js',
			exposes: { './AppDescriptor': './src/AppDescriptor.ts' },
			dts: false,
			// runtime: false — the host (the shell) provides the MF runtime;
			// remotes don't embed their own copy, keeping remoteEntry.js
			// stable across app-code-only rebuilds.
			runtime: false,
			// loaded-first: use the host's already-loaded shared instances
			// instead of version-first's boot-time download of EVERY registered
			// remoteEntry.js just to compare shared versions (everything here
			// is singleton + co-deployed).
			shareStrategy: 'loaded-first',
			shared: {
				react: { singleton: true, eager: true, requiredVersion: '^18.2.0' },
				'react-dom': { singleton: true, eager: true, requiredVersion: '^18.2.0' },
				// AppLayout is bundled from the local shell compatibility package so
				// Design preview also works without a host-provided shell module.
				// RocketRide is bundled by the app so standalone QA and recovery
				// previews do not depend on a host-provided share registration.
				// react-refresh/runtime is deliberately NOT shared: the app's
				// own copy late-attaches to the devtools hook the dev-flavor
				// shell created BEFORE react-dom loaded (injectIntoGlobalHook
				// supports coexisting copies), and MF eager-consume of it
				// inside a remote hard-fails the container.
			},
		}),
	],
	// Treat .pipe files as JSON so pipeline definitions can be imported and
	// passed to client.use({ pipeline }) — the browser has no filesystem, so
	// filepath loading is Node-only.
	// `as const` keeps the rule's `type` a literal for the config typecheck.
	tools: {
		rspack: {
			module: {
				rules: [{ test: /\.pipe$/, type: 'json' } as const],
			},
		},
	},
	// CORS: explicitly allow any origin — the serving host isn't fixed, so no
	// allowlist is possible; declaring it also stops the MF plugin injecting
	// its own wildcard defaults (and warning about it).
	server: { port: 3452, cors: { origin: '*' } },
	// hmr on; liveReload stays at its DEFAULT (true): a failed hot update
	// that rejects check() falls back to a full reload of the preview page.
	// (The historic reload loop came from zombie multi-container HMR clients,
	// gone since dev-remote injection became once-per-page; the silent-freeze
	// class is prevented at the source by the AppDescriptor jsx anchor.)
	// lazyCompilation stays off: compile-on-request made every served bundle
	// one hash behind, so the dev client always saw itself as stale.
	// client: the bundle runs INSIDE the preview shell's page (a different
	// origin) — without an explicit host the client derives its WebSocket URL
	// from that page's location and never reaches this dev server. '<port>'
	// is rsbuild's runtime placeholder for the ACTUAL port, so dynamic port
	// assignment keeps working.
	dev: { hmr: true, lazyCompilation: false, client: { protocol: 'ws', host: 'localhost', port: '<port>' } as const },
	source: { entry: { index: './src/index.ts' } },
	output: { assetPrefix: 'auto' },
}));
