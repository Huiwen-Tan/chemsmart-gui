import type {
  ApplyMoleculeEditRequest,
  MoleculeDocument,
  MoleculeExportPreviewRequest,
  MoleculeExportPreviewResponse,
  MoleculeEditResponse,
  OpenDocumentRequest,
} from '../shared/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

interface ErrorResponseBody {
  detail?: unknown;
}

async function readErrorDetail(response: Response): Promise<string | null> {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    const body = (await response.json()) as ErrorResponseBody;
    return typeof body.detail === 'string' ? body.detail : null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(
      detail ?? `Request failed (${response.status}): ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export function healthCheck(): Promise<{ status: string }> {
  return request('/api/health');
}

export function openDocument(payload: OpenDocumentRequest): Promise<MoleculeDocument> {
  return request('/api/documents/open', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function applyMoleculeEdit(
  payload: ApplyMoleculeEditRequest,
): Promise<MoleculeEditResponse> {
  return request('/api/documents/edit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function previewMoleculeExport(
  payload: MoleculeExportPreviewRequest,
): Promise<MoleculeExportPreviewResponse> {
  return request('/api/documents/export-preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getDocument(documentId: string): Promise<MoleculeDocument> {
  return request(`/api/documents/${encodeURIComponent(documentId)}`);
}
