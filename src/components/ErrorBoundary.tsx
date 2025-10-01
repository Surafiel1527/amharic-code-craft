import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 space-y-6 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">የሆነ ስህተት ተከስቷል</h2>
              <p className="text-muted-foreground">
                ይቅርታ፣ አፕሊኬሽኑ ችግር ገጥሞታል። እባክዎ እንደገና ይሞክሩ።
              </p>
              {this.state.error && (
                <details className="text-left text-xs text-muted-foreground mt-4 p-4 bg-muted rounded-lg">
                  <summary className="cursor-pointer">Technical Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-all">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>

            <Button onClick={this.handleReset} className="w-full">
              ወደ መነሻ ገጽ ተመለስ
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
