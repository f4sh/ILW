// PWA Service Worker
const CACHE_NAME = `${self.location.pathname}`;

// PWA Install Functionality
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      // Fetch the manifest file
      const manifestResponse = await fetch('./manifest.json');
      const manifest = await manifestResponse.json();

      // Extract the resources you want to cache from the manifest
      const resources = [manifest.start_url, ...manifest.icons.map(icon => icon.src)];

      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([...resources, 
        './index.html',
      ]);
    } catch (err) {
      console.error('Error during service worker installation:', err);
    }
  })());
});

async function evaluateAndCache(request, event) {
  // Fetch and parse the manifest.json file
  const manifestResponse = await fetch('./manifest.json');
  const manifest = await manifestResponse.json();
  // Use event if provided, otherwise use the global event
  event = event || self;
  // Try to get the response from the network
  const fetchResponse = await fetch(event.request);
  // Try to get the response from the cache
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(event.request);

  if (cachedResponse) {
    // Compare the network response with the cached response
    const fetchResponseClone = fetchResponse.clone();
    const fetchResponseText = await fetchResponseClone.text();
    const cachedResponseClone = cachedResponse.clone();
    const cachedResponseText = await cachedResponseClone.text();

    if (fetchResponseText !== cachedResponseText) {
      // If the network response is different from the cached response, update the cache
      await cache.put(request, fetchResponse.clone());
    }
  } else {
    // If the response is not in the cache, put it in the cache
    await cache.put(request, fetchResponse.clone());
  }

  // Preserve the contentType
  const url = new URL(request.url);
  const extension = url.pathname.split('.').pop();
  let contentType = '';
  switch (extension) {
    case 'html':
      contentType = 'text/html';
      break;
    case 'css':
      contentType = 'text/css';
      break;
    case 'js':
      contentType = 'application/javascript';
      break;
    case 'png':
      contentType = 'image/png';
      break;
    case 'json':
        contentType = 'application/json';
      break;
    case 'webmanifest':
        contentType = 'application/manifest+json';
      break;
    // Add more cases as needed
  }
  // This code seeks to solve some content header issues
  const newResponse = new Response(fetchResponse.body, {
    status: fetchResponse.status,
    statusText: fetchResponse.statusText,
    headers: {'Content-Type': contentType}
  });

  return newResponse;
}

// PWA Offline Functionality
self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    try {
      const fetchResponse = await evaluateAndCache(event.request, event);
      return fetchResponse;
    } catch (e) {
      // The network request failed, try to get the result from the cache
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        // Return the cached response if available
        return cachedResponse;
      } else {
        // If the requested resource is not in the cache, try to serve index.html
        const cachedIndex = await cache.match('./index.html');
        if (cachedIndex) {
          return cachedIndex;
        }
      }
    }
  })());
});

// Use with Sync Functionality
async function fetchNewContent(event) {
  // Fetch and parse the manifest.json file
  const manifestResponse = await fetch('./manifest.json');
  const manifest = await manifestResponse.json();

  // Extract the resources you want to fetch from the manifest
  const resources = [manifest.start_url, ...manifest.icons.map(icon => icon.src)];

  const cache = await caches.open(CACHE_NAME);

  // Fetch all resources in parallel
  await Promise.all(resources.map(async resource => {
    try {
      const request = new Request(self.location.pathname + resource);
      await evaluateAndCache(request, event);
    } catch (e) {
      console.error(`Failed to fetch ${resource}: ${e}`);
    }
  }));
}
// PWA Background Sync Functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'fetch-new-content') {
    event.waitUntil(fetchNewContent(event));
  }
});
// PWA Periodic Sync Functionality
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'fetch-new-content') {
    event.waitUntil(fetchNewContent(event));
  }
});
// Cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (CACHE_NAME !== cacheName) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Claim the clients to make sure the active service worker is used
  );
});