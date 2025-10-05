import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Code2, Copy, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function StateManagementHelper() {
  const [storeType, setStoreType] = useState<'context' | 'zustand' | 'custom-hook'>('context');
  const [storeName, setStoreName] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const generateContextStore = (name: string) => {
    return `// ${name}Context.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface ${name}State {
  // Add your state properties here
  data: any | null;
  loading: boolean;
  error: string | null;
}

interface ${name}ContextType extends ${name}State {
  // Add your actions here
  setData: (data: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const ${name}Context = createContext<${name}ContextType | undefined>(undefined);

export function ${name}Provider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = {
    data,
    loading,
    error,
    setData,
    setLoading,
    setError,
  };

  return (
    <${name}Context.Provider value={value}>
      {children}
    </${name}Context.Provider>
  );
}

export function use${name}() {
  const context = useContext(${name}Context);
  if (context === undefined) {
    throw new Error('use${name} must be used within a ${name}Provider');
  }
  return context;
}`;
  };

  const generateZustandStore = (name: string) => {
    return `// use${name}Store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ${name}Item {
  id: string;
  [key: string]: any;
}

interface ${name}State {
  // State
  items: ${name}Item[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  
  // Computed
  selectedItem: ${name}Item | null;
  
  // Actions
  setItems: (items: ${name}Item[]) => void;
  addItem: (item: ${name}Item) => void;
  updateItem: (id: string, updates: Partial<${name}Item>) => void;
  removeItem: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions with optimistic updates
  fetchItems: () => Promise<void>;
  createItem: (item: Omit<${name}Item, 'id'>) => Promise<void>;
  updateItemOptimistic: (id: string, updates: Partial<${name}Item>) => Promise<void>;
  deleteItemOptimistic: (id: string) => Promise<void>;
  
  // Cache management
  invalidateCache: () => void;
  shouldRefetch: () => boolean;
  reset: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const initialState = {
  items: [],
  selectedId: null,
  loading: false,
  error: null,
  lastFetch: null,
};

export const use${name}Store = create<${name}State>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Computed values
        get selectedItem() {
          const state = get();
          return state.items.find(item => item.id === state.selectedId) || null;
        },
        
        // Basic setters
        setItems: (items) => set({ items, lastFetch: Date.now() }),
        setSelectedId: (selectedId) => set({ selectedId }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        
        // Synchronous CRUD
        addItem: (item) => set((state) => ({ 
          items: [...state.items, item] 
        })),
        
        updateItem: (id, updates) => set((state) => ({
          items: state.items.map(item => 
            item.id === id ? { ...item, ...updates } : item
          )
        })),
        
        removeItem: (id) => set((state) => ({
          items: state.items.filter(item => item.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId
        })),
        
        // Async fetch with caching
        fetchItems: async () => {
          const state = get();
          
          // Check cache validity
          if (!state.shouldRefetch()) {
            return;
          }
          
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/${name.toLowerCase()}');
            if (!response.ok) throw new Error('Fetch failed');
            const data = await response.json();
            set({ items: data, lastFetch: Date.now(), loading: false });
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Fetch failed',
              loading: false 
            });
          }
        },
        
        // Optimistic create
        createItem: async (itemData) => {
          const optimisticId = \`temp-\${Date.now()}\`;
          const optimisticItem = { ...itemData, id: optimisticId };
          
          // Add optimistically
          get().addItem(optimisticItem);
          
          try {
            const response = await fetch('/api/${name.toLowerCase()}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(itemData)
            });
            
            if (!response.ok) throw new Error('Create failed');
            const createdItem = await response.json();
            
            // Replace optimistic item with real one
            set((state) => ({
              items: state.items.map(item => 
                item.id === optimisticId ? createdItem : item
              )
            }));
          } catch (error) {
            // Rollback on error
            get().removeItem(optimisticId);
            set({ error: error instanceof Error ? error.message : 'Create failed' });
            throw error;
          }
        },
        
        // Optimistic update
        updateItemOptimistic: async (id, updates) => {
          const state = get();
          const originalItem = state.items.find(item => item.id === id);
          
          if (!originalItem) return;
          
          // Update optimistically
          get().updateItem(id, updates);
          
          try {
            const response = await fetch(\`/api/${name.toLowerCase()}/\${id}\`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
            });
            
            if (!response.ok) throw new Error('Update failed');
            const updatedItem = await response.json();
            
            // Update with server response
            get().updateItem(id, updatedItem);
          } catch (error) {
            // Rollback on error
            get().updateItem(id, originalItem);
            set({ error: error instanceof Error ? error.message : 'Update failed' });
            throw error;
          }
        },
        
        // Optimistic delete
        deleteItemOptimistic: async (id) => {
          const state = get();
          const deletedItem = state.items.find(item => item.id === id);
          
          if (!deletedItem) return;
          
          // Remove optimistically
          get().removeItem(id);
          
          try {
            const response = await fetch(\`/api/${name.toLowerCase()}/\${id}\`, {
              method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Delete failed');
          } catch (error) {
            // Rollback on error
            get().addItem(deletedItem);
            set({ error: error instanceof Error ? error.message : 'Delete failed' });
            throw error;
          }
        },
        
        // Cache management
        shouldRefetch: () => {
          const state = get();
          if (!state.lastFetch) return true;
          return Date.now() - state.lastFetch > CACHE_DURATION;
        },
        
        invalidateCache: () => set({ lastFetch: null }),
        
        reset: () => set(initialState),
      }),
      {
        name: '${name.toLowerCase()}-storage',
        partialize: (state) => ({ 
          items: state.items,
          lastFetch: state.lastFetch 
        }),
      }
    )
  )
);

// Usage Examples:
// const { items, loading, fetchItems, createItem } = use${name}Store();
// 
// // Fetch with caching
// await fetchItems();
// 
// // Optimistic create
// await createItem({ name: 'New Item' });
// 
// // Optimistic update
// await updateItemOptimistic('id', { name: 'Updated' });
// 
// // Force refetch
// invalidateCache();
// await fetchItems();`;
  };

  const generateCustomHook = (name: string) => {
    return `// use${name}.ts
import { useState, useCallback, useRef, useEffect } from 'react';

interface ${name}Item {
  id: string;
  [key: string]: any;
}

interface ${name}State {
  data: ${name}Item[];
  loading: boolean;
  error: string | null;
  isStale: boolean;
}

interface UseAsync${name}Options {
  cacheTime?: number;
  refetchOnMount?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: ${name}Item[]) => void;
  onError?: (error: Error) => void;
}

export function use${name}(options: UseAsync${name}Options = {}) {
  const {
    cacheTime = 5 * 60 * 1000,
    refetchOnMount = true,
    refetchInterval,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<${name}State>({
    data: [],
    loading: false,
    error: null,
    isStale: false,
  });

  const lastFetchRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController>();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Check if cache is stale
  const isCacheStale = useCallback(() => {
    if (!lastFetchRef.current) return true;
    return Date.now() - lastFetchRef.current > cacheTime;
  }, [cacheTime]);

  // Abort ongoing requests
  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Fetch data with abort support
  const fetchData = useCallback(async (force = false) => {
    if (!force && !isCacheStale() && state.data.length > 0) {
      return state.data;
    }

    abortRequest();
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null, isStale: false }));

    try {
      const response = await fetch('/api/${name.toLowerCase()}', {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
      
      const data = await response.json();
      lastFetchRef.current = Date.now();

      setState({
        data,
        loading: false,
        error: null,
        isStale: false,
      });

      onSuccess?.(data);
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const error = err instanceof Error ? err : new Error('Fetch failed');
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));

      onError?.(error);
      throw error;
    }
  }, [isCacheStale, state.data.length, abortRequest, onSuccess, onError]);

  // Optimistic mutation helper
  const mutate = useCallback(async (
    updater: (data: ${name}Item[]) => ${name}Item[],
    options: { 
      revert?: boolean;
      refetch?: boolean;
    } = {}
  ) => {
    const previousData = state.data;
    const optimisticData = updater(previousData);

    setState(prev => ({ ...prev, data: optimisticData }));

    try {
      if (options.refetch) {
        await fetchData(true);
      }
      return optimisticData;
    } catch (error) {
      if (options.revert) {
        setState(prev => ({ ...prev, data: previousData }));
      }
      throw error;
    }
  }, [state.data, fetchData]);

  // Add item optimistically
  const addItem = useCallback(async (item: Omit<${name}Item, 'id'>) => {
    const tempId = \`temp-\${Date.now()}\`;
    const optimisticItem = { ...item, id: tempId } as ${name}Item;

    return mutate(
      (data) => [...data, optimisticItem],
      { revert: true }
    );
  }, [mutate]);

  // Update item optimistically
  const updateItem = useCallback(async (id: string, updates: Partial<${name}Item>) => {
    return mutate(
      (data) => data.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ),
      { revert: true }
    );
  }, [mutate]);

  // Remove item optimistically
  const removeItem = useCallback(async (id: string) => {
    return mutate(
      (data) => data.filter(item => item.id !== id),
      { revert: true }
    );
  }, [mutate]);

  // Invalidate and refetch
  const invalidate = useCallback(() => {
    setState(prev => ({ ...prev, isStale: true }));
    lastFetchRef.current = 0;
  }, []);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const reset = useCallback(() => {
    abortRequest();
    setState({
      data: [],
      loading: false,
      error: null,
      isStale: false,
    });
    lastFetchRef.current = 0;
  }, [abortRequest]);

  // Auto-fetch on mount
  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }

    return () => {
      abortRequest();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetchOnMount, fetchData, abortRequest]);

  // Auto-refetch interval
  useEffect(() => {
    if (refetchInterval) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, fetchData]);

  return {
    ...state,
    fetchData,
    addItem,
    updateItem,
    removeItem,
    mutate,
    invalidate,
    refetch,
    reset,
    isCacheStale: isCacheStale(),
  };
}

// Usage Examples:
// const { data, loading, error, addItem, updateItem } = use${name}({
//   cacheTime: 5 * 60 * 1000,
//   refetchOnMount: true,
//   refetchInterval: 30000,
//   onSuccess: (data) => console.log('Fetched:', data),
//   onError: (error) => console.error('Error:', error)
// });`;
  };

  const generateStore = () => {
    if (!storeName.trim()) {
      toast.error("Please enter a store name");
      return;
    }

    let code = "";
    switch (storeType) {
      case 'context':
        code = generateContextStore(storeName);
        break;
      case 'zustand':
        code = generateZustandStore(storeName);
        break;
      case 'custom-hook':
        code = generateCustomHook(storeName);
        break;
    }

    setGeneratedCode(code);
    toast.success("Store generated!");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied!");
  };

  const downloadCode = () => {
    const ext = storeType === 'zustand' || storeType === 'custom-hook' ? 'ts' : 'tsx';
    const fileName = storeType === 'context' 
      ? `${storeName}Context.${ext}`
      : `use${storeName}.${ext}`;
    
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${fileName}`);
  };

  const storeExamples = [
    { name: "Auth", description: "User authentication state" },
    { name: "Theme", description: "App theme preferences" },
    { name: "Cart", description: "Shopping cart state" },
    { name: "User", description: "User profile data" },
    { name: "Notifications", description: "App notifications" }
  ];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <h3 className="font-semibold">State Management Helper</h3>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 mr-1" />
          Pro
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Store Name</Label>
          <Input
            placeholder="e.g., Auth, Theme, Cart"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>State Management Type</Label>
          <Select value={storeType} onValueChange={(v: any) => setStoreType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="context">Context API</SelectItem>
              <SelectItem value="zustand">Zustand Store</SelectItem>
              <SelectItem value="custom-hook">Custom Hook</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Quick Examples</Label>
          <div className="grid grid-cols-2 gap-2">
            {storeExamples.map((example) => (
              <Button
                key={example.name}
                variant="outline"
                size="sm"
                onClick={() => setStoreName(example.name)}
                className="text-xs"
              >
                {example.name}
              </Button>
            ))}
          </div>
        </div>

        <Button onClick={generateStore} className="w-full">
          <Code2 className="w-4 h-4 mr-2" />
          Generate Store
        </Button>

        {generatedCode && (
          <>
            <div className="flex gap-2">
              <Button onClick={copyCode} variant="outline" className="flex-1">
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button onClick={downloadCode} variant="outline" className="flex-1">
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                <code>{generatedCode}</code>
              </pre>
            </ScrollArea>
          </>
        )}

        <Card className="p-3 bg-muted/50">
          <h4 className="text-sm font-medium mb-2">Features:</h4>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• TypeScript support with proper typing</li>
            <li>• Loading and error state management</li>
            <li>• Reset functionality</li>
            {storeType === 'zustand' && (
              <>
                <li>• DevTools and persistence support</li>
                <li>• Optimistic updates with rollback</li>
                <li>• Cache invalidation strategies</li>
                <li>• Computed values</li>
              </>
            )}
            {storeType === 'context' && <li>• Provider pattern with custom hook</li>}
            {storeType === 'custom-hook' && (
              <>
                <li>• Request cancellation support</li>
                <li>• Cache management with staleness</li>
                <li>• Optimistic mutations</li>
                <li>• Auto-refetch on mount/interval</li>
              </>
            )}
          </ul>
        </Card>
      </div>
    </Card>
  );
}
