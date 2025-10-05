import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Zap, Send, Plus, Trash2, Sparkles, Copy,
  CheckCircle2, XCircle, Clock
} from "lucide-react";
import { toast } from "sonner";

interface APIRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: Record<string, string>;
  body?: string;
}

interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}

export function APITestingSuite() {
  const [requests, setRequests] = useState<APIRequest[]>([
    {
      id: '1',
      name: 'Get Users',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users',
      headers: { 'Content-Type': 'application/json' }
    }
  ]);
  const [selectedRequest, setSelectedRequest] = useState<string>('1');
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const currentRequest = requests.find(r => r.id === selectedRequest);

  const addRequest = () => {
    const newRequest: APIRequest = {
      id: crypto.randomUUID(),
      name: 'New Request',
      method: 'GET',
      url: '',
      headers: { 'Content-Type': 'application/json' }
    };
    setRequests([...requests, newRequest]);
    setSelectedRequest(newRequest.id);
    toast.success("Request added!");
  };

  const deleteRequest = (id: string) => {
    setRequests(requests.filter(r => r.id !== id));
    if (selectedRequest === id) {
      setSelectedRequest(requests[0]?.id || '');
    }
    toast.success("Request deleted!");
  };

  const updateRequest = (field: keyof APIRequest, value: any) => {
    setRequests(requests.map(r => 
      r.id === selectedRequest ? { ...r, [field]: value } : r
    ));
  };

  const sendRequest = async () => {
    if (!currentRequest) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const response = await fetch(currentRequest.url, {
        method: currentRequest.method,
        headers: currentRequest.headers,
        body: currentRequest.body && ['POST', 'PUT', 'PATCH'].includes(currentRequest.method) 
          ? currentRequest.body 
          : undefined
      });

      const duration = Date.now() - startTime;
      const body = await response.text();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        duration
      });

      toast.success(`Request completed in ${duration}ms`);
    } catch (error) {
      toast.error("Request failed: " + (error instanceof Error ? error.message : 'Unknown error'));
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.body);
    toast.success("Response copied!");
  };

  const formatJSON = (text: string) => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 400 && status < 500) return 'text-yellow-500';
    if (status >= 500) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          <h3 className="font-semibold">API Testing Suite</h3>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 mr-1" />
          Pro
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Requests Sidebar */}
        <Card className="col-span-1 p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Requests</span>
            <Button size="icon" variant="ghost" onClick={addRequest}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <ScrollArea className="h-[500px]">
            <div className="space-y-1">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted ${
                    selectedRequest === req.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedRequest(req.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="text-xs">
                      {req.method}
                    </Badge>
                    <span className="text-xs truncate">{req.name}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRequest(req.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Main Content */}
        <div className="col-span-3 space-y-4">
          {currentRequest && (
            <>
              <div className="space-y-4">
                <Input
                  placeholder="Request Name"
                  value={currentRequest.name}
                  onChange={(e) => updateRequest('name', e.target.value)}
                />

                <div className="flex gap-2">
                  <Select 
                    value={currentRequest.method} 
                    onValueChange={(v) => updateRequest('method', v)}
                  >
                    <SelectTrigger className="w-[120px]">
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
                  <Input
                    placeholder="https://api.example.com/endpoint"
                    value={currentRequest.url}
                    onChange={(e) => updateRequest('url', e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={sendRequest} disabled={loading || !currentRequest.url}>
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? 'Sending...' : 'Send'}
                  </Button>
                </div>

                <Tabs defaultValue="body">
                  <TabsList>
                    <TabsTrigger value="body">Body</TabsTrigger>
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="body" className="space-y-2">
                    <Textarea
                      placeholder="Request body (JSON)"
                      value={currentRequest.body || ''}
                      onChange={(e) => updateRequest('body', e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </TabsContent>

                  <TabsContent value="headers" className="space-y-2">
                    <Textarea
                      placeholder="Headers (JSON format)"
                      value={JSON.stringify(currentRequest.headers, null, 2)}
                      onChange={(e) => {
                        try {
                          updateRequest('headers', JSON.parse(e.target.value));
                        } catch {}
                      }}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Response */}
              {response && (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Response</h4>
                      <Badge className={getStatusColor(response.status)}>
                        {response.status} {response.statusText}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {response.duration}ms
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={copyResponse}>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>

                  <ScrollArea className="h-[200px]">
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      <code>{formatJSON(response.body)}</code>
                    </pre>
                  </ScrollArea>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      <Card className="p-3 bg-muted/50">
        <h4 className="text-sm font-medium mb-2">Features:</h4>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• Full HTTP method support (GET, POST, PUT, DELETE, PATCH)</li>
          <li>• Custom headers and body</li>
          <li>• Response time tracking</li>
          <li>• JSON formatting</li>
          <li>• Request collections</li>
          <li>• Status code visualization</li>
        </ul>
      </Card>
    </Card>
  );
}