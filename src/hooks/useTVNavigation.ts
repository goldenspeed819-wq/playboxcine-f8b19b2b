import { useState, useEffect, useCallback, useRef } from 'react';
import { useTVMode } from '@/contexts/TVModeContext';

interface UseTVNavigationOptions {
  rows: number;
  itemsPerRow: number[] | number;
  onSelect?: (rowIndex: number, itemIndex: number) => void;
  enabled?: boolean;
}

export function useTVNavigation({
  rows,
  itemsPerRow,
  onSelect,
  enabled = true,
}: UseTVNavigationOptions) {
  const { isTVMode } = useTVMode();
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedItem, setFocusedItem] = useState(0);
  const focusedRef = useRef<HTMLElement | null>(null);

  const getItemsInRow = useCallback((rowIndex: number) => {
    if (Array.isArray(itemsPerRow)) {
      return itemsPerRow[rowIndex] || 0;
    }
    return itemsPerRow;
  }, [itemsPerRow]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isTVMode || !enabled) return;

    const currentRowItems = getItemsInRow(focusedRow);

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setFocusedRow(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedRow(prev => Math.min(rows - 1, prev + 1));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedItem(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setFocusedItem(prev => Math.min(currentRowItems - 1, prev + 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(focusedRow, focusedItem);
        focusedRef.current?.click();
        break;
    }
  }, [isTVMode, enabled, focusedRow, focusedItem, rows, getItemsInRow, onSelect]);

  // Adjust focusedItem when changing rows
  useEffect(() => {
    const maxItems = getItemsInRow(focusedRow);
    if (focusedItem >= maxItems) {
      setFocusedItem(Math.max(0, maxItems - 1));
    }
  }, [focusedRow, focusedItem, getItemsInRow]);

  useEffect(() => {
    if (isTVMode && enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isTVMode, enabled, handleKeyDown]);

  const isFocused = useCallback((rowIndex: number, itemIndex: number) => {
    return isTVMode && focusedRow === rowIndex && focusedItem === itemIndex;
  }, [isTVMode, focusedRow, focusedItem]);

  const getFocusProps = useCallback((rowIndex: number, itemIndex: number) => ({
    ref: (el: HTMLElement | null) => {
      if (isFocused(rowIndex, itemIndex)) {
        focusedRef.current = el;
        el?.focus();
      }
    },
    className: isFocused(rowIndex, itemIndex) ? 'tv-focused' : '',
    'data-tv-focused': isFocused(rowIndex, itemIndex),
  }), [isFocused]);

  return {
    focusedRow,
    focusedItem,
    setFocusedRow,
    setFocusedItem,
    isFocused,
    getFocusProps,
    isTVMode,
  };
}
