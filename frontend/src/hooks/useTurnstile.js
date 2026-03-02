import { useRef, useEffect, useCallback, useState } from 'react';

const SITE_KEY = '0x4AAAAAACklcivlisC28LVS';

const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);

export function useTurnstile() {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [token, setToken] = useState(isLocalhost ? 'localhost-bypass' : null);
  const [ready, setReady] = useState(false);

  const renderWidget = useCallback(() => {
    if (isLocalhost) return;
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
  }, []);

  useEffect(() => {
    if (isLocalhost) return;

    // Wait for turnstile script to load
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

  // Re-render when ready changes
  useEffect(() => {
    if (ready && !isLocalhost) renderWidget();
  }, [ready, renderWidget]);

  const reset = useCallback(() => {
    if (isLocalhost) return;
    setToken(null);
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  return { containerRef, token, reset, isLocalhost };
}
