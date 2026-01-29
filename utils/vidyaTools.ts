/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V2 - TOOL REGISTRY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Function/tool calling system for Vidya to perform actions in the app
 */

import { VidyaTool, VidyaToolResult, VidyaToolContext } from '../types/vidya';
import { Scan } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

const navigateToTool: VidyaTool = {
  name: 'navigateTo',
  description: 'Navigate to a different section of the EduJourney app',
  parameters: {
    type: 'object',
    properties: {
      view: {
        type: 'string',
        description: 'The app section to navigate to',
        enum: ['mastermind', 'analysis', 'sketches', 'lessons', 'vault', 'rapid-recall', 'training'],
      },
    },
    required: ['view'],
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      context.actions.navigateTo(params.view);
      return {
        toolCallId: `nav-${Date.now()}`,
        success: true,
        result: { view: params.view },
        message: `Navigated to ${params.view}`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `nav-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Navigation failed',
        timestamp: new Date(),
      };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNING TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

const scanPaperTool: VidyaTool = {
  name: 'scanPaper',
  description: 'Trigger the paper scanning workflow in Board Mastermind',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      // Navigate to Board Mastermind and trigger scan
      context.actions.navigateTo('mastermind');
      context.actions.scanPaper();

      return {
        toolCallId: `scan-${Date.now()}`,
        success: true,
        result: { action: 'scan_initiated' },
        message: 'Paper scanning workflow started. Please upload your exam paper.',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `scan-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Scan initiation failed',
        timestamp: new Date(),
      };
    }
  },
};

const filterScansTool: VidyaTool = {
  name: 'filterScans',
  description: 'Filter scanned papers by subject, grade, or date range',
  parameters: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'Filter by subject (Math, Physics, Chemistry, Biology)',
        enum: ['Math', 'Physics', 'Chemistry', 'Biology'],
      },
      grade: {
        type: 'string',
        description: 'Filter by grade (Class 10, 11, 12)',
        enum: ['Class 10', 'Class 11', 'Class 12'],
      },
      status: {
        type: 'string',
        description: 'Filter by scan status',
        enum: ['Processing', 'Complete', 'Failed'],
      },
    },
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      let filtered = context.appContext.scannedPapers || [];

      if (params.subject) {
        filtered = filtered.filter((scan: Scan) => scan.subject === params.subject);
      }
      if (params.grade) {
        filtered = filtered.filter((scan: Scan) => scan.grade === params.grade);
      }
      if (params.status) {
        filtered = filtered.filter((scan: Scan) => scan.status === params.status);
      }

      return {
        toolCallId: `filter-${Date.now()}`,
        success: true,
        result: {
          count: filtered.length,
          scans: filtered.slice(0, 10).map((s: Scan) => ({
            name: s.name,
            subject: s.subject,
            grade: s.grade,
            status: s.status,
            date: s.date,
          })),
        },
        message: `Found ${filtered.length} scans matching your criteria`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `filter-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Filtering failed',
        timestamp: new Date(),
      };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

const generateInsightsTool: VidyaTool = {
  name: 'generateInsights',
  description: 'Analyze scanned papers and generate insights about topics, difficulty, trends',
  parameters: {
    type: 'object',
    properties: {
      analysisType: {
        type: 'string',
        description: 'Type of analysis to perform',
        enum: ['topic_distribution', 'difficulty_trends', 'subject_breakdown', 'scan_frequency'],
      },
    },
    required: ['analysisType'],
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      const scans = context.appContext.scannedPapers || [];

      if (scans.length === 0) {
        return {
          toolCallId: `insights-${Date.now()}`,
          success: false,
          result: null,
          error: 'No scans available for analysis',
          timestamp: new Date(),
        };
      }

      let insights: any = {};

      switch (params.analysisType) {
        case 'topic_distribution': {
          const topicCounts: Record<string, number> = {};
          scans.forEach((scan: Scan) => {
            if (scan.analysisData?.topicWeightage) {
              scan.analysisData.topicWeightage.forEach((topic: any) => {
                topicCounts[topic.name] = (topicCounts[topic.name] || 0) + topic.marks;
              });
            }
          });

          const topTopics = Object.entries(topicCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, marks]) => ({ name, marks }));

          insights = {
            type: 'topic_distribution',
            totalScans: scans.length,
            topTopics,
            chart: {
              type: 'bar',
              data: topTopics,
            },
          };
          break;
        }

        case 'difficulty_trends': {
          const difficultyCounts = { Easy: 0, Moderate: 0, Hard: 0 };
          scans.forEach((scan: Scan) => {
            if (scan.analysisData?.overallDifficulty) {
              difficultyCounts[scan.analysisData.overallDifficulty as keyof typeof difficultyCounts]++;
            }
          });

          insights = {
            type: 'difficulty_trends',
            totalScans: scans.length,
            distribution: difficultyCounts,
            chart: {
              type: 'pie',
              data: difficultyCounts,
            },
          };
          break;
        }

        case 'subject_breakdown': {
          const subjectCounts: Record<string, number> = {};
          scans.forEach((scan: Scan) => {
            subjectCounts[scan.subject] = (subjectCounts[scan.subject] || 0) + 1;
          });

          insights = {
            type: 'subject_breakdown',
            totalScans: scans.length,
            subjects: Object.entries(subjectCounts).map(([name, count]) => ({ name, count })),
          };
          break;
        }

        case 'scan_frequency': {
          const last30Days = scans.filter((scan: Scan) => {
            const scanDate = new Date(scan.timestamp);
            const now = new Date();
            const daysDiff = (now.getTime() - scanDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 30;
          });

          insights = {
            type: 'scan_frequency',
            totalScans: scans.length,
            last30Days: last30Days.length,
            averagePerWeek: (last30Days.length / 4).toFixed(1),
          };
          break;
        }
      }

      return {
        toolCallId: `insights-${Date.now()}`,
        success: true,
        result: insights,
        message: `Generated ${params.analysisType} insights from ${scans.length} scans`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `insights-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Insight generation failed',
        timestamp: new Date(),
      };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LESSON TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

const createLessonTool: VidyaTool = {
  name: 'createLesson',
  description: 'Open the lesson creator with optional pre-filled subject and grade',
  parameters: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'Subject for the lesson',
        enum: ['Math', 'Physics', 'Chemistry', 'Biology'],
      },
      grade: {
        type: 'string',
        description: 'Grade level for the lesson',
        enum: ['Class 10', 'Class 11', 'Class 12'],
      },
    },
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      const prefill = {
        subject: params.subject,
        grade: params.grade,
      };

      context.actions.createLesson(prefill);

      return {
        toolCallId: `lesson-${Date.now()}`,
        success: true,
        result: { prefill },
        message: 'Lesson creator opened',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `lesson-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Failed to open lesson creator',
        timestamp: new Date(),
      };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SKETCH TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

const generateSketchesTool: VidyaTool = {
  name: 'generateSketches',
  description: 'Generate high-yield visual sketches from a scanned paper. If no scanId provided, uses the currently selected scan.',
  parameters: {
    type: 'object',
    properties: {
      scanId: {
        type: 'string',
        description: 'ID of the scan to generate sketches from. Optional - uses current scan if not provided.',
      },
    },
    required: [],
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      // Try to get scan from parameter, otherwise use selectedScan
      let scan: Scan | undefined;
      let scanId: string;

      if (params.scanId) {
        scan = context.appContext.scannedPapers?.find((s: Scan) => s.id === params.scanId);
        scanId = params.scanId;
      } else if (context.appContext.selectedScan) {
        scan = context.appContext.selectedScan;
        scanId = scan.id;
      }

      if (!scan) {
        return {
          toolCallId: `sketch-${Date.now()}`,
          success: false,
          result: null,
          error: 'No scan found. Please specify a scanId or select a scan to view.',
          timestamp: new Date(),
        };
      }

      if (!scan.analysisData || !scan.analysisData.questions || scan.analysisData.questions.length === 0) {
        return {
          toolCallId: `sketch-${Date.now()}`,
          success: false,
          result: null,
          error: `Scan "${scan.name}" has no questions to generate sketches from.`,
          timestamp: new Date(),
        };
      }

      // Navigate to sketches view and set the scan
      context.actions.generateSketches(scanId);

      const questionCount = scan.analysisData.questions.length;
      const questionsWithSketches = scan.analysisData.questions.filter(q => q.sketchSvg).length;
      const questionsNeedingSketches = questionCount - questionsWithSketches;

      return {
        toolCallId: `sketch-${Date.now()}`,
        success: true,
        result: {
          scanId: scanId,
          scanName: scan.name,
          totalQuestions: questionCount,
          existingSketches: questionsWithSketches,
          needingSketches: questionsNeedingSketches,
        },
        message: `Navigated to Sketch Gallery for "${scan.name}". Found ${questionCount} questions (${questionsWithSketches} with sketches, ${questionsNeedingSketches} pending). You can now use the "Generate All" button or generate individual sketches.`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `sketch-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Sketch generation failed',
        timestamp: new Date(),
      };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

const exportDataTool: VidyaTool = {
  name: 'exportData',
  description: 'Export analysis data or reports in various formats',
  parameters: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Export format',
        enum: ['pdf', 'json', 'csv'],
      },
      dataType: {
        type: 'string',
        description: 'Type of data to export',
        enum: ['scan_analysis', 'all_scans', 'insights', 'session_summary'],
      },
    },
    required: ['format', 'dataType'],
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      let dataToExport: any = null;

      switch (params.dataType) {
        case 'scan_analysis':
          dataToExport = context.appContext.selectedScan?.analysisData;
          break;
        case 'all_scans':
          dataToExport = context.appContext.scannedPapers;
          break;
        case 'insights':
          // Generate insights data
          dataToExport = { placeholder: 'insights data' };
          break;
        case 'session_summary':
          dataToExport = context.appContext;
          break;
      }

      if (!dataToExport) {
        return {
          toolCallId: `export-${Date.now()}`,
          success: false,
          result: null,
          error: 'No data available to export',
          timestamp: new Date(),
        };
      }

      await context.actions.exportData(params.format as 'pdf' | 'json' | 'csv', dataToExport);

      return {
        toolCallId: `export-${Date.now()}`,
        success: true,
        result: { format: params.format, dataType: params.dataType },
        message: `Exporting ${params.dataType} as ${params.format.toUpperCase()}...`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `export-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Export failed',
        timestamp: new Date(),
      };
    }
  },
  requiresConfirmation: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA MANAGEMENT TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

const deleteScanTool: VidyaTool = {
  name: 'deleteScan',
  description: 'Delete a scanned paper from the system',
  parameters: {
    type: 'object',
    properties: {
      scanId: {
        type: 'string',
        description: 'ID of the scan to delete',
      },
    },
    required: ['scanId'],
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      const scan = context.appContext.scannedPapers?.find((s: Scan) => s.id === params.scanId);

      if (!scan) {
        return {
          toolCallId: `delete-${Date.now()}`,
          success: false,
          result: null,
          error: 'Scan not found',
          timestamp: new Date(),
        };
      }

      // Confirm destructive action
      const confirmed = await context.actions.confirmAction(
        'Delete Scan',
        `Are you sure you want to delete "${scan.name}"? This action cannot be undone.`,
        'danger'
      );

      if (!confirmed) {
        return {
          toolCallId: `delete-${Date.now()}`,
          success: false,
          result: null,
          error: 'Delete cancelled by user',
          timestamp: new Date(),
        };
      }

      // Call the backend API to delete
      const response = await fetch(`/api/scans/${params.scanId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete scan: ${response.statusText}`);
      }

      return {
        toolCallId: `delete-${Date.now()}`,
        success: true,
        result: { deletedScanId: params.scanId, scanName: scan.name },
        message: `Successfully deleted "${scan.name}". Please refresh the page to see updated scan list.`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `delete-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Delete failed',
        timestamp: new Date(),
      };
    }
  },
};

const clearSolutionsTool: VidyaTool = {
  name: 'clearSolutions',
  description: 'Clear solution data from all scans while keeping the scan structure intact. Useful for regenerating solutions.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      // Confirm destructive action
      const confirmed = await context.actions.confirmAction(
        'Clear All Solutions',
        'This will remove all cached solution data from your scans. Your scan structure will remain intact, but you will need to regenerate solutions. Continue?',
        'warning'
      );

      if (!confirmed) {
        return {
          toolCallId: `clear-${Date.now()}`,
          success: false,
          result: null,
          error: 'Clear solutions cancelled by user',
          timestamp: new Date(),
        };
      }

      const response = await fetch('/api/cache/clear-solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to clear solutions: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        toolCallId: `clear-${Date.now()}`,
        success: true,
        result: result,
        message: `✅ Cleared solutions from ${result.scans_cleaned} scans. Your scans are intact. You can now regenerate solutions.`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `clear-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Clear solutions failed',
        timestamp: new Date(),
      };
    }
  },
};

const updateScanTool: VidyaTool = {
  name: 'updateScan',
  description: 'Update a scan with new data (e.g., after generating sketches or solutions)',
  parameters: {
    type: 'object',
    properties: {
      scanId: {
        type: 'string',
        description: 'ID of the scan to update',
      },
    },
    required: ['scanId'],
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      const scan = context.appContext.scannedPapers?.find((s: Scan) => s.id === params.scanId);

      if (!scan) {
        return {
          toolCallId: `update-${Date.now()}`,
          success: false,
          result: null,
          error: 'Scan not found',
          timestamp: new Date(),
        };
      }

      // Save the updated scan to backend
      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scan),
      });

      if (!response.ok) {
        throw new Error(`Failed to update scan: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        toolCallId: `update-${Date.now()}`,
        success: true,
        result: { scanId: params.scanId, synced: result.synced },
        message: `Successfully updated "${scan.name}" ${result.synced ? 'to Redis' : 'to memory cache'}.`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `update-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Update failed',
        timestamp: new Date(),
      };
    }
  },
};

const fetchFlashcardsTool: VidyaTool = {
  name: 'fetchFlashcards',
  description: 'Fetch cached flashcards for a specific scan from the backend',
  parameters: {
    type: 'object',
    properties: {
      scanId: {
        type: 'string',
        description: 'ID of the scan to fetch flashcards for',
      },
    },
    required: ['scanId'],
  },
  handler: async (params, context): Promise<VidyaToolResult> => {
    try {
      const response = await fetch(`/api/flashcards/${params.scanId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch flashcards: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.cards) {
        return {
          toolCallId: `flashcards-${Date.now()}`,
          success: true,
          result: { cached: false, count: 0 },
          message: 'No flashcards found for this scan yet.',
          timestamp: new Date(),
        };
      }

      return {
        toolCallId: `flashcards-${Date.now()}`,
        success: true,
        result: {
          cards: result.cards,
          cached: result.cached,
          count: result.cards.length
        },
        message: `Found ${result.cards.length} flashcards for this scan${result.cached ? ' (cached)' : ''}.`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        toolCallId: `flashcards-${Date.now()}`,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Fetch flashcards failed',
        timestamp: new Date(),
      };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const VIDYA_TOOLS: VidyaTool[] = [
  navigateToTool,
  scanPaperTool,
  filterScansTool,
  generateInsightsTool,
  createLessonTool,
  generateSketchesTool,
  exportDataTool,
  deleteScanTool,
  clearSolutionsTool,
  updateScanTool,
  fetchFlashcardsTool,
];

/**
 * Get tool by name
 */
export function getToolByName(name: string): VidyaTool | undefined {
  return VIDYA_TOOLS.find((tool) => tool.name === name);
}

/**
 * Get tool declarations for Gemini API
 */
export function getToolDeclarations() {
  return VIDYA_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  parameters: any,
  context: VidyaToolContext
): Promise<VidyaToolResult> {
  const tool = getToolByName(toolName);

  if (!tool) {
    return {
      toolCallId: `error-${Date.now()}`,
      success: false,
      result: null,
      error: `Tool "${toolName}" not found`,
      timestamp: new Date(),
    };
  }

  try {
    return await tool.handler(parameters, context);
  } catch (error) {
    return {
      toolCallId: `error-${Date.now()}`,
      success: false,
      result: null,
      error: error instanceof Error ? error.message : 'Tool execution failed',
      timestamp: new Date(),
    };
  }
}
