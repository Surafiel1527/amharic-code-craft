import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  timeout: 3000, // 3 seconds
  resetTimeout: 30000 // Try again after 30 seconds
};

export class CircuitBreaker {
  private serviceName: string;
  private config: CircuitBreakerConfig;
  private supabaseClient: any;

  constructor(
    serviceName: string,
    supabaseUrl: string,
    supabaseKey: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.serviceName = serviceName;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check current state
    const state = await this.getState();

    if (state === 'open') {
      // Check if we should try half-open
      const { data } = await this.supabaseClient
        .from('circuit_breaker_state')
        .select('next_retry_at')
        .eq('service_name', this.serviceName)
        .single();

      if (data && new Date(data.next_retry_at) > new Date()) {
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}. Service unavailable.`);
      }

      // Move to half-open state
      await this.updateState('half_open');
    }

    try {
      // Execute operation with timeout
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
        )
      ]);

      // Success - update circuit breaker
      await this.recordSuccess();
      return result;
    } catch (error) {
      // Failure - update circuit breaker
      await this.recordFailure(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async getState(): Promise<'closed' | 'open' | 'half_open'> {
    try {
      const { data } = await this.supabaseClient
        .from('circuit_breaker_state')
        .select('state')
        .eq('service_name', this.serviceName)
        .maybeSingle();

      return data?.state || 'closed';
    } catch (error) {
      console.error('Failed to get circuit breaker state:', error);
      return 'closed'; // Default to closed on error
    }
  }

  private async updateState(newState: 'closed' | 'open' | 'half_open') {
    try {
      await this.supabaseClient
        .from('circuit_breaker_state')
        .upsert({
          service_name: this.serviceName,
          state: newState,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'service_name'
        });
    } catch (error) {
      console.error('Failed to update circuit breaker state:', error);
    }
  }

  private async recordSuccess() {
    try {
      // Call database function to handle state update
      await this.supabaseClient.rpc('update_circuit_breaker', {
        p_service_name: this.serviceName,
        p_success: true
      });
    } catch (error) {
      console.error('Failed to record success:', error);
    }
  }

  private async recordFailure(errorMessage: string) {
    try {
      // Call database function to handle state update
      const { data } = await this.supabaseClient.rpc('update_circuit_breaker', {
        p_service_name: this.serviceName,
        p_success: false,
        p_error_message: errorMessage
      });

      // If circuit opened, send alert
      if (data === 'open') {
        await this.sendAlert();
      }
    } catch (error) {
      console.error('Failed to record failure:', error);
    }
  }

  private async sendAlert() {
    try {
      await this.supabaseClient.rpc('send_alert', {
        p_alert_type: 'circuit_breaker_open',
        p_severity: 'critical',
        p_title: `Circuit Breaker Opened: ${this.serviceName}`,
        p_message: `Circuit breaker for ${this.serviceName} has opened due to repeated failures. Service is temporarily unavailable.`,
        p_metadata: {
          service_name: this.serviceName,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  // Static method to wrap any function with circuit breaker
  static async wrap<T>(
    serviceName: string,
    supabaseUrl: string,
    supabaseKey: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const breaker = new CircuitBreaker(serviceName, supabaseUrl, supabaseKey, config);
    return breaker.execute(operation);
  }
}
