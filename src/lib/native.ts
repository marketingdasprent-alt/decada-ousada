import { Capacitor } from '@capacitor/core';

const NATIVE_AUTH_WEB_BASE_URL = 'https://decada-ousada.lovable.app';
const NATIVE_DRIVER_ENTRY_ROUTE = '/motorista';
const NATIVE_DRIVER_LOGIN_ROUTE = '/motorista/login';
const NATIVE_DRIVER_PANEL_ROUTE = '/motorista/painel';

export const isNativeApp = () => Capacitor.isNativePlatform();

export const isNativeDriverOnlyMode = () => isNativeApp();

export const isIOSNativeApp = () => isNativeApp() && Capacitor.getPlatform() === 'ios';

export const isAndroidNativeApp = () => isNativeApp() && Capacitor.getPlatform() === 'android';

export const getBaseUrl = () => window.location.origin;

export const getAuthRedirectBaseUrl = () =>
  isNativeApp() ? NATIVE_AUTH_WEB_BASE_URL : getBaseUrl();

export const getNativeEntryRoute = () => NATIVE_DRIVER_ENTRY_ROUTE;

export const getNativeLoginRoute = () => NATIVE_DRIVER_LOGIN_ROUTE;

export const getNativePanelRoute = () => NATIVE_DRIVER_PANEL_ROUTE;

export const getUnauthenticatedRoute = () =>
  isNativeDriverOnlyMode() ? getNativeEntryRoute() : '/login';

export const getPostAuthRoute = () =>
  isNativeDriverOnlyMode() ? getNativePanelRoute() : '/crm';

export const getResetPasswordRedirectUrl = () =>
  `${getAuthRedirectBaseUrl()}/reset-password`;

export const getEmailRedirectUrl = (path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getAuthRedirectBaseUrl()}${normalizedPath}`;
};
