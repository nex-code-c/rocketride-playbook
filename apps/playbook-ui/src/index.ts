// =============================================================================
// MIT License
// Copyright (c) 2026 Aparavi Software AG
// =============================================================================

// Module Federation still exposes AppDescriptor for the RocketRide host. The
// development entry also mounts the app so localhost is a useful standalone
// preview instead of an empty generated HTML page.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (container) {
	createRoot(container).render(React.createElement(React.StrictMode, null, React.createElement(App)));
}

// App Builder keeps its iframe hidden until a preview shell announces that it
// is ready. In standalone compatibility mode this entry is the shell, so send
// the same handshake after mounting. The app is already loaded locally and
// does not need the later remote-registration message.
if (window.parent !== window) {
	const announceReady = () => window.parent.postMessage({ type: 'shell:devReady' }, '*');
	// The parent installs its listener in a React effect after committing the
	// iframe. Repeat briefly so a fast localhost load cannot win that race.
	announceReady();
	window.setTimeout(announceReady, 100);
	window.setTimeout(announceReady, 500);
	window.setTimeout(announceReady, 1500);
	window.addEventListener('message', (event) => {
		if (event.data?.type === 'rrdev:auth' || event.data?.type === 'rrdev:registerRemote') {
			announceReady();
		}
	});
}

import('./AppDescriptor');
