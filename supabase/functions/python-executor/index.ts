import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  exitCode: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, packages = [] } = await req.json();

    if (!code) {
      throw new Error('Python code is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    const startTime = Date.now();
    let output = '';
    let error = '';
    let exitCode = 0;

    try {
      // Create a temporary Python file
      const tempFile = await Deno.makeTempFile({ suffix: '.py' });
      await Deno.writeTextFile(tempFile, code);

      // Install packages if needed
      if (packages.length > 0) {
        const pipInstall = new Deno.Command('pip', {
          args: ['install', '--user', ...packages],
          stdout: 'piped',
          stderr: 'piped',
        });

        const pipOutput = await pipInstall.output();
        if (!pipOutput.success) {
          console.error('Pip install failed:', new TextDecoder().decode(pipOutput.stderr));
        }
      }

      // Execute Python code
      const pythonProcess = new Deno.Command('python3', {
        args: [tempFile],
        stdout: 'piped',
        stderr: 'piped',
      });

      const pythonOutput = await pythonProcess.output();
      output = new TextDecoder().decode(pythonOutput.stdout);
      error = new TextDecoder().decode(pythonOutput.stderr);
      exitCode = pythonOutput.code;

      // Clean up temp file
      try {
        await Deno.remove(tempFile);
      } catch {
        // Ignore cleanup errors
      }

    } catch (execError: any) {
      error = execError.message;
      exitCode = 1;
    }

    const executionTime = Date.now() - startTime;

    const result: ExecutionResult = {
      success: exitCode === 0 && !error,
      output,
      error: error || undefined,
      executionTime,
      exitCode,
    };

    // Log execution to database
    if (user) {
      await supabaseClient.from('python_executions').insert({
        user_id: user.id,
        code_length: code.length,
        packages_installed: packages.length,
        success: result.success,
        execution_time_ms: executionTime,
        exit_code: exitCode,
        has_error: !!error,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Python execution error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        output: '',
        error: error.message,
        executionTime: 0,
        exitCode: 1,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
