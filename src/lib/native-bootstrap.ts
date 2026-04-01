import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { getNativeEntryRoute, getNativePanelRoute, isNativeApp } from '@/lib/native';

const ROOT_EXIT_ROUTES = new Set([getNativeEntryRoute(), getNativePanelRoute(), '/']);
const NATIVE_BACK_FALLBACK_ROUTES = new Set(['/motorista/login', '/motorista/registo', '/reset-password']);

export const setupNativeApp = async () => {
  if (!isNativeApp()) return;

  document.documentElement.setAttribute('data-native-app', 'true');

  try {
    await StatusBar.show();
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#000000' });
  } catch (error) {
    console.warn('[native] Não foi possível configurar a status bar.', error);
  }

  try {
    await SplashScreen.hide();
  } catch (error) {
    console.warn('[native] Não foi possível esconder a splash screen.', error);
  }

  try {
    await CapacitorApp.addListener('resume', async () => {
      document.dispatchEvent(new CustomEvent('native-app-resume'));
    });

    await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      if (!url) return;

      try {
        const parsedUrl = new URL(url);
        const nextRoute = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;

        if (!nextRoute) return;

        window.history.pushState({}, '', nextRoute);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (error) {
        console.warn('[native] URL aberta inválida.', error);
      }
    });

    await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const currentPath = window.location.pathname;

      if (canGoBack && !ROOT_EXIT_ROUTES.has(currentPath)) {
        window.history.back();
        return;
      }

      if (!canGoBack && NATIVE_BACK_FALLBACK_ROUTES.has(currentPath)) {
        window.history.replaceState({}, '', getNativeEntryRoute());
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      void CapacitorApp.exitApp();
    });
  } catch (error) {
    console.warn('[native] Não foi possível registar listeners nativos.', error);
  }
};
