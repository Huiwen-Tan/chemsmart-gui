import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const isDev = process.env.NODE_ENV === 'development';
const CHOOSE_DOCUMENT_FILE_CHANNEL = 'chemsmart:choose-document-file';
const SAVE_TEXT_FILE_CHANNEL = 'chemsmart:save-text-file';
const EXPORT_FILETYPES = ['xyz', 'com', 'gjf', 'inp'] as const;

type ExportFiletype = (typeof EXPORT_FILETYPES)[number];

interface SaveTextFileRequest {
  content: string;
  defaultFilename: string;
  filetype: ExportFiletype;
}

const EXPORT_FILTER_NAMES: Record<ExportFiletype, string> = {
  xyz: 'XYZ Coordinates',
  com: 'Gaussian Input',
  gjf: 'Gaussian Input',
  inp: 'ORCA Input',
};

ipcMain.handle(CHOOSE_DOCUMENT_FILE_CHANNEL, async (event) => {
  const ownerWindow = BrowserWindow.fromWebContents(event.sender);
  const openDialogOptions = {
    title: 'Open Molecular Document',
    buttonLabel: 'Open',
    filters: [{
      name: 'Molecules, Inputs, and Calculation Outputs',
      extensions: ['xyz', 'com', 'gjf', 'inp', 'log', 'out'],
    }],
    properties: ['openFile'],
  } satisfies Electron.OpenDialogOptions;
  const result = ownerWindow
    ? await dialog.showOpenDialog(ownerWindow, openDialogOptions)
    : await dialog.showOpenDialog(openDialogOptions);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

function isSaveTextFileRequest(value: unknown): value is SaveTextFileRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SaveTextFileRequest>;
  return (
    typeof candidate.content === 'string' &&
    typeof candidate.defaultFilename === 'string' &&
    candidate.defaultFilename.trim().length > 0 &&
    EXPORT_FILETYPES.some((filetype) => filetype === candidate.filetype)
  );
}

ipcMain.handle(SAVE_TEXT_FILE_CHANNEL, async (event, request: unknown) => {
  if (!isSaveTextFileRequest(request)) {
    throw new TypeError('Invalid desktop save request.');
  }

  const extension = `.${request.filetype}`;
  let defaultPath = path.basename(request.defaultFilename);
  const ownerWindow = BrowserWindow.fromWebContents(event.sender);

  while (true) {
    const saveDialogOptions = {
      title: 'Export Structure',
      defaultPath,
      buttonLabel: 'Save',
      filters: [{
        name: EXPORT_FILTER_NAMES[request.filetype],
        extensions: [request.filetype],
      }],
      message: `Save the generated ${extension} file.`,
      nameFieldLabel: 'File name:',
      properties: ['createDirectory', 'showOverwriteConfirmation'],
      showsTagField: false,
    } satisfies Electron.SaveDialogOptions;
    const result = ownerWindow
      ? await dialog.showSaveDialog(ownerWindow, saveDialogOptions)
      : await dialog.showSaveDialog(saveDialogOptions);

    if (result.canceled || !result.filePath) {
      return null;
    }

    if (path.extname(result.filePath).toLowerCase() !== extension) {
      defaultPath = result.filePath;
      const messageBoxOptions = {
        type: 'warning',
        buttons: ['Choose Another Name'],
        defaultId: 0,
        message: `The file name must end with ${extension}.`,
      } satisfies Electron.MessageBoxOptions;
      if (ownerWindow) {
        await dialog.showMessageBox(ownerWindow, messageBoxOptions);
      } else {
        await dialog.showMessageBox(messageBoxOptions);
      }
      continue;
    }

    await writeFile(result.filePath, request.content, 'utf8');
    return {
      filename: path.basename(result.filePath),
      filetype: request.filetype,
      path: result.filePath,
      bytes_written: Buffer.byteLength(request.content, 'utf8'),
    };
  }
});

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL).catch(console.error);
    return;
  }

  const indexPath = path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html');
  window.loadFile(indexPath).catch(console.error);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
