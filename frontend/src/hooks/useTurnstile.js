import { useRef, useEffect, useCallback, useState } from 'react';

const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
const SITE_KEY = isLocalhost
  ? '1x00000000000000000000AA'   // Cloudflare test key (always passes on localhost)
  : '0x4AAAAAACklcivlisC28LVS';

export function useTurnstile() {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    // Clean up existing widget
    if (widgetIdRef.current !== null) {
      try { window.turnstile.remove(widgetIdRef.current); } catch {}
      widgetIdRef.current = null;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (t) => {
        setToken(t);
      },
      'expired-callback': () => {
        setToken(null);
      },
      'error-callback': () => {
        setToken(null);
      },
      theme: 'light',
      size: 'flexible',
    });

    // Test widget may not fire callback — poll for the token via getResponse
    if (isLocalhost && widgetIdRef.current !== null) {
      const poll = setInterval(() => {
        try {
          const t = window.turnstile.getResponse(widgetIdRef.current);
          if (t) { setToken(t); clearInterval(poll); }
        } catch { clearInterval(poll); }
      }, 200);
      setTimeout(() => clearInterval(poll), 5000);
    }
  }, []);

  useEffect(() => {
    const check = () => {
      if (window.turnstile) {
        setReady(true);
        renderWidget();
      } else {
        setTimeout(check, 100);
      }
    };
    check();

    return () => {
      if (widgetIdRef.current !== null) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
      }
    };
  }, [renderWidget]);

  useEffect(() => {
    if (ready) renderWidget();
  }, [ready, renderWidget]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  return { containerRef, token, reset };
}
