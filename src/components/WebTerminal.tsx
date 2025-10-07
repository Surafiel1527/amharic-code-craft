import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Terminal as TerminalIcon, 
  Play, 
  Trash2, 
  History,
  ChevronRight,
  Copy,
  Check
} from "lucide-react";

interface TerminalOutput {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
  exitCode?: number;
  executionTime?: number;
}

export const WebTerminal = () => {
  const [command, setCommand] = useState("");
  const [outputs, setOutputs] = useState<TerminalOutput[]>([
    {
      id: '0',
      type: 'output',
      content: 'Web Terminal v1.0 - Type your commands below',
      timestamp: new Date()
    }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs]);

  const executeCommand = async () => {
    if (!command.trim() || isExecuting) return;

    const currentCommand = command.trim();
    const commandId = Date.now().toString();

    // Add command to output
    setOutputs(prev => [...prev, {
      id: commandId,
      type: 'command',
      content: currentCommand,
      timestamp: new Date()
    }]);

    // Add to history
    setCommandHistory(prev => [...prev, currentCommand]);
    setHistoryIndex(-1);
    setCommand("");
    setIsExecuting(true);

    try {
      // Handle built-in commands
      if (currentCommand === 'clear') {
        setOutputs([{
          id: Date.now().toString(),
          type: 'output',
          content: 'Terminal cleared',
          timestamp: new Date()
        }]);
        setIsExecuting(false);
        return;
      }

      if (currentCommand === 'history') {
        setOutputs(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'output',
          content: commandHistory.map((cmd, idx) => `${idx + 1}  ${cmd}`).join('\n'),
          timestamp: new Date()
        }]);
        setIsExecuting(false);
        return;
      }

      if (currentCommand === 'help') {
        const helpText = `🚀 Mega Mind Terminal - Available Commands:

Built-in:
  clear           - Clear terminal
  history         - Show command history
  help            - Show this help
  
Package Management (via unified-package-manager):
  npm install     - Detect & show dependencies
  npm list        - List installed packages
  npm outdated    - Check for updates
  
Code Execution (via code-executor):
  node script.js  - Execute JavaScript
  Any JS code     - Run directly in Deno sandbox
  
Examples:
  > console.log("Hello World")
  > npm install
  > const x = [1,2,3]; x.map(n => n * 2)`;
        
        setOutputs(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'output',
          content: helpText,
          timestamp: new Date()
        }]);
        setIsExecuting(false);
        return;
      }

      // Handle npm commands via unified-package-manager
      if (currentCommand.startsWith('npm ')) {
        const npmCmd = currentCommand.substring(4).trim();
        let operation = 'auto_detect';
        
        if (npmCmd === 'list' || npmCmd === 'ls') {
          operation = 'list_installed';
        } else if (npmCmd === 'outdated') {
          operation = 'check_updates';
        } else if (npmCmd.startsWith('install')) {
          setOutputs(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            type: 'output',
            content: '🔍 Analyzing codebase for dependencies...',
            timestamp: new Date()
          }]);
        }

        const { data, error } = await supabase.functions.invoke('unified-package-manager', {
          body: { operation }
        });

        if (error) throw error;

        const output = JSON.stringify(data, null, 2);
        setOutputs(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          type: 'output',
          content: output,
          timestamp: new Date()
        }]);
        setIsExecuting(false);
        inputRef.current?.focus();
        return;
      }

      // Execute JavaScript/TypeScript code via code-executor
      const { data, error } = await supabase.functions.invoke('code-executor', {
        body: {
          code: currentCommand,
          language: 'javascript'
        }
      });

      if (error) throw error;

      const output = data.success ? data.output : data.error;
      setOutputs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: data.success ? 'output' : 'error',
        content: output || 'Command executed successfully',
        timestamp: new Date(),
        executionTime: data.memoryUsed ? undefined : Date.now() - parseInt(commandId)
      }]);

    } catch (error: any) {
      console.error('Command execution error:', error);
      setOutputs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'error',
        content: error.message || 'Command execution failed',
        timestamp: new Date()
      }]);
    } finally {
      setIsExecuting(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand("");
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const copyOutput = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied to clipboard",
      duration: 2000
    });
  };

  const clearTerminal = () => {
    setOutputs([{
      id: Date.now().toString(),
      type: 'output',
      content: 'Terminal cleared',
      timestamp: new Date()
    }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
          <TerminalIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Web Terminal</h2>
          <p className="text-muted-foreground">Execute commands directly in your browser</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TerminalIcon className="h-5 w-5" />
                Interactive Shell
              </CardTitle>
              <CardDescription>
                Type commands and see results in real-time
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearTerminal}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeCommand()}
              >
                <History className="h-4 w-4 mr-2" />
                History: {commandHistory.length}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Terminal Output */}
          <Card className="bg-black/90 border-0">
            <CardContent className="p-4">
              <ScrollArea className="h-[400px] font-mono text-sm" ref={scrollRef}>
                <div className="space-y-2">
                  {outputs.map((output) => (
                    <div key={output.id} className="group relative">
                      {output.type === 'command' && (
                        <div className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-green-400 mt-0.5" />
                          <span className="text-green-400 font-semibold">$</span>
                          <span className="text-white flex-1">{output.content}</span>
                        </div>
                      )}
                      {output.type === 'output' && (
                        <div className="flex items-start gap-2 group">
                          <pre className="text-gray-300 whitespace-pre-wrap flex-1 pl-6">
                            {output.content}
                          </pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyOutput(output.content, output.id)}
                          >
                            {copiedId === output.id ? (
                              <Check className="h-3 w-3 text-green-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )}
                      {output.type === 'error' && (
                        <div className="flex items-start gap-2">
                          <pre className="text-red-400 whitespace-pre-wrap pl-6">
                            {output.content}
                          </pre>
                        </div>
                      )}
                      {output.executionTime !== undefined && (
                        <div className="pl-6 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {output.executionTime}ms • Exit code: {output.exitCode}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                  {isExecuting && (
                    <div className="flex items-center gap-2 pl-6">
                      <div className="animate-pulse text-gray-400">Executing...</div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Command Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <span className="text-green-500 font-mono font-bold">$</span>
              </div>
              <Input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command... (try 'help' for available commands)"
                className="font-mono pl-8"
                disabled={isExecuting}
                autoFocus
              />
            </div>
            <Button
              onClick={executeCommand}
              disabled={!command.trim() || isExecuting}
            >
              <Play className="h-4 w-4 mr-2" />
              Execute
            </Button>
          </div>

          {/* Quick Commands */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Quick commands:</span>
            {['ls -la', 'pwd', 'node --version', 'python3 --version', 'npm list', 'help'].map((cmd) => (
              <Button
                key={cmd}
                variant="outline"
                size="sm"
                onClick={() => {
                  setCommand(cmd);
                  inputRef.current?.focus();
                }}
                disabled={isExecuting}
              >
                {cmd}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TerminalIcon className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold">Secure Execution</div>
                <div className="text-sm text-muted-foreground">Whitelisted commands only</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <History className="h-8 w-8 text-blue-500" />
              <div>
                <div className="font-semibold">Command History</div>
                <div className="text-sm text-muted-foreground">Use ↑↓ arrows to navigate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Copy className="h-8 w-8 text-green-500" />
              <div>
                <div className="font-semibold">Copy Output</div>
                <div className="text-sm text-muted-foreground">Hover & click to copy</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
