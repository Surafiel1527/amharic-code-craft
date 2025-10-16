/**
 * Enterprise Circuit Breaker Pattern
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  monitoringWindow: number;
  volumeThreshold: number;
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  stateChangedAt: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

interface RequestRecord {
  timestamp: number;
  success: boolean;
}

export class CircuitBreaker {
  private serviceName: string;
  private state: CircuitState = 'CLOSED';
  private config: CircuitBreakerConfig;
  private stats: CircuitStats;
  private requestHistory: RequestRecord[] = [];
  private logger: any;

  constructor(serviceName: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.serviceName = serviceName;
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000,
      monitoringWindow: config.monitoringWindow ?? 120000,
      volumeThreshold: config.volumeThreshold ?? 10
    };
    
    this.stats = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      totalRequests: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      stateChangedAt: Date.now()
    };

    this.logger = { info: console.log, warn: console.warn, error: console.error };
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        if (fallback) return fallback();
        throw new Error(`Circuit breaker OPEN for ${this.serviceName}`);
      }
    }

    this.stats.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback && this.state === 'OPEN') return fallback();
      throw error;
    }
  }

  private onSuccess(): void {
    this.stats.successes++;
    this.stats.consecutiveSuccesses++;
    this.stats.consecutiveFailures = 0;
    
    if (this.state === 'HALF_OPEN' && this.stats.consecutiveSuccesses >= this.config.successThreshold) {
      this.transitionTo('CLOSED');
    }
  }

  private onFailure(): void {
    this.stats.failures++;
    this.stats.consecutiveFailures++;
    this.stats.consecutiveSuccesses = 0;

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED' && this.stats.consecutiveFailures >= this.config.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;
    this.logger.warn(`[Circuit ${this.serviceName}] ${this.state} → ${newState}`);
    this.state = newState;
    this.stats.state = newState;
    this.stats.stateChangedAt = Date.now();
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.stats.stateChangedAt >= this.config.timeout;
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitStats {
    return { ...this.stats };
  }
}

export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, config));
    }
    return this.breakers.get(serviceName)!;
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
