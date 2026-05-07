import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = 'https://dcede7f4-c9ad-4be0-b601-049f64aa866a.lovableproject.com?forceHideBadge=true';
const useLiveReload = process.env.CAPACITOR_LIVE_RELOAD === 'true';

const config: CapacitorConfig = {
  appId: 'com.wegest.myapp',
  appName: 'WeGest',
  webDir: 'dist',
  ...(useLiveReload
    ? {
        server: {
          url: liveReloadUrl,
          cleartext: true,
        },
      }
    : {}),
};

export default config;
