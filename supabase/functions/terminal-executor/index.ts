import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, workingDirectory = '/tmp' } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    console.log('Executing command:', command);

    // Security: Whitelist of allowed commands
    const allowedCommands = [
      'ls', 'pwd', 'echo', 'cat', 'mkdir', 'rm', 'cp', 'mv', 'touch',
      'npm', 'node', 'python', 'python3', 'pip', 'pip3',
      'git', 'curl', 'wget', 'grep', 'find', 'wc', 'head', 'tail',
      'deno', 'bun'
    ];

    const commandParts = command.trim().split(/\s+/);
    const baseCommand = commandParts[0];

    if (!allowedCommands.includes(baseCommand)) {
      return new Response(
        JSON.stringify({ 
          error: `Command '${baseCommand}' is not allowed for security reasons`,
          allowedCommands 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute command
    let output = '';
    let exitCode = 0;
    let executionTime = 0;

    try {
      const startTime = Date.now();
      
      const process = new Deno.Command(baseCommand, {
        args: commandParts.slice(1),
        cwd: workingDirectory,
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await process.output();
      
      exitCode = code;
      executionTime = Date.now() - startTime;

      const decoder = new TextDecoder();
      const stdoutText = decoder.decode(stdout);
      const stderrText = decoder.decode(stderr);

      output = stdoutText || stderrText || `Command executed successfully (exit code: ${code})`;

    } catch (error: any) {
      output = `Error executing command: ${error.message}`;
      exitCode = 1;
    }

    // Log command execution
    await supabase
      .from('terminal_history')
      .insert({
        user_id: user.id,
        command,
        output,
        exit_code: exitCode,
        working_directory: workingDirectory,
        execution_time_ms: executionTime
      });

    return new Response(
      JSON.stringify({
        output,
        exitCode,
        executionTime,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in terminal-executor:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
