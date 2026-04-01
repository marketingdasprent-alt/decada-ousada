export type PixelEventParams = Record<string, any>;

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

// Track an event only once per session and route
export function trackEventOnce(eventName: string, params: PixelEventParams = {}, key?: string) {
  try {
    const routeKey = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
    const lockKey = key || `${eventName}@${routeKey}`;
    const storageKey = `fb_event_${lockKey}`;

    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(storageKey)) {
      return; // already tracked in this session/route
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(storageKey, '1');
    }

    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      const eventID = `${eventName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      window.fbq('track', eventName, params, { eventID });
      if (import.meta.env.DEV) {
        console.info(`[Pixel] Tracked ${eventName}`, { params, eventID, lockKey });
      }
    } else if (import.meta.env.DEV) {
      console.warn('[Pixel] fbq not available yet');
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[Pixel] trackEventOnce error', e);
    }
  }
}

export function trackLeadOnce(params: PixelEventParams = {}) {
  trackEventOnce(
    'Lead',
    {
      value: 1,
      content_name: 'Formulário enviado',
      ...params,
    }
  );
}
