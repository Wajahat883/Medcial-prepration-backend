// @ts-ignore - node-cron module installed but types may not be available
import cron from 'node-cron';
import { AnalyticsAggregationService } from '../services/analytics-aggregation.service';

/**
 * Analytics Aggregation Job
 * Runs periodically to cache metrics for performance optimization
 * 
 * Schedule: Every hour at minute 0
 * Bulk aggregation: Daily at 2 AM UTC
 */
export class AnalyticsAggregatorJob {
  static isRunning = false;

  /**
   * Start the aggregation job
   */
  static start(): void {
    if (this.isRunning) {
      console.log('[AnalyticsAggregator] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[AnalyticsAggregator] Job started');

    // Run aggregation every hour
    cron.schedule('0 * * * *', async () => {
      console.log('[AnalyticsAggregator] Hourly execution started');
      try {
        // In production, this would fetch users from cache/queue
        // For now, bulk aggregation handles this daily
        console.log('[AnalyticsAggregator] Hourly execution completed');
      } catch (error) {
        console.error('[AnalyticsAggregator] Hourly execution failed:', error);
      }
    });

    // Run bulk aggregation daily at 2 AM UTC
    cron.schedule('0 2 * * *', async () => {
      console.log('[AnalyticsAggregator] Daily bulk aggregation started');
      try {
        const result = await AnalyticsAggregationService.runBulkAggregation();
        console.log(`[AnalyticsAggregator] Daily bulk aggregation completed: ${result.processed} processed, ${result.failed} failed`);
      } catch (error) {
        console.error('[AnalyticsAggregator] Daily bulk aggregation failed:', error);
      }
    });

    // Run weekly deep aggregation every Sunday at 3 AM UTC
    cron.schedule('0 3 * * 0', async () => {
      console.log('[AnalyticsAggregator] Weekly deep aggregation started');
      try {
        const result = await AnalyticsAggregationService.runBulkAggregation();
        console.log(`[AnalyticsAggregator] Weekly aggregation completed: ${result.processed} processed, ${result.failed} failed`);
      } catch (error) {
        console.error('[AnalyticsAggregator] Weekly aggregation failed:', error);
      }
    });
  }

  /**
   * Stop the aggregation job
   */
  static stop(): void {
    this.isRunning = false;
    cron.getTasks().forEach((task) => task.stop());
    console.log('[AnalyticsAggregator] Job stopped');
  }

  /**
   * Check if job is running
   */
  static getStatus(): {
    isRunning: boolean;
    nextRuns: { hourly: string; daily: string; weekly: string };
  } {
    return {
      isRunning: this.isRunning,
      nextRuns: {
        hourly: 'Every hour at minute 0',
        daily: 'Daily at 2 AM UTC',
        weekly: 'Every Sunday at 3 AM UTC',
      },
    };
  }
}
