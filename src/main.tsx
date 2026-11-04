import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { hidrasiCacheFoto } from './lib/fotoCache';

const tampilkan = () => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Muat dulu foto tersimpan dari Cache Storage (maks. 800 ms) supaya tampilan pertama sudah memakai
// salinan lokal dan tidak meminta ulang foto ke server setiap aplikasi dibuka.
Promise.race([hidrasiCacheFoto(), new Promise((r) => setTimeout(r, 800))]).catch(() => undefined).finally(tampilkan);
