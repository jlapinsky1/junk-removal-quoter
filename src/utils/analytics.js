export function trackEvent(name, params = {}) {
  window.gtag?.('event', name, params);
}
