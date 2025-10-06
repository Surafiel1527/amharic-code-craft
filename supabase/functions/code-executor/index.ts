import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { code, language, projectId, userId } = await req.json();

    console.log('🚀 Executing code:', { language, projectId });

    let result;
    const startTime = performance.now();

    if (language === 'typescript' || language === 'javascript') {
      result = await executeJavaScript(code);
    } else if (language === 'python') {
      result = await executePython(code);
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }

    const executionTime = performance.now() - startTime;

    // Store execution result
    if (projectId && userId) {
      await supabase.from('code_executions').insert({
        project_id: projectId,
        user_id: userId,
        code,
        language,
        output: result.output,
        error: result.error,
        execution_time_ms: executionTime,
        memory_used_mb: result.memoryUsed,
        success: result.success
      });
    }

    return new Response(JSON.stringify({
      success: true,
      result: {
        ...result,
        executionTime: Math.round(executionTime)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Code execution error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeJavaScript(code: string) {
  const capturedLogs: string[] = [];
  const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

  // Create a safe execution context
  const safeConsole = {
    log: (...args: any[]) => capturedLogs.push(args.map(a => String(a)).join(' ')),
    error: (...args: any[]) => capturedLogs.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
    warn: (...args: any[]) => capturedLogs.push('[WARN] ' + args.map(a => String(a)).join(' ')),
  };

  try {
    // Wrap code in an async function for safer execution
    const wrappedCode = `
      (async () => {
        const console = arguments[0];
        ${code}
      })(arguments[0])
    `;

    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Execution timeout (5s)')), 5000)
    );

    const executionPromise = (async () => {
      const func = new Function('arguments', wrappedCode);
      await func(safeConsole);
    })();

    await Promise.race([executionPromise, timeoutPromise]);

    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryUsed = Math.max(0, (memoryAfter - memoryBefore) / (1024 * 1024));

    return {
      success: true,
      output: capturedLogs.join('\n') || 'Code executed successfully (no output)',
      error: null,
      memoryUsed: Number(memoryUsed.toFixed(2))
    };

  } catch (error) {
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryUsed = Math.max(0, (memoryAfter - memoryBefore) / (1024 * 1024));

    return {
      success: false,
      output: capturedLogs.join('\n'),
      error: error instanceof Error ? error.message : String(error),
      memoryUsed: Number(memoryUsed.toFixed(2))
    };
  }
}

async function executePython(code: string) {
  // For Python, we'd need to integrate with a Python runtime
  // For now, return a helpful message
  return {
    success: false,
    output: '',
    error: 'Python execution requires external runtime integration. Consider using Pyodide for in-browser Python execution.',
    memoryUsed: 0
  };
}
