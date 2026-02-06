import { useEffect, useCallback } from 'react';
import { useVIP } from '@/contexts/VIPContext';

const EDGE_FUNCTION_URL = 'https://tbsoidmookberljbxgpt.supabase.co/functions/v1/ip-blocker';

export function useSecurityProtection() {
  const { allowDevtools, isLoading } = useVIP();

  const blockIP = useCallback(async () => {
    try {
      await fetch(EDGE_FUNCTION_URL + '?action=block', { method: 'POST' });
    } catch (e) {
      console.log('Block request failed');
    }
    window.location.replace("/bloqueado.html");
  }, []);

  useEffect(() => {
    // Wait for VIP status to load
    if (isLoading) return;
    
    // If user has devtools permission, don't block anything
    if (allowDevtools) return;

    // Anti-devtools detection
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (
        k === "f12" ||
        (e.ctrlKey && k === "u") ||
        (e.ctrlKey && e.shiftKey && k === "i") ||
        (e.ctrlKey && e.shiftKey && k === "c") ||
        (e.ctrlKey && e.shiftKey && k === "j") ||
        (e.ctrlKey && k === "s")
      ) {
        e.preventDefault();
        e.stopPropagation();
        blockIP();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        blockIP();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    const handleCopy = (e: Event) => {
      e.preventDefault();
      blockIP();
    };

    // DevTools detection via debugger timing
    let devtoolsOpen = false;
    const threshold = 160;

    const detectDevTools = () => {
      const start = performance.now();
      // debugger statement causes significant delay when devtools is open
      // We use a more reliable method: checking window dimensions
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          blockIP();
        }
      } else {
        devtoolsOpen = false;
      }
    };

    // Check for devtools periodically
    const devtoolsInterval = setInterval(detectDevTools, 1000);

    // Console tampering detection
    const consoleLog = console.log;
    const consoleWarn = console.warn;
    const consoleError = console.error;
    
    // Override console methods to detect if devtools is open
    const originalConsole = { ...console };
    
    // Firebug detection
    const detectFirebug = () => {
      if ((window as any).Firebug && (window as any).Firebug.chrome && (window as any).Firebug.chrome.isInitialized) {
        blockIP();
      }
    };
    
    const firebugInterval = setInterval(detectFirebug, 1000);

    // Add event listeners
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("selectstart", handleSelectStart, true);
    document.addEventListener("copy", handleCopy, true);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("selectstart", handleSelectStart, true);
      document.removeEventListener("copy", handleCopy, true);
      clearInterval(devtoolsInterval);
      clearInterval(firebugInterval);
    };
  }, [allowDevtools, isLoading, blockIP]);
}
