// Service Worker for Dalmore Reserve Management App
// Provides basic offline functionality and caching

const CACHE_NAME = 'dalmore-reserve-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
];

// OpenStreetMap tiles for Dalmore Reserve area
const MAP_TILE_CACHE = 'dalmore-map-tiles-v1';
const DALMORE_BOUNDS = {
  minLat: -45.852826543870805,
  maxLat: -45.847403070036805,
  minLng: 170.5130252634806,
  maxLng: 170.5209751820489,
  zoom: [16, 17, 18, 19, 20]
};

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_URLS.map(url => new Request(url, { credentials: 'same-origin' })));
      }),
      
      // Pre-cache essential map tiles for Dalmore Reserve
      cacheMapTiles()
    ])
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== MAP_TILE_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Ensure service worker takes control immediately
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (isMapTileRequest(url)) {
    event.respondWith(handleMapTileRequest(request));
  } else if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAssetRequest(request)) {
    event.respondWith(handleStaticAssetRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Check if request is for map tiles
function isMapTileRequest(url) {
  return url.hostname.includes('tile.openstreetmap.org') || 
         url.hostname.includes('tiles') ||
         url.pathname.includes('/tile/');
}

// Check if request is for API
function isApiRequest(url) {
  return url.hostname.includes('supabase') ||
         url.hostname.includes('cloudinary') ||
         url.pathname.includes('/api/');
}

// Check if request is for static assets
function isStaticAssetRequest(request) {
  return request.destination === 'script' ||
         request.destination === 'style' ||
         request.destination === 'image' ||
         request.destination === 'font';
}

// Handle map tile requests
async function handleMapTileRequest(request) {
  const cache = await caches.open(MAP_TILE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Map tile request failed, serving placeholder');
    return new Response('', { status: 204 });
  }
}

// Handle API requests
async function handleApiRequest(request) {
  try {
    // Always try network first for API requests
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // For GET requests, try to serve cached data
    if (request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline indicator for failed API requests
    return new Response(
      JSON.stringify({ 
        error: 'Network unavailable', 
        offline: true,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static asset requests
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Static asset request failed:', request.url);
    throw error;
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Serve cached index.html for navigation requests when offline
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match('/index.html');
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Pre-cache map tiles for Dalmore Reserve
async function cacheMapTiles() {
  const cache = await caches.open(MAP_TILE_CACHE);
  const tilesToCache = [];
  
  // Generate tile URLs for Dalmore Reserve bounds
  DALMORE_BOUNDS.zoom.forEach(z => {
    const minTileX = Math.floor((DALMORE_BOUNDS.minLng + 180) / 360 * Math.pow(2, z));
    const maxTileX = Math.floor((DALMORE_BOUNDS.maxLng + 180) / 360 * Math.pow(2, z));
    const minTileY = Math.floor((1 - Math.log(Math.tan(DALMORE_BOUNDS.maxLat * Math.PI / 180) + 1 / Math.cos(DALMORE_BOUNDS.maxLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    const maxTileY = Math.floor((1 - Math.log(Math.tan(DALMORE_BOUNDS.minLat * Math.PI / 180) + 1 / Math.cos(DALMORE_BOUNDS.minLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    
    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        tilesToCache.push(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
      }
    }
  });
  
  // Cache tiles in batches to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < tilesToCache.length; i += batchSize) {
    const batch = tilesToCache.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (tileUrl) => {
        try {
          const response = await fetch(tileUrl);
          if (response.ok) {
            await cache.put(tileUrl, response);
          }
        } catch (error) {
          console.log('Failed to cache tile:', tileUrl);
        }
      })
    );
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`Service Worker: Cached ${tilesToCache.length} map tiles for Dalmore Reserve`);
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    // This would sync any locally stored data that couldn't be uploaded while offline
    // Implementation would depend on your local storage strategy
    console.log('Service Worker: Syncing offline data...');
    
    // Example: Sync offline GPS tracks, photos, etc.
    // const offlineData = await getOfflineData();
    // await uploadOfflineData(offlineData);
    
    console.log('Service Worker: Offline data sync completed');
  } catch (error) {
    console.error('Service Worker: Failed to sync offline data:', error);
  }
}

// Handle push notifications (for future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: data.data,
      tag: data.tag,
      requireInteraction: false,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  );
});