import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('chemsmartDesktop', {
  backendBaseUrl: process.env.BACKEND_BASE_URL ?? 'http://127.0.0.1:8000',
});
