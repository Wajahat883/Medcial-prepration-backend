import { Types } from 'mongoose';
import { UserUXPreferences, UserWellness, ConversionEvent } from '../models/Phase4Models';

/**
 * Phase 4: UX Optimization Service
 * Manages cognitive load settings and UX preferences
 */
export class UXOptimizationService {
  /**
   * Get or create user UX preferences
   */
  static async getUserPreferences(userId: string) {
    let prefs = await UserUXPreferences.findOne({ userId: new Types.ObjectId(userId) });
    if (!prefs) {
      prefs = await UserUXPreferences.create({
        userId: new Types.ObjectId(userId),
      });
    }
    return prefs;
  }

  /**
   * Update user UX preferences
   */
  static async updatePreferences(userId: string, updates: Partial<any>) {
    return UserUXPreferences.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      updates,
      { new: true, upsert: true }
    );
  }

  /**
   * Highlight vital signs and lab values in question stem
   * Detects abnormal values and color-codes them
   */
  static highlightVisualsAndLabs(stemText: string): string {
    const abnormalPatterns: Record<string, { min?: number; max?: number; unit: string }> = {
      // Vital signs
      'HR|heart rate|pulse': { min: 60, max: 100, unit: 'bpm' },
      'BP|blood pressure': { min: 90, max: 140, unit: 'mmHg' },
      'RR|respiratory rate': { min: 12, max: 20, unit: 'breaths/min' },
      Temperature: { min: 36.5, max: 37.5, unit: '°C' },
      'O2|oxygen': { min: 95, max: 100, unit: '%' },

      // Lab values
      'Na|sodium': { min: 135, max: 145, unit: 'mEq/L' },
      'K|potassium': { min: 3.5, max: 5.0, unit: 'mEq/L' },
      'Cl|chloride': { min: 98, max: 107, unit: 'mEq/L' },
      'HCO3|bicarbonate': { min: 22, max: 26, unit: 'mEq/L' },
      'Glucose|blood sugar': { min: 70, max: 100, unit: 'mg/dL' },
      'Hgb|hemoglobin': { min: 13.5, max: 17.5, unit: 'g/dL' },
      'WBC|white blood': { min: 4.5, max: 11.0, unit: '×10³/μL' },
      'Creatinine|Cr': { min: 0.7, max: 1.3, unit: 'mg/dL' },
      'BUN|urea': { min: 7, max: 20, unit: 'mg/dL' },
    };

    let highlighted = stemText;

    // Find and highlight abnormal values
    const numberRegex = /(\d+\.?\d*)\s*(bpm|mmHg|mEq\/L|%|°C|g\/dL|×10³|mg\/dL|breaths\/min)/gi;
    highlighted = highlighted.replace(numberRegex, (match, value, unit) => {
      const numValue = parseFloat(value);
      // Simple logic: if value seems abnormal, highlight red
      if (
        (numValue > 100 && unit.includes('bpm')) ||
        (numValue > 150 && unit.includes('mmHg')) ||
        (numValue < 50 && unit.includes('mmHg')) ||
        (numValue > 7.5 && unit.includes('pH')) ||
        numValue > 200 ||
        numValue < 50
      ) {
        return `<span style="background-color: #ffcccc; color: #cc0000; font-weight: bold;">${match}</span>`;
      }
      return `<span style="background-color: #ccffcc; color: #00cc00; font-weight: bold;">${match}</span>`;
    });

    return highlighted;
  }

  /**
   * Auto-collapse long clinical stems
   * Return abstract with toggle option
   */
  static createCollapsibleStem(stemText: string): { abstract: string; fullText: string } {
    const maxAbstractLength = 150;
    const abstract =
      stemText.length > maxAbstractLength ? `${stemText.substring(0, maxAbstractLength)}...` : stemText;

    return {
      abstract,
      fullText: stemText,
    };
  }

  /**
   * Apply noise reduction - remove UI clutter
   */
  static getNoiseReducedLayout() {
    return {
      showSidebar: false,
      showProgressBar: false,
      showAnalytics: false,
      showTimer: true,
      showQuestion: true,
      showAnswers: true,
      fullscreenMode: true,
    };
  }
}

/**
 * Phase 4: Monetization Service
 * Handles predictive messaging and upsell logic
 */
export class MonetizationService {
  /**
   * Calculate predictive impact and generate messaging
   * Shows: "If you improve to 70%: Pass Probability: 73% (+15 weeks saved)"
   */
  static calculatePredictiveImpact(
    currentAccuracy: number,
    targetAccuracy: number,
    subjectName: string,
    daysUntilExam: number
  ): {
    currentPassProbability: number;
    projectedPassProbability: number;
    timesSaved: number;
    message: string;
  } {
    // Simplified IRT-based probability calculation
    const currentProb = Math.min(100, (currentAccuracy / 100) * 100) || 0;
    const projectedProb = Math.min(100, (targetAccuracy / 100) * 100) || 0;

    // Estimate time savings based on improvement
    const improvementGap = targetAccuracy - currentAccuracy;
    const estimatedWeeksNeeded = Math.max(1, Math.ceil((improvementGap / 100) * daysUntilExam / 7));

    return {
      currentPassProbability: currentProb,
      projectedPassProbability: projectedProb,
      timesSaved: estimatedWeeksNeeded,
      message: `Currently: ${subjectName} ${currentAccuracy.toFixed(0)}% accuracy, Pass Probability: ${currentProb.toFixed(0)}%.\nIf you improve to ${targetAccuracy.toFixed(0)}%: Pass Probability: ${projectedProb.toFixed(0)}% (+${estimatedWeeksNeeded} weeks saved)`,
    };
  }

  /**
   * Get feature teaser for free users
   * Show locked premium features with preview
   */
  static getFeatureTeaser(featureName: string): {
    featureName: string;
    preview: string;
    locked: boolean;
    upgradePrompt: string;
  } {
    const teasers: Record<string, string> = {
      readiness_score: 'Your Readiness Score is calculated using IRT-weighted accuracy...',
      cognitive_analysis: 'Your error patterns show you struggle with data interpretation...',
      revision_mode: 'Smart revision buckets prioritize high-impact topics...',
      exam_readiness: 'Based on your performance, you need 3 more weeks of focused prep...',
    };

    return {
      featureName,
      preview: teasers[featureName] || 'Advanced analytics available with premium',
      locked: true,
      upgradePrompt: `Upgrade to Premium to unlock ${featureName}`,
    };
  }

  /**
   * Track conversion event
   */
  static async trackConversionEvent(
    userId: string,
    eventType:
      | 'feature_teaser_shown'
      | 'premium_feature_viewed'
      | 'upsell_clicked'
      | 'subscription_attempted'
      | 'subscription_completed',
    featureName: string,
    impactData?: { currentAccuracy: number; projectedAccuracy: number; timesSaved: number },
    upsellVariant?: string
  ) {
    return ConversionEvent.create({
      userId: new Types.ObjectId(userId),
      eventType,
      featureName,
      impactShown: impactData,
      upsellVariant,
    });
  }

  /**
   * Get A/B test variants for upsell messaging
   */
  static getUpsellVariants(): string[] {
    return [
      'impact-focused', // "Pass Probability: 73% (+15 weeks saved)"
      'urgency-focused', // "Only 3 weeks until exam, unlock cognitive analysis now"
      'value-focused', // "Premium users improve 23% faster"
      'social-proof', // "5000+ doctors already benefiting from premium"
    ];
  }

  /**
   * Get conversion metrics for dashboard
   */
  static async getConversionMetrics(daysBack: number = 30) {
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const eventCounts = await ConversionEvent.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalShown = eventCounts.find((e) => e._id === 'feature_teaser_shown')?.count || 0;
    const totalClicked = eventCounts.find((e) => e._id === 'upsell_clicked')?.count || 0;
    const totalConverted = eventCounts.find((e) => e._id === 'subscription_completed')?.count || 0;

    return {
      totalTeasersShown: totalShown,
      totalUpsellClicks: totalClicked,
      totalConversions: totalConverted,
      ctcRate: totalShown > 0 ? ((totalClicked / totalShown) * 100).toFixed(2) : 0,
      conversionRate: totalClicked > 0 ? ((totalConverted / totalClicked) * 100).toFixed(2) : 0,
    };
  }
}

export default { UXOptimizationService, MonetizationService };