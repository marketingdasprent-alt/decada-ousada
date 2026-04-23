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

registerSW({ onNeedRefresh() {}, onOfflineReady() {} });

createRoot(document.getElementById("root")!).render(<App />);
