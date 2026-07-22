export function downloadTextFile(
  filename: string,
  content: string,
  contentType: string,
): void {
  const blob = new Blob([content], {
    type: contentType,
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.rel = 'noopener';

  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}
