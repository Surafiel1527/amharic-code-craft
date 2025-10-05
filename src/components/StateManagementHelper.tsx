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

interface ${name}State {
  // State
  data: any | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setData: (data: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  data: null,
  loading: false,
  error: null,
};

export const use${name}Store = create<${name}State>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        setData: (data) => set({ data }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        reset: () => set(initialState),
      }),
      {
        name: '${name.toLowerCase()}-storage',
      }
    )
  )
);

// Usage:
// const { data, loading, error, setData } = use${name}Store();`;
  };

  const generateCustomHook = (name: string) => {
    return `// use${name}.ts
import { useState, useCallback } from 'react';

interface ${name}State {
  data: any | null;
  loading: boolean;
  error: string | null;
}

export function use${name}() {
  const [state, setState] = useState<${name}State>({
    data: null,
    loading: false,
    error: null,
  });

  const setData = useCallback((data: any) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  // Add your custom logic here
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Your fetch logic
      const response = await fetch('/api/data');
      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ...state,
    setData,
    setLoading,
    setError,
    reset,
    fetchData,
  };
}`;
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
            {storeType === 'zustand' && <li>• DevTools and persistence support</li>}
            {storeType === 'context' && <li>• Provider pattern with custom hook</li>}
            {storeType === 'custom-hook' && <li>• Memoized callbacks for performance</li>}
          </ul>
        </Card>
      </div>
    </Card>
  );
}
