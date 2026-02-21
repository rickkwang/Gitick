import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (typeof window !== 'undefined') {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      const shouldReload = window.confirm('A new Gitick version is ready. Reload now?');
      if (shouldReload) {
        void updateSW(true);
      }
    },
    onOfflineReady() {
      console.info('Gitick is ready to work offline.');
    },
  });
}
