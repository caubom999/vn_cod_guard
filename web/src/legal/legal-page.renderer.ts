import { LegalPage } from './legal-pages';

export function renderLegalPageHtml(page: LegalPage) {
  const body = page.paragraphs
    .map((paragraph) => '<p>' + escapeHtml(paragraph) + '</p>')
    .join('\n');

  return (
    '<!doctype html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<title>' +
    escapeHtml(page.title) +
    ' - VN-Cod-Guard</title>' +
    '<style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: #1f2933; max-width: 820px; margin: 0 auto; padding: 48px 20px; }' +
    'h1 { font-size: 32px; line-height: 1.2; margin: 0 0 24px; }' +
    'p { margin: 0 0 16px; }' +
    '.meta { color: #637381; margin-bottom: 32px; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<h1>' +
    escapeHtml(page.title) +
    '</h1>' +
    '<p class="meta">Last updated: June 12, 2026</p>' +
    body +
    '</body>' +
    '</html>'
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
