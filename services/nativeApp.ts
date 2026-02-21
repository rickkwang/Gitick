import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNativePlatform = () => Capacitor.isNativePlatform();

export const getRuntimePlatform = () => Capacitor.getPlatform();

export const initNativeAppShell = async () => {
  if (!Capacitor.isNativePlatform()) return;

  await Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => undefined);
  await SplashScreen.hide().catch(() => undefined);
};

export const syncStatusBarWithTheme = async (isDarkMode: boolean) => {
  if (!Capacitor.isNativePlatform()) return;

  await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
  await StatusBar.setStyle({ style: isDarkMode ? Style.Light : Style.Dark }).catch(() => undefined);
  await StatusBar.setBackgroundColor({ color: isDarkMode ? '#09090b' : '#ffffff' }).catch(() => undefined);
};

export const registerAndroidBackButton = (
  onBackButton: (canGoBack: boolean) => boolean,
): (() => void) => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return () => undefined;
  }

  let removed = false;
  let listener: Awaited<ReturnType<typeof CapacitorApp.addListener>> | null = null;

  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (onBackButton(canGoBack)) {
      return;
    }

    if (canGoBack) {
      window.history.back();
      return;
    }

    void CapacitorApp.minimizeApp();
  }).then((registeredListener) => {
    listener = registeredListener;
    if (removed) {
      void listener.remove();
    }
  });

  return () => {
    removed = true;
    if (listener) {
      void listener.remove();
    }
  };
};
