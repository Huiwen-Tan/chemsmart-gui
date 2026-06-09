import type { MoleculeDocument, OpenDocumentRequest } from '../shared/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${response.statusText}`);
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

export function getDocument(documentId: string): Promise<MoleculeDocument> {
  return request(`/api/documents/${encodeURIComponent(documentId)}`);
}
