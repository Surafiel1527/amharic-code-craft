import { supabase } from "@/integrations/supabase/client";

export type BuildEventType = 
  | 'file_created'
  | 'package_installed'
  | 'function_deployed'
  | 'auth_setup'
  | 'database_ready'
  | 'build_started'
  | 'build_complete'
  | 'dependency_detected'
  | 'test_generated'
  | 'deployment_success';

export interface BuildEventData {
  eventType: BuildEventType;
  title: string;
  details?: Record<string, any>;
  status?: 'success' | 'running' | 'failed' | 'info';
  motivationMessage?: string;
  projectId?: string;
}

// Motivational messages for different event types
const MOTIVATION_MESSAGES: Record<BuildEventType, string[]> = {
  file_created: [
    "Good news! File created successfully 🎉",
    "New file is ready to use ✨",
    "File structure looking great! 📁"
  ],
  package_installed: [
    "Package installed! Your project is getting more powerful 💪",
    "Dependencies are up and running! 🚀",
    "New package added to your toolkit! 🔧"
  ],
  function_deployed: [
    "Edge function deployed! Backend is live 🌐",
    "Function is ready to serve requests! ⚡",
    "Deployment successful! Your code is running 🎊"
  ],
  auth_setup: [
    "Authentication is complete! Your app is now secure 🔒",
    "User system is ready! Welcome page set up ✅",
    "Login flow is configured and working! 🛡️"
  ],
  database_ready: [
    "Database is ready! Tables created successfully 💾",
    "Your data layer is all set up! 🗄️",
    "Database schema deployed! Storage ready 📊"
  ],
  build_started: [
    "Building your amazing project... 🔨",
    "Compilation in progress! Hang tight ⏳",
    "Bundling your code with care... 📦"
  ],
  build_complete: [
    "Build complete! Your project is production-ready 🎉",
    "Successfully compiled! Everything works perfectly ✨",
    "Build finished! Time to test your creation 🚀"
  ],
  dependency_detected: [
    "Smart detection found missing packages! 🔍",
    "Dependencies analyzed and identified! 🎯",
    "We've got your dependencies covered! 💡"
  ],
  test_generated: [
    "Tests generated! Quality assurance ready 🧪",
    "Test suite created! Your code is protected ✅",
    "Testing framework is in place! 🎯"
  ],
  deployment_success: [
    "Deployment successful! Your app is live 🌍",
    "Production deployment complete! Users can access now 🎉",
    "App is online and serving traffic! 🚀"
  ]
};

function getRandomMotivation(eventType: BuildEventType): string {
  const messages = MOTIVATION_MESSAGES[eventType] || [];
  return messages[Math.floor(Math.random() * messages.length)] || '';
}

/**
 * Emits a build event to the database for real-time activity logging
 */
export async function emitBuildEvent(data: BuildEventData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('No authenticated user, skipping build event emission');
      return;
    }

    const motivationMessage = data.motivationMessage || 
      (data.status === 'success' ? getRandomMotivation(data.eventType) : undefined);

    await supabase.from('build_events').insert({
      user_id: user.id,
      project_id: data.projectId || null,
      event_type: data.eventType,
      title: data.title,
      details: data.details || {},
      status: data.status || 'success',
      motivation_message: motivationMessage
    });
  } catch (error) {
    console.error('Failed to emit build event:', error);
  }
}

/**
 * Convenience functions for common events
 */
export const buildEvents = {
  fileCreated: (fileName: string, details?: Record<string, any>) => 
    emitBuildEvent({
      eventType: 'file_created',
      title: `Created ${fileName}`,
      details,
      status: 'success'
    }),

  packageInstalled: (packageName: string, version?: string) =>
    emitBuildEvent({
      eventType: 'package_installed',
      title: `Installed ${packageName}`,
      details: { package: packageName, version },
      status: 'success'
    }),

  functionDeployed: (functionName: string) =>
    emitBuildEvent({
      eventType: 'function_deployed',
      title: `Deployed ${functionName}`,
      status: 'success'
    }),

  authSetup: () =>
    emitBuildEvent({
      eventType: 'auth_setup',
      title: 'Authentication configured',
      status: 'success'
    }),

  databaseReady: (tables: string[]) =>
    emitBuildEvent({
      eventType: 'database_ready',
      title: 'Database schema ready',
      details: { tables },
      status: 'success'
    }),

  buildStarted: () =>
    emitBuildEvent({
      eventType: 'build_started',
      title: 'Build started',
      status: 'running'
    }),

  buildComplete: (duration: number) =>
    emitBuildEvent({
      eventType: 'build_complete',
      title: 'Build completed',
      details: { duration_ms: duration },
      status: 'success'
    }),

  dependenciesDetected: (packages: string[]) =>
    emitBuildEvent({
      eventType: 'dependency_detected',
      title: `Detected ${packages.length} missing dependencies`,
      details: { packages },
      status: 'info'
    }),

  testsGenerated: (count: number) =>
    emitBuildEvent({
      eventType: 'test_generated',
      title: `Generated ${count} tests`,
      details: { test_count: count },
      status: 'success'
    }),

  deploymentSuccess: (url: string) =>
    emitBuildEvent({
      eventType: 'deployment_success',
      title: 'Deployment successful',
      details: { url },
      status: 'success'
    })
};