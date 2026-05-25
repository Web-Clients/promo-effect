/**
 * EntityAutocomplete — generic combobox with debounced search + "Create new" inline.
 *
 * Used in BookingDetail for Beneficiar (Client), Furnizor (Supplier), Agent China.
 * Fetches items async, displays a dropdown list, auto-fills on selection by
 * calling `onSelect(item)`. The parent component is responsible for spreading
 * the selected entity into its form state.
 *
 * Free typing is allowed: if the user types a value that doesn't match any
 * existing item, `onSelect(null)` is called and the raw text is kept via
 * `onTextChange`.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from './Input';
import { cn } from '../../lib/utils';

export interface EntityAutocompleteProps<T extends { id: string }> {
  label: string;
  placeholder?: string;
  /** Current displayed text (the company / agent name). */
  value: string;
  /** Called whenever the user types (free text, no selection). */
  onTextChange: (text: string) => void;
  /** Called when the user picks an item from the list. */
  onSelect: (item: T) => void;
  /** Called when user clicks "Create new" — parent should open a modal / form. */
  onCreateNew?: (initialName: string) => void;
  /** Search function — must return matching items. */
  search: (query: string) => Promise<T[]>;
  /** How to render each row in the dropdown. */
  renderItem: (item: T) => React.ReactNode;
  /** Extract the display name (used for fallback rendering). */
  getDisplayName: (item: T) => string;
  disabled?: boolean;
  /** Optional id for the input element. */
  id?: string;
  /** Optional className passed to the wrapper. */
  className?: string;
  /** Label for the "Create new" item (defaults to RO copy). */
  createNewLabel?: string;
}

export function EntityAutocomplete<T extends { id: string }>({
  label,
  placeholder,
  value,
  onTextChange,
  onSelect,
  onCreateNew,
  search,
  renderItem,
  getDisplayName,
  disabled,
  id,
  className,
  createNewLabel,
}: EntityAutocompleteProps<T>) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Debounced search
  const runSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const items = await search(q);
          setResults(items.slice(0, 20));
          setHighlight(0);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 220);
    },
    [search]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    onTextChange(next);
    setOpen(true);
    runSearch(next);
  };

  const handleFocus = () => {
    setOpen(true);
    runSearch(value);
  };

  const pick = (item: T) => {
    onSelect(item);
    onTextChange(getDisplayName(item));
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[highlight]) {
        e.preventDefault();
        pick(results[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showCreate =
    !!onCreateNew &&
    value.trim().length > 0 &&
    !results.some((r) => getDisplayName(r).toLowerCase() === value.trim().toLowerCase());

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <label htmlFor={id} className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {label}
      </label>
      <Input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-neutral-500">Se caută...</div>}

          {!loading && results.length === 0 && !showCreate && (
            <div className="px-3 py-2 text-xs text-neutral-500">Niciun rezultat</div>
          )}

          {!loading &&
            results.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => pick(item)}
                onMouseEnter={() => setHighlight(idx)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 border-b last:border-b-0 border-neutral-100 dark:border-neutral-700',
                  idx === highlight
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/40'
                )}
              >
                {renderItem(item)}
              </button>
            ))}

          {showCreate && onCreateNew && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreateNew(value.trim());
              }}
              className="w-full text-left px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-t border-neutral-200 dark:border-neutral-700 font-medium"
            >
              + {createNewLabel ?? `Creează „${value.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EntityAutocomplete;
