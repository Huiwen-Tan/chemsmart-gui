import { contextBridge, ipcRenderer } from 'electron';

const CHOOSE_DOCUMENT_FILE_CHANNEL = 'chemsmart:choose-document-file';
const SAVE_TEXT_FILE_CHANNEL = 'chemsmart:save-text-file';

contextBridge.exposeInMainWorld('chemsmartDesktop', {
  backendBaseUrl: process.env.BACKEND_BASE_URL ?? 'http://127.0.0.1:8000',
  chooseDocumentPath: () => (
    ipcRenderer.invoke(CHOOSE_DOCUMENT_FILE_CHANNEL)
  ),
  saveTextFile: (request: unknown) => (
    ipcRenderer.invoke(SAVE_TEXT_FILE_CHANNEL, request)
  ),
});
