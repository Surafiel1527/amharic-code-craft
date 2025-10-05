import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode2, Component, Database, Braces, FileJson, FileText } from "lucide-react";
import { toast } from "sonner";

interface Template {
  name: string;
  description: string;
  category: string;
  extension: string;
  code: string;
  icon: React.ReactNode;
}

const templates: Template[] = [
  {
    name: "React Component",
    description: "Functional component with TypeScript",
    category: "react",
    extension: "tsx",
    icon: <Component className="w-4 h-4" />,
    code: `import { FC } from 'react';

interface Props {
  // Add your props here
}

export const ComponentName: FC<Props> = ({ }) => {
  return (
    <div>
      {/* Your component */}
    </div>
  );
};
`
  },
  {
    name: "Custom Hook",
    description: "Reusable React hook",
    category: "react",
    extension: "ts",
    icon: <Braces className="w-4 h-4" />,
    code: `import { useState, useEffect } from 'react';

export function useCustomHook() {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    // Your effect here
  }, []);

  return { state, setState };
}
`
  },
  {
    name: "Utility Function",
    description: "Pure utility function",
    category: "utils",
    extension: "ts",
    icon: <FileCode2 className="w-4 h-4" />,
    code: `/**
 * Description of your utility function
 * @param param1 - Description
 * @returns Description of return value
 */
export function utilityFunction(param1: any): any {
  // Implementation
  return param1;
}
`
  },
  {
    name: "API Service",
    description: "API service with fetch",
    category: "services",
    extension: "ts",
    icon: <Database className="w-4 h-4" />,
    code: `const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(\`\${API_BASE_URL}\${endpoint}\`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(\`API Error: \${response.statusText}\`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiService = new ApiService();
`
  },
  {
    name: "Context Provider",
    description: "React context with provider",
    category: "react",
    extension: "tsx",
    icon: <Component className="w-4 h-4" />,
    code: `import { createContext, useContext, useState, ReactNode, FC } from 'react';

interface ContextState {
  // Define your context state
}

interface ContextActions {
  // Define your context actions
}

const Context = createContext<(ContextState & ContextActions) | undefined>(undefined);

export const Provider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ContextState>({
    // Initial state
  });

  const value = {
    ...state,
    // Actions
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useCustomContext = () => {
  const context = useContext(Context);
  if (!context) {
    throw new Error('useCustomContext must be used within Provider');
  }
  return context;
};
`
  },
  {
    name: "Type Definitions",
    description: "TypeScript type definitions",
    category: "types",
    extension: "ts",
    icon: <FileText className="w-4 h-4" />,
    code: `// Base types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Enums
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// Domain types
export interface DomainEntity extends BaseEntity {
  name: string;
  status: Status;
}

// API types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}
`
  },
  {
    name: "Config File",
    description: "Configuration constants",
    category: "config",
    extension: "ts",
    icon: <FileJson className="w-4 h-4" />,
    code: `export const config = {
  app: {
    name: 'My App',
    version: '1.0.0',
    env: import.meta.env.MODE,
  },
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    timeout: 30000,
  },
  features: {
    darkMode: true,
    analytics: import.meta.env.PROD,
  },
} as const;
`
  },
  {
    name: "Test File",
    description: "Unit test template",
    category: "tests",
    extension: "test.ts",
    icon: <FileCode2 className="w-4 h-4" />,
    code: `import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = someFunction(input);

    // Assert
    expect(result).toBe('expected');
  });

  it('should handle edge cases', () => {
    // Test edge cases
  });
});
`
  }
];

interface FileTemplatesLibraryProps {
  onSelectTemplate: (template: Template, fileName: string) => void;
}

export function FileTemplatesLibrary({ onSelectTemplate }: FileTemplatesLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fileName, setFileName] = useState('');

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];
  
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = (template: Template) => {
    if (!fileName) {
      toast.error('Please enter a file name');
      return;
    }

    const fullFileName = fileName.includes('.') ? fileName : `${fileName}.${template.extension}`;
    onSelectTemplate(template, fullFileName);
    setFileName('');
    toast.success(`Created ${fullFileName}`);
  };

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="space-y-4 flex-1 flex flex-col">
        <div>
          <h3 className="text-lg font-semibold mb-2">File Templates</h3>
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-3"
          />
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4 lg:grid-cols-5">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <div className="space-y-3">
              {filteredTemplates.map((template, idx) => (
                <Card key={idx} className="p-3 hover:bg-accent cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded">
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <Badge variant="outline" className="text-[10px]">
                          .{template.extension}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="File name..."
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          className="h-7 text-xs flex-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUseTemplate(template)}
                          className="h-7 text-xs"
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </Card>
  );
}
