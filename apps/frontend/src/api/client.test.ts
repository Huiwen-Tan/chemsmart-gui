import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openDocument } from './client';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(
  body: unknown,
  init: ResponseInit = { status: 200 },
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws backend error detail from JSON error responses', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: "Could not open molecular file 'empty.xyz': invalid file",
        },
        { status: 400, statusText: 'Bad Request' },
      ),
    );

    await expect(openDocument({ path: 'empty.xyz' })).rejects.toThrow(
      "Could not open molecular file 'empty.xyz': invalid file",
    );
  });

  it('falls back to HTTP status when no backend detail is available', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('server error', {
        headers: { 'Content-Type': 'text/plain' },
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );

    await expect(openDocument({ path: 'water.xyz' })).rejects.toThrow(
      'Request failed (500): Internal Server Error',
    );
  });
});
