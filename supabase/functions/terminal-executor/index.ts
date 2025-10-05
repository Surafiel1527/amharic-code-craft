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
    const { sessionId, command } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    console.log(`Executing command for session ${sessionId}: ${command}`);

    // Execute command with Deno
    let output = '';
    let exitCode = 0;
    let status: 'completed' | 'failed' = 'completed';

    try {
      // Parse command and arguments
      const [cmd, ...args] = command.split(' ');
      
      // Security: Only allow safe commands
      const allowedCommands = [
        'npm', 'node', 'git', 'ls', 'pwd', 'echo', 'cat', 
        'grep', 'find', 'test', 'vitest', 'yarn', 'pnpm'
      ];
      
      if (!allowedCommands.includes(cmd)) {
        throw new Error(`Command '${cmd}' is not allowed. Allowed: ${allowedCommands.join(', ')}`);
      }

      // Execute command
      const process = new Deno.Command(cmd, {
        args,
        stdout: 'piped',
        stderr: 'piped',
      });

      const { code, stdout, stderr } = await process.output();
      exitCode = code;

      const decoder = new TextDecoder();
      output = decoder.decode(stdout);
      
      if (stderr.length > 0) {
        const errorOutput = decoder.decode(stderr);
        output += '\n' + errorOutput;
      }

      if (code !== 0) {
        status = 'failed';
      }
    } catch (error) {
      console.error('Command execution error:', error);
      output = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      exitCode = 1;
      status = 'failed';
    }

    // Update terminal session with results
    const { error: updateError } = await supabaseClient
      .from('terminal_sessions')
      .update({
        output,
        exit_code: exitCode,
        status,
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        output,
        exitCode,
        status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Terminal executor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
