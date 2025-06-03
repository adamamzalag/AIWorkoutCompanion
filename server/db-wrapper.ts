import { db, pool } from './db';
import { SQL } from 'drizzle-orm';

/**
 * Database operation wrapper with automatic retry and error recovery
 * Handles Neon connection termination and provides resilient database access
 */
export class DatabaseWrapper {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isConnectionError(error: any): boolean {
    if (!error) return false;
    
    const connectionErrors = [
      'terminating connection due to administrator command',
      'Connection terminated',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'connection is closed',
      'Connection lost',
      '57P01', // Neon connection termination error code
      '08006', // Connection failure error code
      '08000', // Connection exception error code
    ];

    const errorMessage = error.message || error.toString();
    const errorCode = error.code;

    return connectionErrors.some(errorPattern => 
      errorMessage.includes(errorPattern) || errorCode === errorPattern
    );
  }

  /**
   * Execute a database operation with automatic retry on connection errors
   */
  async execute<T>(operation: () => Promise<T>, operationName?: string): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        if (this.isConnectionError(error)) {
          console.warn(`Database connection error on attempt ${attempt}/${this.maxRetries} for ${operationName || 'operation'}:`, error.message);
          
          if (attempt < this.maxRetries) {
            await this.delay(this.retryDelay * attempt); // Exponential backoff
            continue;
          }
        }
        
        // If it's not a connection error or we've exceeded retries, throw immediately
        throw error;
      }
    }
    
    throw lastError;
  }

  /**
   * Execute a query with automatic retry
   */
  async query<T>(query: any): Promise<T> {
    return this.execute(
      () => db.execute(query) as Promise<T>,
      `query operation`
    );
  }

  /**
   * Get a healthy database connection, with retry if needed
   */
  async getHealthyConnection() {
    return this.execute(async () => {
      const client = await pool.connect();
      
      // Test the connection
      try {
        await client.query('SELECT 1');
        return client;
      } catch (error) {
        client.release();
        throw error;
      }
    }, 'get connection');
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      await this.execute(async () => {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT 1 as health_check');
          return result;
        } finally {
          client.release();
        }
      }, 'health check');
      
      return { healthy: true };
    } catch (error: any) {
      return { 
        healthy: false, 
        error: error.message || 'Unknown database error' 
      };
    }
  }
}

export const dbWrapper = new DatabaseWrapper();

/**
 * Wrapper function for Drizzle operations with automatic retry
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<T> {
  return dbWrapper.execute(operation, operationName);
}