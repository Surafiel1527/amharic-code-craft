/**
 * Feature Dependency Graph - Analyzes and validates feature dependencies
 * 
 * Ensures features are built in correct order and validates dependency chains.
 */

import { Feature } from './featureOrchestrator.ts';

export interface DependencyNode {
  feature: Feature;
  dependencies: DependencyNode[];
  dependents: DependencyNode[];
  depth: number;
}

export interface DependencyAnalysis {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalPath: Feature[];
  maxDepth: number;
}

export class FeatureDependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();

  /**
   * Builds dependency graph from features
   */
  buildGraph(features: Feature[]): void {
    // Create nodes
    features.forEach(feature => {
      this.nodes.set(feature.id, {
        feature,
        dependencies: [],
        dependents: [],
        depth: 0,
      });
    });

    // Link dependencies
    features.forEach(feature => {
      const node = this.nodes.get(feature.id)!;
      
      feature.dependencies.forEach(depId => {
        const depNode = this.nodes.get(depId);
        if (depNode) {
          node.dependencies.push(depNode);
          depNode.dependents.push(node);
        }
      });
    });

    // Calculate depths
    this.calculateDepths();
  }

  /**
   * Calculates depth of each node (distance from root)
   */
  private calculateDepths(): void {
    const visited = new Set<string>();
    
    const calculateDepth = (nodeId: string, currentDepth: number): number => {
      if (visited.has(nodeId)) {
        const node = this.nodes.get(nodeId)!;
        return Math.max(node.depth, currentDepth);
      }

      visited.add(nodeId);
      const node = this.nodes.get(nodeId)!;
      let maxDepth = currentDepth;

      node.dependencies.forEach(depNode => {
        const depth = calculateDepth(depNode.feature.id, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      });

      node.depth = maxDepth;
      return maxDepth;
    };

    this.nodes.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        calculateDepth(nodeId, 0);
      }
    });
  }

  /**
   * Analyzes dependency graph for issues
   */
  analyzeDependencies(): DependencyAnalysis {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies();
    if (circularDeps.length > 0) {
      errors.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
    }

    // Check for missing dependencies
    this.nodes.forEach(node => {
      node.feature.dependencies.forEach(depId => {
        if (!this.nodes.has(depId)) {
          errors.push(`Feature "${node.feature.name}" depends on missing feature "${depId}"`);
        }
      });
    });

    // Check for orphaned high-complexity features
    this.nodes.forEach(node => {
      if (node.feature.complexity === 'high' && node.dependencies.length === 0 && node.dependents.length === 0) {
        warnings.push(`High-complexity feature "${node.feature.name}" has no dependencies or dependents`);
      }
    });

    const criticalPath = this.findCriticalPath();
    const maxDepth = Math.max(...Array.from(this.nodes.values()).map(n => n.depth));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      criticalPath,
      maxDepth,
    };
  }

  /**
   * Detects circular dependencies using DFS
   */
  private detectCircularDependencies(): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycle: string[] = [];

    const dfs = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        cycle.push(...path.slice(cycleStart), nodeId);
        return true;
      }

      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);
      const node = this.nodes.get(nodeId)!;

      for (const depNode of node.dependencies) {
        if (dfs(depNode.feature.id, [...path, nodeId])) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId, [])) {
          break;
        }
      }
    }

    return cycle;
  }

  /**
   * Finds critical path (longest dependency chain)
   */
  private findCriticalPath(): Feature[] {
    let longestPath: Feature[] = [];
    let maxLength = 0;

    const findPath = (nodeId: string, currentPath: Feature[]): void => {
      const node = this.nodes.get(nodeId)!;
      const path = [...currentPath, node.feature];

      if (node.dependencies.length === 0) {
        if (path.length > maxLength) {
          maxLength = path.length;
          longestPath = path;
        }
      } else {
        node.dependencies.forEach(depNode => {
          findPath(depNode.feature.id, path);
        });
      }
    };

    // Start from nodes with no dependents (leaves)
    this.nodes.forEach((node, nodeId) => {
      if (node.dependents.length === 0) {
        findPath(nodeId, []);
      }
    });

    return longestPath.reverse();
  }

  /**
   * Gets features ready to build (no pending dependencies)
   */
  getReadyFeatures(completedFeatureIds: Set<string>): Feature[] {
    const ready: Feature[] = [];

    this.nodes.forEach(node => {
      if (completedFeatureIds.has(node.feature.id)) return;

      const allDepsCompleted = node.dependencies.every(depNode =>
        completedFeatureIds.has(depNode.feature.id)
      );

      if (allDepsCompleted) {
        ready.push(node.feature);
      }
    });

    return ready.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Exports graph as DOT format for visualization
   */
  exportAsDot(): string {
    let dot = 'digraph FeatureDependencies {\n';
    dot += '  rankdir=TB;\n';
    dot += '  node [shape=box, style=rounded];\n\n';

    this.nodes.forEach(node => {
      const color = node.feature.complexity === 'high' ? 'red' : 
                    node.feature.complexity === 'medium' ? 'orange' : 'green';
      dot += `  "${node.feature.id}" [label="${node.feature.name}\\n(${node.feature.estimatedFiles} files)", color=${color}];\n`;

      node.dependencies.forEach(depNode => {
        dot += `  "${node.feature.id}" -> "${depNode.feature.id}";\n`;
      });
    });

    dot += '}';
    return dot;
  }
}
