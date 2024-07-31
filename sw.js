const VERSION = "v44";
const CACHE_NAME = `pwamp-${VERSION}`;

// Those are all the resources our app needs to work.
// We'll cache them on install.
const INITIAL_CACHED_RESOURCES = [
  "./",
  "./viesw//index.html", 
  "./public/style.css",
  "./public/adapter.js",
  "./public/client.js",
  "./app.js",
  "./chatserver.js"
  
];

// Add a cache-busting query string to the pre-cached resources.
// This is to avoid loading these resources from the disk cache.
const INITIAL_CACHED_RESOURCES_WITH_VERSIONS = INITIAL_CACHED_RESOURCES.map(path => {
  return `${path}?v=${VERSION}`;
});

// On install, fill the cache with all the resources we know we need.
// Install happens when the app is used for the first time, or when a
// new version of the SW is detected by the browser.
// In the latter case, the old SW is kept around until the new one is
// activated by a new client.
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    cache.addAll(INITIAL_CACHED_RESOURCES_WITH_VERSIONS);
  })());
});

// Activate happens after install, either when the app is used for the
// first time, or when a new version of the SW was installed.
// We use the activate event to delete old caches and avoid running out of space.
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(name => {
      if (name !== CACHE_NAME) {
        return caches.delete(name);
      }
    }));
    await clients.claim();
  })());
});

// Main fetch handler.
// A cache-first strategy is used, with a fallback to the network.
// The static resources fetched here will not have the cache-busting query
// string. So we need to add it to match the cache.
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Don't care about other-origin URLs.
  if (url.origin !== location.origin) {
    return;
  }

  // Don't care about anything else than GET.
  if (event.request.method !== 'GET') {
    return;
  }

  // Don't care about widget requests.
 
  // On fetch, go to the cache first, and then network.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const versionedUrl = `${event.request.url}?v=${VERSION}`;
    const cachedResponse = await cache.match(versionedUrl);

    if (cachedResponse) {
      return cachedResponse;
    } else {
      const fetchResponse = await fetch(versionedUrl);
      cache.put(versionedUrl, fetchResponse.clone());
      return fetchResponse;
    }
  })());
});

// Special fetch handler for song file sharing.
self.addEventListener('fetch', event => {

});

// Handle the mini-player widget updates in another script.
importScripts('./sw-widgets.js');