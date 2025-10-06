/**
 * Lazy-loaded Heavy Components
 * 
 * This file exports heavy components using React.lazy() for better performance.
 * These components are loaded on-demand when actually needed.
 * 
 * Benefits:
 * - Reduced initial bundle size
 * - Faster Time to Interactive (TTI)
 * - Better code splitting
 * - Improved performance on slower networks
 */

import { lazy } from 'react';

// Admin & Self-Modification Components
export const AdminSelfModifyChat = lazy(() => import('./AdminSelfModifyChat'));
export const AdminCustomizationsList = lazy(() => import('./AdminCustomizationsList'));
export const AdminSecurityDashboard = lazy(() => import('./AdminSecurityDashboard'));

// Code & Development Components
export const CodeEditor = lazy(() => import('./CodeEditor'));
export const CodeAnalysis = lazy(() => import('./CodeAnalysis'));
export const CodeReviewPanel = lazy(() => import('./CodeReviewPanel'));
export const CodeDiffViewer = lazy(() => import('./CodeDiffViewer'));

// AI & Intelligence Components
export const AIAnalytics = lazy(() => import('./AIAnalytics'));
export const AIImageGenerator = lazy(() => import('./AIImageGenerator'));
export const AIAssistant = lazy(() => import('./AIAssistant'));
export const AIAnalyticsDashboard = lazy(() => import('./AIAnalyticsDashboard'));
export const AICapabilitiesGuide = lazy(() => import('./AICapabilitiesGuide'));

// Deployment & Monitoring Components
export const DeploymentDashboard = lazy(() => import('./DeploymentDashboard'));
export const DeploymentManager = lazy(() => import('./DeploymentManager'));
export const DeploymentHealth = lazy(() => import('./DeploymentHealth'));
export const LiveMonitoringDashboard = lazy(() => import('./LiveMonitoringDashboard'));
export const PerformanceMonitor = lazy(() => import('./PerformanceMonitor'));

// Testing Components
export const TestGenerator = lazy(() => import('./TestGenerator'));
export const AutonomousTestingDashboard = lazy(() => import('./AutonomousTestingDashboard'));
export const AdvancedTestGenerator = lazy(() => import('./AdvancedTestGenerator'));

// Collaboration Components
export const CollaborationHub = lazy(() => import('./CollaborationHub'));
export const CollaborativeCodeEditor = lazy(() => import('./CollaborativeCodeEditor'));
export const SharedTerminal = lazy(() => import('./SharedTerminal'));

// Analytics & Insights Components
export const UsageAnalyticsDashboard = lazy(() => import('./UsageAnalyticsDashboard'));
export const ProjectAnalytics = lazy(() => import('./ProjectAnalytics'));
export const QualityMetrics = lazy(() => import('./QualityMetrics'));

// Package & Dependency Components
export const PackageUpdateManager = lazy(() => import('./PackageUpdateManager'));
export const IntelligentPackageManager = lazy(() => import('./IntelligentPackageManager'));
export const DependencyGraph = lazy(() => import('./DependencyGraph'));

// Documentation & Learning Components
export const DocumentationGenerator = lazy(() => import('./DocumentationGenerator'));
export const AISystemDocs = lazy(() => import('./AISystemDocs'));

// Enterprise Features
export const EnterpriseProjectDashboard = lazy(() => import('./EnterpriseProjectDashboard'));
export const CICDPipelineBuilder = lazy(() => import('./CICDPipelineBuilder'));
export const SecurityScanner = lazy(() => import('./SecurityScanner'));

// Intelligence & Self-Healing
export const MegaMindDashboard = lazy(() => import('./MegaMindDashboard'));
export const SelfHealingMonitor = lazy(() => import('./SelfHealingMonitor'));
export const IntelligenceSystemDemo = lazy(() => import('./IntelligenceSystemDemo'));

// Complex UI Components
export const TemplatesGallery = lazy(() => import('./TemplatesGallery'));
export const ThemeGallery = lazy(() => import('./ThemeGallery'));
export const ComponentLibrary = lazy(() => import('./ComponentLibrary'));

// Database Components
export const DatabaseCredentialsManager = lazy(() => import('./DatabaseCredentialsManager'));

// Generation & Builder Components
export const MultiFileGenerator = lazy(() => import('./MultiFileGenerator'));
export const ReactComponentGenerator = lazy(() => import('./ReactComponentGenerator'));
export const DesignToCode = lazy(() => import('./DesignToCode'));

/**
 * Usage Example:
 * 
 * import { Suspense } from 'react';
 * import { AdminSelfModifyChat } from '@/components/LazyComponents';
 * 
 * function MyComponent() {
 *   return (
 *     <Suspense fallback={<ComponentSkeleton />}>
 *       <AdminSelfModifyChat />
 *     </Suspense>
 *   );
 * }
 */
