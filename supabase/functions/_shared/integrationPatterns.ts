/**
 * Integration Pattern Detection
 * Analyzes how new features should integrate with existing code
 */

export interface IntegrationPlan {
  files_to_modify: string[];
  files_to_create: string[];
  integration_points: IntegrationPoint[];
  requires_migration: boolean;
  requires_new_components: boolean;
}

export interface IntegrationPoint {
  type: string;
  description: string;
  target_file?: string;
  files?: string[];
}

/**
 * Analyze where new feature integrates with existing code
 */
export function analyzeIntegrationPoints(
  newFeature: string,
  existingCode: any[]
): IntegrationPlan {
  const plan: IntegrationPlan = {
    files_to_modify: [],
    files_to_create: [],
    integration_points: [],
    requires_migration: false,
    requires_new_components: false
  };

  const newFeatureLower = newFeature.toLowerCase();

  // Auth/Login pattern
  if (newFeatureLower.includes('auth') || newFeatureLower.includes('login')) {
    plan.requires_migration = true;
    plan.files_to_create.push('src/pages/Auth.tsx');
    plan.files_to_modify = existingCode
      .filter(code => code.file_path.includes('tsx'))
      .map(code => code.file_path);
    plan.integration_points.push({
      type: 'wrap_with_auth',
      description: 'Wrap existing components with ProtectedRoute',
      files: plan.files_to_modify
    });
  }

  // Profile/Settings pattern
  if (newFeatureLower.includes('profile') || newFeatureLower.includes('settings')) {
    plan.files_to_create.push('src/pages/Settings.tsx');
    plan.integration_points.push({
      type: 'add_profile_page',
      description: 'Create profile/settings page and link to existing features'
    });
  }

  // Terms/Agreement pattern
  if (newFeatureLower.includes('terms') || newFeatureLower.includes('agreement')) {
    plan.files_to_create.push('src/components/TermsAgreement.tsx');
    plan.integration_points.push({
      type: 'add_to_signup',
      description: 'Add terms checkbox to existing signup form',
      target_file: 'src/pages/Auth.tsx'
    });
  }

  return plan;
}
