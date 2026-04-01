import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import { setupNativeApp } from './lib/native-bootstrap'

void setupNativeApp();

// Auto-reload when a new Service Worker is installed
registerSW({ onNeedRefresh() {}, onOfflineReady() {} });

createRoot(document.getElementById("root")!).render(<App />);
