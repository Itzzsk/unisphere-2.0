const CACHE_NAME = 'unisphere-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('📱 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Push event - Universal mobile support
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event);
  
  if (!event.data) {
    console.log('📱 Push event received but no data');
    return;
  }
  
  let data;
  try {
    data = event.data.json();
    console.log('📱 Push data parsed:', data);
  } catch (e) {
    console.log('📱 Push data as text:', event.data.text());
    data = { title: 'UniSphere', body: event.data.text() };
  }
  
  const options = {
    body: data.body || 'New update from UniSphere',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || `unisphere-${Date.now()}`,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data || { url: '/' },
    actions: [
      {
        action: 'view',
        title: '👁️ View',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: '❌ Close'
      }
    ]
  };
  
  // Add mobile-specific enhancements
  if (self.registration.showNotification) {
    event.waitUntil(
      self.registration.showNotification(data.title || 'UniSphere', options)
    );
  }
});

// Notification click event - Universal handling
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Universal window handling for all mobile browsers
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      console.log('📱 Found clients:', clientList.length);
      
      // Look for existing UniSphere window
      for (let client of clientList) {
        if (client.url.includes(self.location.origin)) {
          console.log('📱 Focusing existing window');
          if ('focus' in client) {
            return client.focus();
          }
        }
      }
      
      // Open new window if none found
      if (clients.openWindow) {
        console.log('📱 Opening new window');
        return clients.openWindow('/');
      }
    }).catch((err) => {
      console.error('📱 Error handling notification click:', err);
    })
  );
});

// Background sync for offline support
self.addEventListener('sync', (event) => {
  console.log('📱 Background sync:', event.tag);
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Sync any pending data when connection is restored
  console.log('📱 Performing background sync');
}

// Fetch event - Universal caching
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache static assets
          if (event.request.url.includes('tailwindcss') || 
              event.request.url.includes('font-awesome') ||
              event.request.url.includes('.css') ||
              event.request.url.includes('.js')) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          
          return response;
        });
      }).catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

console.log('📱 Service Worker script loaded');
