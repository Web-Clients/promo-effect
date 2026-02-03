/**
 * HS Code Selector Component
 * Searchable dropdown for selecting customs codes
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchHsCodes, HsCode } from '../../services/hscodes';
import { cn } from '../../lib/utils';

interface HsCodeSelectorProps {
  value: string;
  onChange: (code: string, hsCode: HsCode | null) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

const SearchIcon = () => (
  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="animate-spin w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const HsCodeSelector: React.FC<HsCodeSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Căutați cod HS sau descriere...',
  className,
  required = false,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HsCode[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<HsCode | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounced search
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await searchHsCodes(searchQuery, 15);
      setResults(searchResults);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle query change with debounce
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (query.length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize with value if provided
  useEffect(() => {
    if (value && !selectedCode) {
      setQuery(value);
    }
  }, [value, selectedCode]);

  const handleSelect = (hsCode: HsCode) => {
    setSelectedCode(hsCode);
    setQuery(`${hsCode.code} - ${hsCode.description.substring(0, 50)}${hsCode.description.length > 50 ? '...' : ''}`);
    onChange(hsCode.code, hsCode);
    setIsOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setSelectedCode(null);
    setQuery('');
    onChange('', null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? <LoadingSpinner /> : <SearchIcon />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedCode(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required && !selectedCode}
          className={cn(
            'w-full pl-10 pr-10 py-3 bg-white dark:bg-neutral-800',
            'border border-neutral-200 dark:border-neutral-600 rounded-lg',
            'text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500',
            'transition-all',
            disabled && 'opacity-50 cursor-not-allowed',
            selectedCode && 'border-success-300 dark:border-success-600'
          )}
        />
        {selectedCode && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
            >
              <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Selected code info */}
      {selectedCode && (
        <div className="mt-2 p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckIcon />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-success-700 dark:text-success-400">{selectedCode.code}</p>
              <p className="text-sm text-success-600 dark:text-success-500 truncate">{selectedCode.description}</p>
              {selectedCode.dutyRate !== null && (
                <p className="text-xs text-success-500 dark:text-success-600 mt-1">
                  Taxa vamală: {selectedCode.dutyRate}% | TVA: {selectedCode.vatRate || 20}%
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg"
        >
          {results.map((hsCode, index) => (
            <li
              key={hsCode.id}
              onClick={() => handleSelect(hsCode)}
              className={cn(
                'px-4 py-3 cursor-pointer border-b border-neutral-100 dark:border-neutral-700 last:border-0',
                'hover:bg-neutral-50 dark:hover:bg-neutral-700',
                highlightedIndex === index && 'bg-accent-50 dark:bg-accent-900/30'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-medium text-accent-600 dark:text-accent-400">{hsCode.code}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">{hsCode.description}</p>
                </div>
                {hsCode.dutyRate !== null && (
                  <span className="text-xs text-neutral-400 whitespace-nowrap">{hsCode.dutyRate}%</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && !isLoading && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg text-center">
          <p className="text-sm text-neutral-500">Nu s-au găsit coduri HS pentru "{query}"</p>
          <p className="text-xs text-neutral-400 mt-1">Încercați să căutați după cod (ex: 9403) sau descriere (ex: mobilă)</p>
        </div>
      )}

      {/* Hint for empty state */}
      {isOpen && query.length > 0 && query.length < 2 && (
        <div className="absolute z-50 w-full mt-1 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg text-center">
          <p className="text-xs text-neutral-400">Introduceți cel puțin 2 caractere pentru căutare</p>
        </div>
      )}
    </div>
  );
};

export default HsCodeSelector;
