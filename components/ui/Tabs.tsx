import React, { useState, createContext, useContext } from 'react';
import { cn } from '../../lib/utils';

interface TabsContextProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextProps | null>(null);

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const Tabs = ({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: React.PropsWithChildren<TabsProps>) => {
  const [internal, setInternal] = useState<string>(defaultValue ?? value ?? '');
  const isControlled = value !== undefined;
  const activeTab = isControlled ? (value as string) : internal;
  const setActiveTab = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) => {
  return (
    <div className={cn('border-b border-neutral-200 dark:border-neutral-700', className)}>
      <nav
        className="-mb-px flex space-x-6 sm:space-x-8 overflow-x-auto px-1 sm:px-0"
        aria-label="Tabs"
      >
        {children}
      </nav>
    </div>
  );
};

export const TabsTrigger = ({ value, children }: React.PropsWithChildren<{ value: string }>) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within a Tabs component');

  const isActive = context.activeTab === value;

  return (
    <button
      onClick={() => context.setActiveTab(value)}
      className={cn(
        'whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm capitalize',
        isActive
          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
          : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:hover:text-neutral-200 dark:hover:border-neutral-600'
      )}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children }: React.PropsWithChildren<{ value: string }>) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within a Tabs component');

  return context.activeTab === value ? <div className="mt-5">{children}</div> : null;
};
