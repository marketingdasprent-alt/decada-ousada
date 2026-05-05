import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import { setupNativeApp } from './lib/native-bootstrap'
import { Capacitor } from '@capacitor/core'

void setupNativeApp();

// Service Worker só na web — na app nativa causa tela branca e reloads em loop
if (!Capacitor.isNativePlatform()) {
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
        setInterval(() => {
          registration.update();
        }, 20 * 1000);

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update();
          }
        });
      }
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
