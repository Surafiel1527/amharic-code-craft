/**
 * Framework Builder Factory - Enterprise pattern implementation
 * 
 * Creates the appropriate framework builder based on the selected framework.
 * Centralizes builder instantiation and ensures type safety.
 */

import { IFrameworkBuilder } from './IFrameworkBuilder.ts';
import { HtmlBuilder } from './HtmlBuilder.ts';
import { ReactBuilder } from './ReactBuilder.ts';

export class FrameworkBuilderFactory {
  private static builders: Map<string, () => IFrameworkBuilder> = new Map<string, () => IFrameworkBuilder>([
    ['html', (): IFrameworkBuilder => new HtmlBuilder()],
    ['react', (): IFrameworkBuilder => new ReactBuilder()],
    // Future: ['vue', (): IFrameworkBuilder => new VueBuilder()],
  ]);

  /**
   * Create a framework builder for the specified framework
   */
  static createBuilder(framework: string): IFrameworkBuilder {
    const builderFactory = this.builders.get(framework.toLowerCase());
    
    if (!builderFactory) {
      // Default to React if framework not recognized
      console.warn(`⚠️ Unknown framework: ${framework}, defaulting to React`);
      return new ReactBuilder();
    }

    const builder = builderFactory();
    console.log(`✅ Created ${framework} builder: ${builder.getFrameworkName()}`);
    
    return builder;
  }

  /**
   * Get list of supported frameworks
   */
  static getSupportedFrameworks(): string[] {
    return Array.from(this.builders.keys());
  }

  /**
   * Check if a framework is supported
   */
  static isSupported(framework: string): boolean {
    return this.builders.has(framework.toLowerCase());
  }

  /**
   * Register a new framework builder (for extensibility)
   */
  static registerBuilder(framework: string, builderFactory: () => IFrameworkBuilder): void {
    this.builders.set(framework.toLowerCase(), builderFactory);
    console.log(`✅ Registered new framework builder: ${framework}`);
  }
}
