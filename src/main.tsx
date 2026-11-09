import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Modo offline: registra o service worker (somente no build de produção)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // Garante que os arquivos já carregados nesta primeira visita fiquem guardados para uso offline
        const urls = performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .filter((u) => u.startsWith(location.origin) || u.includes('fonts.g'));
        reg.active?.postMessage({ type: 'CACHE_URLS', urls: [location.origin + '/', ...urls] });
      })
      .catch((err) => {
      console.warn('Service worker não registrado (modo offline indisponível):', err);
    });
  });
}
