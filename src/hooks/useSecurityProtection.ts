import { useEffect } from 'react';
import { useVIP } from '@/contexts/VIPContext';

export function useSecurityProtection() {
  const { allowDevtools, isLoading } = useVIP();

  useEffect(() => {
    if (isLoading) return;
    if (allowDevtools) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        k === "f12" ||
        (e.ctrlKey && k === "u") ||
        (e.ctrlKey && e.shiftKey && k === "i") ||
        (e.ctrlKey && e.shiftKey && k === "c") ||
        (e.ctrlKey && e.shiftKey && k === "j")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [allowDevtools, isLoading]);
}
