import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityOperation {
  operation: 'scan_code' | 'scan_dependencies' | 'check_vulnerabilities' | 'audit_access' | 'validate_permissions' | 'encrypt_data' | 'generate_report' | 'get_security_score' | 'encrypt' | 'decrypt' | 'security_audit';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Unified Security request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: SecurityOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'scan_code':
        result = await handleScanCode(payload.params, supabase, requestId);
        break;
      case 'scan_dependencies':
        result = await handleScanDependencies(payload.params, supabase, requestId);
        break;
      case 'check_vulnerabilities':
        result = await handleCheckVulnerabilities(payload.params, supabase, requestId);
        break;
      case 'audit_access':
        result = await handleAuditAccess(payload.params, supabase, requestId);
        break;
      case 'validate_permissions':
        result = await handleValidatePermissions(payload.params, supabase, requestId);
        break;
      case 'encrypt_data':
        result = await handleEncryptData(payload.params, supabase, requestId);
        break;
      case 'generate_report':
        result = await handleGenerateReport(payload.params, supabase, requestId);
        break;
      case 'get_security_score':
        result = await handleGetSecurityScore(payload.params, supabase, requestId);
        break;
      default:
        throw new Error(`Unknown operation: ${payload.operation}`);
    }

    console.log(`[${requestId}] Operation completed successfully`);
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    // SECURITY: Generic error message to prevent schema/internal information disclosure
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Security operation failed' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleScanCode(params: any, supabase: any, requestId: string) {
  const { code, language, userId, projectId } = params;
  
  if (!code || !language) {
    throw new Error('code and language are required');
  }

  console.log(`[${requestId}] Scanning ${language} code for security issues`);

  const securityPatterns = [
    { pattern: /eval\(/, severity: 'critical', issue: 'Dangerous eval() usage' },
    { pattern: /innerHTML\s*=/, severity: 'high', issue: 'Potential XSS via innerHTML' },
    { pattern: /document\.write\(/, severity: 'high', issue: 'Unsafe document.write()' },
    { pattern: /password\s*=\s*["'][^"']+["']/, severity: 'critical', issue: 'Hardcoded password detected' },
    { pattern: /api[_-]?key\s*=\s*["'][^"']+["']/, severity: 'critical', issue: 'Hardcoded API key detected' },
    { pattern: /exec\(/, severity: 'high', issue: 'Command execution detected' },
    { pattern: /dangerouslySetInnerHTML/, severity: 'high', issue: 'Dangerous HTML rendering' },
  ];

  const issues: any[] = [];
  const lines = code.split('\n');

  lines.forEach((line: string, index: number) => {
    securityPatterns.forEach(({ pattern, severity, issue }) => {
      if (pattern.test(line)) {
        issues.push({
          line: index + 1,
          severity,
          issue,
          code: line.trim(),
        });
      }
    });
  });

  // SECURITY: Sanitize code snippets to prevent XSS before storage
  const sanitizedIssues = issues.map(issue => ({
    ...issue,
    code: issue.code ? 
      issue.code.replace(/<script[^>]*>.*?<\/script>/gi, '[SCRIPT_REMOVED]')
                .replace(/javascript:/gi, '[JS_REMOVED]')
                .replace(/on\w+\s*=/gi, '[EVENT_REMOVED]') : 
      issue.code
  }));

  // Store scan results
  const { data: scan, error } = await supabase
    .from('security_scans')
    .insert({
      user_id: userId || null,
      project_id: projectId || null,
      scan_type: 'code',
      language,
      issues_found: sanitizedIssues.length,
      issues_details: sanitizedIssues,
      severity_breakdown: {
        critical: sanitizedIssues.filter(i => i.severity === 'critical').length,
        high: sanitizedIssues.filter(i => i.severity === 'high').length,
        medium: sanitizedIssues.filter(i => i.severity === 'medium').length,
        low: sanitizedIssues.filter(i => i.severity === 'low').length,
      },
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Code scan complete: ${issues.length} issues found`);
  return {
    scanId: scan.id,
    issuesFound: issues.length,
    issues,
    score: Math.max(0, 100 - (issues.length * 10)),
  };
}

async function handleScanDependencies(params: any, supabase: any, requestId: string) {
  const { dependencies, userId, projectId } = params;
  
  if (!dependencies || !Array.isArray(dependencies)) {
    throw new Error('dependencies array is required');
  }

  console.log(`[${requestId}] Scanning ${dependencies.length} dependencies`);

  const vulnerabilities: any[] = [];

  // Simulate dependency scanning (in production, integrate with npm audit or snyk)
  for (const dep of dependencies) {
    const { name, version } = dep;
    
    // Check for known vulnerable patterns
    if (version.includes('0.0.') || version.startsWith('0.1.')) {
      vulnerabilities.push({
        package: name,
        version,
        severity: 'medium',
        issue: 'Very early version, may contain security issues',
        recommendation: 'Update to latest stable version',
      });
    }
  }

  const { data: scan, error } = await supabase
    .from('security_scans')
    .insert({
      user_id: userId || null,
      project_id: projectId || null,
      scan_type: 'dependencies',
      issues_found: vulnerabilities.length,
      issues_details: vulnerabilities,
      severity_breakdown: {
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length,
      },
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Dependency scan complete: ${vulnerabilities.length} vulnerabilities`);
  return {
    scanId: scan.id,
    totalDependencies: dependencies.length,
    vulnerabilities,
    vulnerablePackages: vulnerabilities.length,
  };
}

async function handleCheckVulnerabilities(params: any, supabase: any, requestId: string) {
  const { projectId, userId } = params;
  
  console.log(`[${requestId}] Checking vulnerabilities`);

  // Get recent security scans
  let query = supabase
    .from('security_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (userId) query = query.eq('user_id', userId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data: scans, error } = await query;
  if (error) throw error;

  const totalIssues = scans?.reduce((sum: number, scan: any) => sum + (scan.issues_found || 0), 0) || 0;
  const criticalIssues = scans?.reduce((sum: number, scan: any) => 
    sum + (scan.severity_breakdown?.critical || 0), 0) || 0;

  console.log(`[${requestId}] Vulnerability check: ${totalIssues} total, ${criticalIssues} critical`);
  return {
    totalScans: scans?.length || 0,
    totalIssues,
    criticalIssues,
    recentScans: scans || [],
    status: criticalIssues > 0 ? 'action_required' : 'secure',
  };
}

async function handleAuditAccess(params: any, supabase: any, requestId: string) {
  const { userId, resourceType, action, resourceId, metadata = {} } = params;
  
  if (!userId || !resourceType || !action) {
    throw new Error('userId, resourceType, and action are required');
  }

  console.log(`[${requestId}] Auditing access: ${action} on ${resourceType}`);

  const { data: auditLog, error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId || null,
      action,
      metadata,
      severity: 'info',
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Access audited: ${auditLog.id}`);
  return { auditId: auditLog.id, logged: true };
}

async function handleValidatePermissions(params: any, supabase: any, requestId: string) {
  const { userId, requiredRole, resourceId } = params;
  
  if (!userId || !requiredRole) {
    throw new Error('userId and requiredRole are required');
  }

  console.log(`[${requestId}] Validating permissions for user: ${userId}`);

  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) throw error;

  const userRoles = roles?.map((r: any) => r.role) || [];
  const hasPermission = userRoles.includes(requiredRole) || userRoles.includes('admin');

  console.log(`[${requestId}] Permission check: ${hasPermission ? 'granted' : 'denied'}`);
  return {
    hasPermission,
    userRoles,
    requiredRole,
  };
}

async function handleEncryptData(params: any, supabase: any, requestId: string) {
  const { data, algorithm = 'aes-256' } = params;
  
  if (!data) throw new Error('data is required');

  console.log(`[${requestId}] Encrypting data with ${algorithm}`);

  // Simple base64 encoding (in production, use proper encryption)
  const encrypted = btoa(JSON.stringify(data));

  console.log(`[${requestId}] Data encrypted`);
  return {
    encrypted,
    algorithm,
    note: 'This is a demonstration. Use proper encryption in production.',
  };
}

async function handleGenerateReport(params: any, supabase: any, requestId: string) {
  const { userId, projectId, timeRange = '30d', reportType = 'comprehensive' } = params;
  
  console.log(`[${requestId}] Generating ${reportType} security report`);

  const days = parseInt(timeRange) || 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get security scans
  let scansQuery = supabase
    .from('security_scans')
    .select('*')
    .gte('created_at', cutoff);

  if (userId) scansQuery = scansQuery.eq('user_id', userId);
  if (projectId) scansQuery = scansQuery.eq('project_id', projectId);

  const { data: scans } = await scansQuery;

  // Get audit logs
  let auditQuery = supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', cutoff);

  if (userId) auditQuery = auditQuery.eq('user_id', userId);

  const { data: audits } = await auditQuery;

  const report = {
    generatedAt: new Date().toISOString(),
    timeRange,
    reportType,
    summary: {
      totalScans: scans?.length || 0,
      totalIssues: scans?.reduce((sum: number, s: any) => sum + (s.issues_found || 0), 0) || 0,
      totalAudits: audits?.length || 0,
    },
    scans: scans || [],
    recentAudits: (audits || []).slice(0, 20),
  };

  console.log(`[${requestId}] Security report generated`);
  return report;
}

async function handleGetSecurityScore(params: any, supabase: any, requestId: string) {
  const { userId, projectId } = params;
  
  console.log(`[${requestId}] Calculating security score`);

  // Get recent scans
  let query = supabase
    .from('security_scans')
    .select('*')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (userId) query = query.eq('user_id', userId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data: scans } = await query;

  let score = 100;

  if (scans && scans.length > 0) {
    const totalCritical = scans.reduce((sum: number, s: any) => sum + (s.severity_breakdown?.critical || 0), 0);
    const totalHigh = scans.reduce((sum: number, s: any) => sum + (s.severity_breakdown?.high || 0), 0);
    const totalMedium = scans.reduce((sum: number, s: any) => sum + (s.severity_breakdown?.medium || 0), 0);

    score -= totalCritical * 20;
    score -= totalHigh * 10;
    score -= totalMedium * 5;
    score = Math.max(0, score);
  }

  let rating: string;
  if (score >= 90) rating = 'A';
  else if (score >= 80) rating = 'B';
  else if (score >= 70) rating = 'C';
  else if (score >= 60) rating = 'D';
  else rating = 'F';

  console.log(`[${requestId}] Security score: ${score}/100 (${rating})`);
  return {
    score,
    rating,
    totalScans: scans?.length || 0,
    recommendations: score < 80 ? ['Address high-severity issues', 'Regular security scans'] : [],
  };
}
