/**
 * HSCodeAutocomplete
 * Debounced autocomplete for HS Codes — replaces the old HsCodeSelector in CalculatorForm.
 * Searches by numeric code (9403.30) or description text (mobilier).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { searchHsCodes, HsCode } from '../../services/hscodes';

interface Props {
  value: string;
  onChange: (code: string, hsCode?: HsCode | null) => void;
  placeholder?: string;
}

export const HSCodeAutocomplete = ({ value, onChange, placeholder }: Props) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [results, setResults] = useState<HsCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await searchHsCodes(q, 10);
      setResults(res);
      setIsOpen(res.length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setInputValue(q);
    onChange(q, null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  };

  const selectItem = (item: HsCode) => {
    setInputValue(item.code);
    onChange(item.code, item);
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectItem(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder || 'Ex: 9403.30 sau mobilier'}
          className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-primary-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors pr-8"
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg
              className="animate-spin h-4 w-4 text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-30 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {results.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-neutral-400">
              Nu am găsit cod pentru &ldquo;{inputValue}&rdquo;
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(item);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${
                  idx === activeIndex ? 'bg-accent-50 dark:bg-accent-500/10' : ''
                }`}
              >
                <span className="font-mono font-semibold text-accent-600 dark:text-accent-400 mr-2">
                  {item.code}
                </span>
                <span className="text-neutral-600 dark:text-neutral-300 line-clamp-1">
                  {item.description}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Empty state hint when user stopped typing */}
      {!isOpen && inputValue.length >= 2 && !isLoading && results.length === 0 && (
        <p className="mt-1 text-xs text-neutral-400">
          Nu am găsit cod pentru &ldquo;{inputValue}&rdquo;
        </p>
      )}
    </div>
  );
};

export default HSCodeAutocomplete;
