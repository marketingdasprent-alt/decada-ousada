import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import { setupNativeApp } from './lib/native-bootstrap'

void setupNativeApp();

// Reload the page when a new Service Worker takes control (new deploy detected)
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) {
      reloading = true;
      window.location.reload();
    }
  });
}

registerSW({
  onNeedRefresh() {
    console.log('New version found! Reloading...');
    window.location.reload();
  },
  onOfflineReady() {},
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Check every 20 seconds
      setInterval(() => {
        registration.update();
      }, 20 * 1000);

      // Check when user returns to tab
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
    }
  },
});

createRoot(document.getElementById("root")!).render(<App />);
