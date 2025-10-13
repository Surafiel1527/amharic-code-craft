/**
 * Feature Orchestrator - Enterprise Multi-Feature Coordination
 * 
 * Coordinates multiple features with dependency resolution for complex apps.
 * Breaks large requests (e.g., "Build TikTok clone") into ordered phases.
 * Integrated with External Resource Guide for universal intelligence
 * 
 * Example: TikTok Clone Breakdown
 * Phase 1: [Auth, Profiles, Database Schema]
 * Phase 2: [Video Upload, Storage, Processing]
 * Phase 3: [Feed, Comments, Likes]
 * Phase 4: [Search, Notifications]
 */

import { detectRequiredResources, type ExternalResource } from './externalResourceGuide.ts';

export interface Feature {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  estimatedFiles: number;
  complexity: 'low' | 'medium' | 'high';
  requiredAPIs?: string[];
  databaseTables?: string[];
  priority: number;
}

export interface Phase {
  phaseNumber: number;
  features: Feature[];
  filesCount: number;
  estimatedDuration: string;
  readyToStart: boolean;
}

export interface OrchestrationPlan {
  phases: Phase[];
  totalFeatures: number;
  totalFiles: number;
  estimatedTimeline: string;
  externalAPIs: string[];
  databaseSchema: {
    totalTables: number;
    tables: string[];
  };
  requiredExternalResources?: ExternalResource[]; // 🆕 External resource guidance
}

export class FeatureOrchestrator {
  private readonly featureConfigs: Record<string, Partial<Feature>> = {
    database: {
      name: 'Database Schema',
      description: 'Core database tables and relationships',
      dependencies: [],
      estimatedFiles: 1,
      complexity: 'medium',
      priority: 1,
    },
    authentication: {
      name: 'Authentication',
      description: 'User signup, login, and session management',
      dependencies: ['database'],
      estimatedFiles: 5,
      complexity: 'medium',
      priority: 2,
    },
    userProfiles: {
      name: 'User Profiles',
      description: 'User profile management and display',
      dependencies: ['authentication', 'database'],
      estimatedFiles: 4,
      complexity: 'low',
      priority: 3,
    },
    videoUpload: {
      name: 'Video Upload',
      description: 'Video file upload and storage',
      dependencies: ['authentication', 'database'],
      estimatedFiles: 6,
      complexity: 'high',
      requiredAPIs: ['Cloudinary', 'AWS S3'],
      databaseTables: ['videos', 'video_metadata'],
      priority: 4,
    },
    videoProcessing: {
      name: 'Video Processing',
      description: 'Video transcoding and optimization',
      dependencies: ['videoUpload'],
      estimatedFiles: 4,
      complexity: 'high',
      requiredAPIs: ['Cloudinary', 'Mux'],
      priority: 5,
    },
    feed: {
      name: 'Content Feed',
      description: 'Main content feed with infinite scroll',
      dependencies: ['authentication', 'videoUpload', 'database'],
      estimatedFiles: 8,
      complexity: 'high',
      databaseTables: ['feed_items', 'user_interactions'],
      priority: 6,
    },
    comments: {
      name: 'Comments System',
      description: 'Commenting and replies',
      dependencies: ['authentication', 'feed'],
      estimatedFiles: 5,
      complexity: 'medium',
      databaseTables: ['comments', 'comment_replies'],
      priority: 7,
    },
    likes: {
      name: 'Likes & Reactions',
      description: 'Like and reaction system',
      dependencies: ['authentication', 'feed'],
      estimatedFiles: 3,
      complexity: 'low',
      databaseTables: ['likes', 'reactions'],
      priority: 7,
    },
    search: {
      name: 'Search',
      description: 'Content and user search',
      dependencies: ['database', 'feed'],
      estimatedFiles: 6,
      complexity: 'medium',
      priority: 8,
    },
    notifications: {
      name: 'Notifications',
      description: 'Real-time notifications',
      dependencies: ['authentication'],
      estimatedFiles: 5,
      complexity: 'medium',
      databaseTables: ['notifications'],
      priority: 9,
    },
    messaging: {
      name: 'Messaging',
      description: 'Direct messaging between users',
      dependencies: ['authentication'],
      estimatedFiles: 7,
      complexity: 'high',
      databaseTables: ['messages', 'conversations'],
      priority: 10,
    },
    payments: {
      name: 'Payments',
      description: 'Payment processing and billing',
      dependencies: ['authentication'],
      estimatedFiles: 8,
      complexity: 'high',
      requiredAPIs: ['Stripe'],
      databaseTables: ['payments', 'subscriptions'],
      priority: 11,
    },
    analytics: {
      name: 'Analytics',
      description: 'Usage tracking and insights',
      dependencies: ['database'],
      estimatedFiles: 5,
      complexity: 'medium',
      databaseTables: ['analytics_events'],
      priority: 12,
    },
  };

  /**
   * Main orchestration method - breaks complex requests into phased features
   */
  async orchestrateFeatures(
    request: string,
    detailedPlan: any
  ): Promise<OrchestrationPlan> {
    const features = await this.detectFeatures(request, detailedPlan);
    const graph = this.buildDependencyGraph(features);
    const sortedFeatures = this.topologicalSort(graph);
    const phases = this.groupIntoPhases(sortedFeatures);
    
    // 🆕 Detect required external resources using universal guide
    const featureIds = features.map(f => f.id);
    const requiredResources = detectRequiredResources(request, featureIds);
    
    return this.buildOrchestrationPlan(phases, features, requiredResources);
  }

  /**
   * Detects individual features from user request using AI analysis
   */
  private async detectFeatures(
    request: string,
    detailedPlan: any
  ): Promise<Feature[]> {
    const features: Feature[] = [];
    
    // Core features detection patterns
    const featurePatterns = {
      authentication: /auth|login|signup|sign up|register|password/i,
      userProfiles: /profile|user.*info|account|avatar/i,
      videoUpload: /video.*upload|upload.*video|post.*video/i,
      videoProcessing: /transcode|encode|compress|video.*process/i,
      feed: /feed|timeline|for you|discover/i,
      comments: /comment|reply|thread/i,
      likes: /like|heart|favorite|upvote/i,
      search: /search|find|discover|explore/i,
      notifications: /notif|alert|push/i,
      messaging: /chat|message|dm|direct message/i,
      payments: /payment|checkout|stripe|billing/i,
      analytics: /analytic|track|metric|insight/i,
    };

    // Detect features from request
    Object.entries(featurePatterns).forEach(([featureName, pattern]) => {
      if (pattern.test(request)) {
        features.push(this.createFeature(featureName, request));
      }
    });

    // Add implicit features (e.g., database always needed)
    if (features.length > 0) {
      features.unshift(this.createFeature('database', request));
      
      // Auto-add authentication if any feature requires it
      const needsAuth = features.some(f => {
        const featureName = f.id || f.name.toLowerCase().replace(/\s+/g, '');
        const config = this.featureConfigs[featureName];
        return config?.dependencies?.includes('authentication');
      });
      
      if (needsAuth && !features.some(f => f.id === 'authentication')) {
        features.splice(1, 0, this.createFeature('authentication', request));
      }
    }

    return features;
  }

  /**
   * Creates a feature object with metadata
   */
  private createFeature(featureName: string, request: string): Feature {
    const config = this.featureConfigs[featureName] || {
      name: featureName,
      description: `${featureName} functionality`,
      dependencies: [],
      estimatedFiles: 3,
      complexity: 'medium',
      priority: 99,
    };

    return {
      id: featureName,
      name: config.name || featureName,
      description: config.description || '',
      dependencies: config.dependencies || [],
      estimatedFiles: config.estimatedFiles || 3,
      complexity: config.complexity || 'medium',
      requiredAPIs: config.requiredAPIs,
      databaseTables: config.databaseTables,
      priority: config.priority || 99,
    };
  }

  /**
   * Builds dependency graph for features
   */
  private buildDependencyGraph(features: Feature[]): Map<string, Feature> {
    const graph = new Map<string, Feature>();
    features.forEach(feature => graph.set(feature.id, feature));
    return graph;
  }

  /**
   * Topological sort to order features by dependencies
   * Only validates dependencies that exist in current feature set
   */
  private topologicalSort(graph: Map<string, Feature>): Feature[] {
    const sorted: Feature[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const availableFeatures = new Set(graph.keys());

    const visit = (featureId: string) => {
      if (visited.has(featureId)) return;
      if (visiting.has(featureId)) {
        throw new Error(`Circular dependency detected: ${featureId}`);
      }

      visiting.add(featureId);
      const feature = graph.get(featureId);
      
      if (feature) {
        // Only process dependencies that exist in current feature set
        const validDependencies = feature.dependencies.filter(depId => 
          availableFeatures.has(depId)
        );
        
        validDependencies.forEach(depId => {
          if (graph.has(depId)) {
            visit(depId);
          }
        });
        visiting.delete(featureId);
        visited.add(featureId);
        sorted.push(feature);
      }
    };

    Array.from(graph.keys()).forEach(visit);
    return sorted;
  }

  /**
   * Groups features into phases (max 20 files per phase)
   */
  private groupIntoPhases(sortedFeatures: Feature[]): Phase[] {
    const phases: Phase[] = [];
    let currentPhase: Feature[] = [];
    let currentFileCount = 0;
    const MAX_FILES_PER_PHASE = 20;

    sortedFeatures.forEach(feature => {
      if (currentFileCount + feature.estimatedFiles > MAX_FILES_PER_PHASE && currentPhase.length > 0) {
        phases.push(this.createPhase(phases.length + 1, currentPhase, currentFileCount));
        currentPhase = [];
        currentFileCount = 0;
      }
      
      currentPhase.push(feature);
      currentFileCount += feature.estimatedFiles;
    });

    if (currentPhase.length > 0) {
      phases.push(this.createPhase(phases.length + 1, currentPhase, currentFileCount));
    }

    return phases;
  }

  /**
   * Creates a phase object
   */
  private createPhase(phaseNumber: number, features: Feature[], filesCount: number): Phase {
    return {
      phaseNumber,
      features,
      filesCount,
      estimatedDuration: this.estimateDuration(filesCount),
      readyToStart: phaseNumber === 1,
    };
  }

  /**
   * Estimates duration based on file count
   */
  private estimateDuration(fileCount: number): string {
    if (fileCount <= 5) return '10-15 minutes';
    if (fileCount <= 10) return '15-25 minutes';
    if (fileCount <= 20) return '25-40 minutes';
    return '40-60 minutes';
  }

  /**
   * Builds final orchestration plan with external resource guidance
   */
  private buildOrchestrationPlan(
    phases: Phase[], 
    features: Feature[],
    requiredResources: ExternalResource[] = []
  ): OrchestrationPlan {
    const externalAPIs = [...new Set(
      features.flatMap(f => f.requiredAPIs || [])
    )];

    const databaseTables = [...new Set(
      features.flatMap(f => f.databaseTables || [])
    )];

    const totalFiles = phases.reduce((sum, p) => sum + p.filesCount, 0);

    return {
      phases,
      totalFeatures: features.length,
      totalFiles,
      estimatedTimeline: this.calculateTimeline(phases),
      externalAPIs,
      databaseSchema: {
        totalTables: databaseTables.length,
        tables: databaseTables,
      },
      requiredExternalResources: requiredResources, // 🆕 Include resource guidance
    };
  }

  /**
   * Calculates overall timeline
   */
  private calculateTimeline(phases: Phase[]): string {
    const totalMinutes = phases.reduce((sum, phase) => {
      const minutes = parseInt(phase.estimatedDuration.split('-')[1] || '30');
      return sum + minutes;
    }, 0);

    if (totalMinutes < 60) return `${totalMinutes} minutes`;
    const hours = Math.ceil(totalMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}
