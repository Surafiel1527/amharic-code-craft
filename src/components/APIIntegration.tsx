import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Copy, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Header {
  key: string;
  value: string;
}

export const APIIntegration = () => {
  const [method, setMethod] = useState<string>("GET");
  const [url, setUrl] = useState<string>("");
  const [headers, setHeaders] = useState<Header[]>([{ key: "", value: "" }]);
  const [body, setBody] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const generateJavaScriptCode = () => {
    const headersObj = headers
      .filter(h => h.key && h.value)
      .map(h => `    '${h.key}': '${h.value}'`)
      .join(',\n');

    const hasBody = method !== "GET" && body;

    return `// JavaScript Fetch API
async function fetchData() {
  try {
    const response = await fetch('${url}', {
      method: '${method}',${headersObj ? `\n      headers: {\n${headersObj}\n      },` : ''}${hasBody ? `\n      body: JSON.stringify(${body})` : ''}
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Call the function
fetchData();`;
  };

  const generateAxiosCode = () => {
    const headersObj = headers
      .filter(h => h.key && h.value)
      .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

    return `// Axios (npm install axios)
import axios from 'axios';

async function fetchData() {
  try {
    const response = await axios.${method.toLowerCase()}('${url}'${method !== "GET" && body ? `,\n      ${body}` : ''}${Object.keys(headersObj).length ? `,\n      {\n        headers: ${JSON.stringify(headersObj, null, 8)}\n      }` : ''});
    
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Call the function
fetchData();`;
  };

  const generateReactHook = () => {
    return `// React Custom Hook
import { useState, useEffect } from 'react';

function useAPI() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('${url}', {
          method: '${method}',${headers.filter(h => h.key && h.value).length ? `\n          headers: {\n${headers.filter(h => h.key && h.value).map(h => `            '${h.key}': '${h.value}'`).join(',\n')}\n          },` : ''}${method !== "GET" && body ? `\n          body: JSON.stringify(${body})` : ''}
        });
        
        if (!response.ok) throw new Error('API request failed');
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

// Usage in component
function MyComponent() {
  const { data, loading, error } = useAPI();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{JSON.stringify(data)}</div>;
}`;
  };

  const handleGenerate = () => {
    if (!url) {
      toast.error("እባክዎ API URL ያስገቡ");
      return;
    }
    setGeneratedCode(generateJavaScriptCode());
    toast.success("ኮድ ተፈጥሯል!");
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("ኮድ ተቀድቷል!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          የ API ውህደት አዋቂ
        </CardTitle>
        <CardDescription>
          ለ API ጥሪዎች ኮድ በቀላሉ ያመንጩ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label>API URL</Label>
              <Input
                placeholder="https://api.example.com/endpoint"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Headers</Label>
              <Button onClick={addHeader} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Header
              </Button>
            </div>
            <div className="space-y-2">
              {headers.map((header, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Key"
                    value={header.key}
                    onChange={(e) => updateHeader(index, "key", e.target.value)}
                  />
                  <Input
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) => updateHeader(index, "value", e.target.value)}
                  />
                  {headers.length > 1 && (
                    <Button
                      onClick={() => removeHeader(index)}
                      variant="outline"
                      size="icon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {method !== "GET" && (
            <div>
              <Label>Request Body (JSON)</Label>
              <Textarea
                placeholder='{"key": "value"}'
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <Button onClick={handleGenerate} className="w-full">
            ኮድ አመንጭ
          </Button>

          {generatedCode && (
            <Tabs defaultValue="fetch" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fetch">Fetch API</TabsTrigger>
                <TabsTrigger value="axios">Axios</TabsTrigger>
                <TabsTrigger value="react">React Hook</TabsTrigger>
              </TabsList>

              <TabsContent value="fetch" className="space-y-2">
                <div className="bg-muted p-4 rounded-md overflow-x-auto">
                  <pre className="text-xs">
                    <code>{generateJavaScriptCode()}</code>
                  </pre>
                </div>
                <Button
                  onClick={() => copyCode(generateJavaScriptCode())}
                  variant="outline"
                  className="w-full"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  ኮድ ቅዳ
                </Button>
              </TabsContent>

              <TabsContent value="axios" className="space-y-2">
                <div className="bg-muted p-4 rounded-md overflow-x-auto">
                  <pre className="text-xs">
                    <code>{generateAxiosCode()}</code>
                  </pre>
                </div>
                <Button
                  onClick={() => copyCode(generateAxiosCode())}
                  variant="outline"
                  className="w-full"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  ኮድ ቅዳ
                </Button>
              </TabsContent>

              <TabsContent value="react" className="space-y-2">
                <div className="bg-muted p-4 rounded-md overflow-x-auto">
                  <pre className="text-xs">
                    <code>{generateReactHook()}</code>
                  </pre>
                </div>
                <Button
                  onClick={() => copyCode(generateReactHook())}
                  variant="outline"
                  className="w-full"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  ኮድ ቅዳ
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
