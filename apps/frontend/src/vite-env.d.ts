/// <reference types="vite/client" />

import type {
  MoleculeExportPreviewFiletype,
  MoleculeExportWriteResponse,
} from './shared/types';

interface DesktopSaveTextFileRequest {
  content: string;
  defaultFilename: string;
  filetype: MoleculeExportPreviewFiletype;
}

declare global {
  interface Window {
    chemsmartDesktop?: {
      backendBaseUrl: string;
      chooseDocumentPath?: () => Promise<string | null>;
      saveTextFile: (
        request: DesktopSaveTextFileRequest,
      ) => Promise<MoleculeExportWriteResponse | null>;
    };
  }
}

export {};
