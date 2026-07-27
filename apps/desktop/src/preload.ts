import { contextBridge, ipcRenderer } from 'electron';

const SAVE_TEXT_FILE_CHANNEL = 'chemsmart:save-text-file';

contextBridge.exposeInMainWorld('chemsmartDesktop', {
  backendBaseUrl: process.env.BACKEND_BASE_URL ?? 'http://127.0.0.1:8000',
  saveTextFile: (request: unknown) => (
    ipcRenderer.invoke(SAVE_TEXT_FILE_CHANNEL, request)
  ),
});
