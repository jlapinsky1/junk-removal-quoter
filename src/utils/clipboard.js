/**
 * Copies text to the clipboard.
 *
 * Prefers the modern Clipboard API; falls back to execCommand on hidden input
 * for environments where the Clipboard API is unavailable (non-HTTPS, older
 * WebKit, or iOS Safari without explicit permission).
 *
 * Returns true on success, false on failure.
 * Never throws.
 */
export async function copyToClipboard(text) {
  // Modern path
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand
    }
  }

  // Fallback: hidden input + execCommand
  try {
    const el = document.createElement('input');
    el.style.position = 'fixed';
    el.style.opacity  = '0';
    el.value = text;
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
