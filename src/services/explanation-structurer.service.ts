import mongoose from 'mongoose';
import { Question } from '../models/Question';
import { ExplanationMetadata } from '../models/ExplanationMetadata';

export interface ExplanationSection {
  presentation?: {
    content: string;
    bulletPoints?: string[];
  };
  differential?: {
    items: Array<{ condition: string; probability: 'high' | 'medium' | 'low' }>;
  };
  discriminators?: {
    keyFeatures: string[];
    findings: Array<{ feature: string; implication: string }>;
  };
  investigation?: {
    required: string[];
    niceToHave?: string[];
  };
  diagnosis?: {
    conclusion: string;
    reasoning: string;
  };
  management?: {
    steps: Array<{ step: number; action: string; rationale: string }>;
  };
}

export interface VisualAid {
  flowchartData?: any; // Node-link JSON format
  algorithmComparisons?: Array<{ condition: string; comparison: string }>;
  decisionTrees?: boolean;
}

/**
 * Explanation Structurer Service
 * Manages structured clinical reasoning explanations with decision trees
 */
export class ExplanationStructurer {
  /**
   * Parse and structure unstructured explanation text
   */
  static async structureExplanation(
    questionId: string,
    rawExplanation: string
  ): Promise<ExplanationSection> {
    try {
      // AI-based parsing (simplified rule-based for now)
      const sections: ExplanationSection = {};

      // Extract presentation (usually first paragraph)
      const presentationMatch = rawExplanation.match(/^([^\n]+\.(?:\s+[^\n]+\.)?)/);
      if (presentationMatch) {
        sections.presentation = {
          content: presentationMatch[1],
          bulletPoints: this.extractBulletPoints(rawExplanation),
        };
      }

      // Extract differential diagnosis
      const diffMatch = rawExplanation.match(/(?:differential|ddx).*?:?\s*(.+?)(?=\n\n|\n(?:investigation|management|diagnosis))/is);
      if (diffMatch) {
        sections.differential = {
          items: this.parseDifferential(diffMatch[1]),
        };
      }

      // Extract investigation
      const invMatch = rawExplanation.match(/(?:investigation|investigations).*?:?\s*(.+?)(?=\n\n|\n(?:diagnosis|management))/is);
      if (invMatch) {
        sections.investigation = {
          required: this.parseInvestigations(invMatch[1]),
        };
      }

      // Extract diagnosis
      const diagMatch = rawExplanation.match(/(?:diagnosis|answer).*?:?\s*(.+?)(?=\n\n|\n(?:management))/is);
      if (diagMatch) {
        sections.diagnosis = {
          conclusion: diagMatch[1].split('\n')[0],
          reasoning: diagMatch[1],
        };
      }

      // Extract management
      const mgmtMatch = rawExplanation.match(/(?:management|treatment).*?:?\s*(.+?)$/is);
      if (mgmtMatch) {
        sections.management = {
          steps: this.parseManagement(mgmtMatch[1]),
        };
      }

      return sections;
    } catch (error) {
      console.error('[ExplanationStructurer] Error structuring explanation:', error);
      return {
        diagnosis: {
          conclusion: 'Explanation parsing failed',
          reasoning: rawExplanation,
        },
      };
    }
  }

  /**
   * Extract bullet points from text
   */
  private static extractBulletPoints(text: string): string[] {
    const bulletMatch = text.match(/[-•*]\s+(.+?)(?=\n[-•*]|\n\n|$)/gm);
    return (bulletMatch || [])
      .map((b) => b.replace(/^[-•*]\s+/, '').trim())
      .filter((b) => b.length > 0);
  }

  /**
   * Parse differential diagnosis section
   */
  private static parseDifferential(
    text: string
  ): Array<{ condition: string; probability: 'high' | 'medium' | 'low' }> {
    const lines = text.split('\n').filter((l) => l.trim());

    return lines
      .map((line) => {
        const probability: 'high' | 'medium' | 'low' =
          line.toLowerCase().includes('likely') || line.toLowerCase().includes('probable')
            ? 'high'
            : line.toLowerCase().includes('possible')
            ? 'medium'
            : 'low';

        return {
          condition: line.replace(/^[-•*]\s+/, '').replace(/likely|probable|possible/gi, '').trim(),
          probability,
        };
      })
      .filter((item) => item.condition.length > 0);
  }

  /**
   * Parse investigations section
   */
  private static parseInvestigations(text: string): string[] {
    const lines = text.split('\n').filter((l) => l.trim());

    return lines
      .map((line) => line.replace(/^[-•*]\s+/, '').trim())
      .filter((line) => line.length > 0 && !line.toLowerCase().includes('optional'));
  }

  /**
   * Parse management/treatment section into steps
   */
  private static parseManagement(text: string): Array<{ step: number; action: string; rationale: string }> {
    const lines = text.split('\n').filter((l) => l.trim());
    let stepCounter = 1;

    return lines
      .map((line) => {
        const cleaned = line.replace(/^[-•*\d.]\s+/, '').trim();

        if (cleaned.length === 0) return null;

        // Try to extract rationale if present (often separated by colon or dash)
        const parts = cleaned.split(/:\s+|-\s+/);
        const action = parts[0];
        const rationale = parts[1] || '';

        return {
          step: stepCounter++,
          action,
          rationale,
        };
      })
      .filter((item) => item !== null) as Array<{ step: number; action: string; rationale: string }>;
  }

  /**
   * Save structured explanation to database
   */
  static async saveStructuredExplanation(
    questionId: string,
    sections: ExplanationSection,
    visualAids?: VisualAid
  ): Promise<void> {
    try {
      await ExplanationMetadata.findOneAndUpdate(
        { questionId: new mongoose.Types.ObjectId(questionId) },
        {
          questionId: new mongoose.Types.ObjectId(questionId),
          sections,
          visualAids: visualAids || {},
          updatedAt: new Date(),
        },
        { upsert: true }
      );

      console.log(`[ExplanationStructurer] Saved structured explanation for question ${questionId}`);
    } catch (error) {
      console.error('[ExplanationStructurer] Error saving explanation:', error);
    }
  }

  /**
   * Get structured explanation for question
   */
  static async getStructuredExplanation(
    questionId: string
  ): Promise<{ sections: ExplanationSection; visualAids: VisualAid } | null> {
    try {
      const metadata = await ExplanationMetadata.findOne({
        questionId: new mongoose.Types.ObjectId(questionId),
      }).lean();

      if (!metadata) {
        // If not found, try to structure from question explanation
        const question = await Question.findById(questionId).lean();
        if (question && question.explanation) {
          const sections = await this.structureExplanation(questionId, question.explanation);
          return { sections, visualAids: {} };
        }
        return null;
      }

      return {
        sections: metadata.structure as ExplanationSection,
        visualAids: (metadata.visualAids || {}) as VisualAid,
      };
    } catch (error) {
      console.error('[ExplanationStructurer] Error getting explanation:', error);
      return null;
    }
  }

  /**
   * Generate examiner-style feedback for a question
   */
  static generateExaminerFeedback(
    userAnswer: string,
    correctAnswer: string,
    sections: ExplanationSection
  ): string {
    const feedbacks: string[] = [];

    // Check for common mistakes
    if (!userAnswer && sections.diagnosis?.conclusion) {
      feedbacks.push(
        `Examiner perspective: You missed that ${sections.diagnosis.conclusion.toLowerCase()}. This is a classic exam trap.`
      );
    }

    if (userAnswer && userAnswer !== correctAnswer && sections.differential?.items) {
      const similarItems = sections.differential.items.filter((item) =>
        item.condition.toLowerCase().includes(userAnswer.toLowerCase())
      );

      if (similarItems.length > 0) {
        feedbacks.push(
          `AMC examiners penalize this because you selected ${similarItems[0].condition} instead of eliminating it first based on the ${sections.discriminators?.keyFeatures?.[0] || 'clinical findings'}.`
        );
      }
    }

    if (sections.management?.steps && sections.management.steps.length > 0) {
      feedbacks.push(
        `Remember: Management prioritizes ${sections.management.steps[0]?.action || 'initial stabilization'}. Examiners expect this to be your first thought.`
      );
    }

    return feedbacks.length > 0
      ? feedbacks[0]
      : 'Review the explanation structure to understand the clinical reasoning pathway.';
  }

  /**
   * Build clinical decision tree from explanation
   */
  static buildDecisionTree(sections: ExplanationSection): any {
    // Simple tree structure for frontend visualization
    const tree: any = {
      root: {
        label: 'Clinical Presentation',
        children: [],
      },
    };

    // Add discriminators as decision nodes
    if (sections.discriminators?.findings) {
      tree.root.children = sections.discriminators.findings.map((finding) => ({
        label: finding.feature,
        implication: finding.implication,
        children: [],
      }));
    }

    // Add differential items as leaf nodes
    if (sections.differential?.items) {
      sections.differential.items.forEach((item, idx) => {
        if (tree.root.children[idx]) {
          tree.root.children[idx].children.push({
            label: item.condition,
            probability: item.probability,
          });
        }
      });
    }

    return tree;
  }
}
