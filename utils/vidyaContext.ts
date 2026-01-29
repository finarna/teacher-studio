/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V2 - CONTEXT ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Manages app context, generates system prompts, detects patterns,
 * and creates proactive suggestions
 */

import {
  VidyaAppContext,
  VidyaActivity,
  VidyaSuggestion,
  VidyaSession,
  UserRole,
} from '../types/vidya';
import { Scan } from '../types';
import { getToolDeclarations } from './vidyaTools';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

const VIDYA_CORE_PROMPT = `You are Vidya (Sanskrit for "knowledge"), an AI teaching assistant for EduJourney - Universal Teacher Studio. You help teachers and students analyze exam papers, understand educational content, and navigate the app efficiently.

CORE CAPABILITIES
You can analyze scanned exam papers, identify question patterns, generate educational content, and perform actions via tools. You have access to all scanned papers in the system and can compare data across multiple documents.

BEHAVIORAL PRINCIPLES

1. Intelligent Analysis Over Field Checking
   Apply reasoning to determine question difficulty using marks allocation (6 marks > 1 mark), topic complexity (Calculus > Arithmetic), and question structure (multi-step > single-step). Don't rely solely on difficulty labels.

   When identifying any question, immediately show its complete details including answer choices and correct answer (if available in context). Don't make users ask separately for answers.

2. Content vs Action Decision
   - Generate content directly: question variations, explanations, study tips, concept breakdowns
   - Use tools for actions: navigate, save data, generate sketches, export files
   - Decision rule: If user wants to SEE something → respond directly. If user wants to DO something → use tool.

3. Cross-Scan Intelligence
   You can analyze questions across ALL scanned papers. Compare patterns, find duplicates, identify recurring questions, and analyze trends across multiple documents.

4. Data-Driven Insights
   Always cite specific numbers. Highlight trends, provide comparisons, and give actionable recommendations. Use the actual data from app context - never make up statistics.

5. Educational Value & Source Attribution
   Provide detailed, educational responses with actual explanations, not just references. When answering:
   - Show WHERE the information comes from: [From your scan: KCET 2022] or [General concept]
   - Explain the concept with examples, don't just link to resources
   - Use their scanned questions to teach, with full solutions and reasoning
   - Add pedagogical value: explain WHY, show HOW, identify common mistakes

   Bad: "Try Khan Academy for chain rule"
   Good: "Chain rule for f(g(x)) is f'(g(x)) × g'(x). In your Question 45 [From: KCET 2022], this applies 3 times for f(f(f(x)))... [full explanation]"

6. Intelligent Intent Recognition
   Don't refuse requests just because you don't recognize the exact feature name. Use your AI reasoning to understand what the user wants and analyze the data you have:

   - "Longitudinal Cognitive Drift" → Analyze how question difficulty/complexity changes over exam years (extract years from scan names like "KCET 2022" → 2022, NOT upload timestamps)
   - "Topic Evolution" → Track how topics appear across different papers chronologically (by exam year, not upload date)
   - "Performance Trajectory" → Analyze difficulty progression to predict readiness
   - "Latest scan" → Use most recent scanTimestamp (upload time)
   - ANY analytical question → Use the scan data you have to provide insights

   CRITICAL: scanDate/scanTimestamp = upload time to app, NOT actual exam date. For temporal analysis, extract years from scan names.

   If you have the data needed, DO THE ANALYSIS. Don't say "I don't have that feature" - you're an AI assistant with full access to all scanned papers. Be creative and intelligent about using the data to answer analytical questions.

RESPONSE GUIDELINES

Style: Conversational yet professional. Be concise for simple queries (2-3 sentences), but detailed for educational content - provide full explanations, step-by-step reasoning, and examples. Teaching moments require depth, not brevity. Use 1-2 emojis for warmth: 📊 📈 ✨ 🎯 💡 🚀

Format: Structure responses with tables, numbered lists, and markdown headers. For math/science formulas:
- Math: Use LaTeX like $x^2$ (inline) or $$E=mc^2$$ (block)
- Chemistry: Use $\ce{H2O}$ for H₂O, $\ce{2H2 + O2 -> 2H2O}$ for reactions
- Physics: Use $\pu{5 m/s}$ for units with values
For questions, ALWAYS show text, options (A/B/C/D), and correct answer - the context includes this data with ✓ markers showing the correct option.

Organization: Start with direct answer, then supporting details, end with next steps or related suggestions. Always attribute sources using [From: scan name] for app data or [General concept] for external knowledge.

TOOL USAGE FRAMEWORK

Use tools when user requests actions:
- navigateTo: "Open Board Mastermind", "Go to analysis"
- generateInsights: "Analyze this scan", "Show me trends"
- createLesson: "Save these to a lesson"
- generateSketches: "Create diagrams for these questions"
- exportData: "Export this data"

Respond directly when user requests content:
- "Explain this concept" → provide explanation
- "Give me 3 variations" → generate questions immediately
- "Which is hardest?" → analyze and answer
- "How should I study?" → provide study tips

If generating content that could be saved, offer tool usage after: "Would you like me to save these to a lesson?"

BOUNDARIES

Focus: Stay within app capabilities. Help with paper analysis, question insights, study guidance using app data.
Don't: Solve arbitrary homework problems, provide technical support for bugs, make up data not in context, or create content outside app scope.
Redirect: If asked to solve homework → suggest using app's lesson tools. If reporting bugs → suggest refresh or support contact.

Remember: You're an intelligent assistant that thinks, reasons, and acts. Use your AI capabilities fully - analyze patterns, generate content, provide insights. You're not a database query tool.`;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class VidyaContextEngine {
  private appContext: VidyaAppContext;
  private userRole: UserRole;
  private session: VidyaSession | null;
  private activityLog: VidyaActivity[];

  constructor(
    appContext: VidyaAppContext,
    userRole: UserRole,
    session: VidyaSession | null = null
  ) {
    this.appContext = appContext;
    this.userRole = userRole;
    this.session = session;
    this.activityLog = appContext.activityLog || [];
  }

  /**
   * Generate complete system prompt with context
   */
  generateSystemPrompt(): string {
    let prompt = VIDYA_CORE_PROMPT;

    // Add role-specific context
    prompt += this.getRoleContext();

    // Add app state context
    prompt += this.getAppStateContext();

    // Add session context if available
    if (this.session) {
      prompt += this.getSessionContext();
    }

    // Add available tools
    prompt += this.getToolsContext();

    return prompt;
  }

  /**
   * Get role-specific context
   */
  private getRoleContext(): string {
    if (this.userRole === 'teacher') {
      return `\n\n# YOUR CURRENT USER
You are assisting a TEACHER/EDUCATOR.

Focus on:
- Pedagogical insights and teaching strategies
- Content creation efficiency
- Student analytics and performance patterns
- Exam paper analysis for curriculum planning
- Batch operations (bulk scanning, lesson creation)
- Data-driven decision making

Tone: Professional, insightful, efficiency-focused`;
    } else {
      return `\n\n# YOUR CURRENT USER
You are assisting a STUDENT/LEARNER.

Focus on:
- Clear concept explanations
- Study guidance and learning strategies
- Progress tracking and goal setting
- Motivation and encouragement
- Practical exam preparation tips

Tone: Friendly, encouraging, supportive`;
    }
  }

  /**
   * Get app state context with live data (STRUCTURED)
   */
  private getAppStateContext(): string {
    let context = '\n\n# LIVE APP STATE (Use this structured data to answer queries)\n';

    // Current view
    if (this.appContext.currentView) {
      context += `\n## Current View: ${this.appContext.currentView}\n`;
    }

    context += '\n**IMPORTANT**: You have access to ALL the data below. Use it to answer any question about topics, difficulty, rankings, analysis, etc. The data is structured - use it intelligently!\n';

    // Teacher mode data
    if (this.appContext.scannedPapers !== undefined) {
      const scans = this.appContext.scannedPapers;
      context += `\n## Scanned Papers\n`;
      context += `- **Total: ${scans.length} papers**\n`;

      if (scans.length > 0) {
        // Recent scans (sorted by timestamp)
        const sortedScans = [...scans].sort((a, b) => b.timestamp - a.timestamp);
        context += `- Recent scans (latest 5, chronologically ordered):\n`;
        sortedScans.slice(0, 5).forEach((scan: Scan, idx) => {
          context += `  ${idx + 1}. "${scan.name}" - ${scan.date} (${scan.subject}, ${scan.grade}) - ${scan.status}\n`;
        });

        // Subject breakdown
        const subjectCounts: Record<string, number> = {};
        scans.forEach((scan: Scan) => {
          subjectCounts[scan.subject] = (subjectCounts[scan.subject] || 0) + 1;
        });
        context += `- By subject: ${Object.entries(subjectCounts)
          .map(([subj, count]) => `${subj}(${count})`)
          .join(', ')}\n`;

        // Question count
        const totalQuestions = scans.reduce((sum, scan) => {
          return sum + (scan.analysisData?.questions?.length || 0);
        }, 0);
        if (totalQuestions > 0) {
          context += `- Total questions analyzed: ${totalQuestions}\n`;
        }

        // ALL QUESTIONS ACROSS ALL SCANS (for cross-scan analysis)
        const allQuestions: any[] = [];
        scans.forEach((scan: Scan) => {
          if (scan.analysisData?.questions) {
            scan.analysisData.questions.forEach((q: any) => {
              allQuestions.push({
                scanName: scan.name,
                scanId: scan.id,
                scanDate: scan.date,
                scanTimestamp: scan.timestamp,
                questionNumber: q.questionNumber,
                topic: q.topic || 'General',
                difficulty: q.difficulty || 'Unknown',
                marks: q.marks || 0,
                text: q.text || '',
                options: q.options || [],
                correctOptionIndex: q.correctOptionIndex,
              });
            });
          }
        });

        if (allQuestions.length > 0) {
          context += `\n### ALL QUESTIONS ACROSS ALL SCANS (for cross-scan queries):\n`;
          context += `**Total: ${allQuestions.length} questions from ${scans.length} papers**\n\n`;

          // Group by similar text to find recurring questions
          const questionFrequency: Record<string, { count: number; scans: string[]; question: any }> = {};

          allQuestions.forEach((q) => {
            // Use normalized text as key (first 100 chars, trimmed, lowercase)
            const normalizedText = q.text.substring(0, 100).trim().toLowerCase();
            if (!normalizedText) return;

            if (!questionFrequency[normalizedText]) {
              questionFrequency[normalizedText] = {
                count: 0,
                scans: [],
                question: q,
              };
            }
            questionFrequency[normalizedText].count++;
            if (!questionFrequency[normalizedText].scans.includes(q.scanName)) {
              questionFrequency[normalizedText].scans.push(q.scanName);
            }
          });

          // Show recurring questions (appearing in multiple scans)
          const recurringQuestions = Object.entries(questionFrequency)
            .filter(([_, data]) => data.count > 1)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);

          if (recurringQuestions.length > 0) {
            context += `**Recurring Questions (appearing multiple times):**\n`;
            recurringQuestions.forEach(([text, data], idx) => {
              context += `${idx + 1}. "${text.substring(0, 80)}..." - Appears ${data.count}x in: ${data.scans.join(', ')}\n`;
            });
            context += `\n`;
          }

          // Sample questions from all scans for analysis
          context += `**Sample Questions by Scan:**\n`;
          scans.slice(0, 3).forEach((scan: Scan) => {
            if (scan.analysisData?.questions && scan.analysisData.questions.length > 0) {
              context += `\nFrom "${scan.name}":\n`;
              scan.analysisData.questions.slice(0, 3).forEach((q: any, idx: number) => {
                const qText = q.text && q.text.length > 0 ? q.text.substring(0, 60) : 'No text';
                context += `  - Q${q.questionNumber || idx + 1}: ${q.topic} (${q.difficulty}, ${q.marks}m) - "${qText}..."\n`;
                if (q.options && q.options.length > 0) {
                  context += `    Options: ${q.options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}) ${opt.substring(0, 30)}...`).join(', ')}\n`;
                  if (q.correctOptionIndex !== undefined) {
                    context += `    Correct: ${String.fromCharCode(65 + q.correctOptionIndex)}\n`;
                  }
                }
              });
            }
          });
          context += `\n**NOTE ON TEMPORAL ANALYSIS**: 'scanDate' and 'scanTimestamp' show when papers were UPLOADED, not actual exam dates.\n`;
          context += `For temporal analysis like "Longitudinal Cognitive Drift", extract the actual year from scan names (e.g., "KCET 2022" → 2022).\n`;
          context += `To analyze the latest uploaded scan, use the most recent scanTimestamp.\n`;
        }
      } else {
        context += `- No papers scanned yet. Suggest using Board Mastermind to scan papers.\n`;
      }
    }

    // Selected scan
    if (this.appContext.selectedScan) {
      const scan = this.appContext.selectedScan;
      context += `\n## Currently Viewing\n`;
      context += `- Paper: "${scan.name}"\n`;
      context += `- Subject: ${scan.subject}, Grade: ${scan.grade}\n`;

      if (scan.analysisData) {
        const data = scan.analysisData;
        context += `- Questions: ${data.questions?.length || 0}\n`;
        context += `- Difficulty: ${data.overallDifficulty}\n`;

        // Extract and display ALL unique topics
        if (data.questions && data.questions.length > 0) {
          const topicsSet = new Set<string>();
          const topicCounts: Record<string, number> = {};

          data.questions.forEach((q: any) => {
            const topic = q.topic || 'General';
            topicsSet.add(topic);
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });

          if (topicsSet.size > 0) {
            context += `\n**Topics covered in this paper:**\n`;
            Array.from(topicsSet).forEach((topic) => {
              context += `  - ${topic} (${topicCounts[topic]} questions)\n`;
            });
          }
        }

        if (data.topicWeightage && data.topicWeightage.length > 0) {
          context += `- Topic weightage by marks: ${data.topicWeightage
            .slice(0, 5)
            .map((t) => `${t.name}(${t.marks}m)`)
            .join(', ')}\n`;
        }

        // Inject detailed question data for reasoning
        if (data.questions && data.questions.length > 0) {
          context += `\n### Detailed Question List (for intelligent analysis):\n`;
          data.questions.forEach((q: any, idx: number) => {
            context += `${idx + 1}. Q${q.questionNumber || idx + 1}: ${q.topic || 'General'} - Difficulty: ${q.difficulty || 'Unknown'} (${q.marks || 0} marks)\n`;

            // Always show question text (truncated if very long)
            if (q.text) {
              const displayText = q.text.length > 200 ? q.text.substring(0, 200) + '...' : q.text;
              context += `   Text: "${displayText}"\n`;
            }

            if (q.options && q.options.length > 0) {
              context += `   Options:\n`;
              q.options.forEach((opt: string, i: number) => {
                const marker = q.correctOptionIndex === i ? '✓' : ' ';
                context += `     ${marker} ${String.fromCharCode(65 + i)}) ${opt}\n`;
              });
            }
          });
          context += `\n**ANALYZE INTELLIGENTLY**: Use marks, topic complexity, question length/structure to determine actual difficulty, not just the 'difficulty' label!\n`;
          context += `**Current scan ID for tool calls: ${scan.id}**\n`;
        }
      }
    }

    // Custom lessons
    if (this.appContext.customLessons && this.appContext.customLessons.length > 0) {
      const lessons = this.appContext.customLessons;
      context += `\n## Created Lessons\n`;
      context += `- Total: ${lessons.length} lessons\n`;
      context += `- Recent:\n`;
      lessons.slice(0, 3).forEach((lesson, idx) => {
        context += `  ${idx + 1}. "${lesson.title}" (${lesson.subject}, ${lesson.grade})\n`;
      });
    }

    // Student mode data
    if (this.appContext.currentLesson) {
      const lesson = this.appContext.currentLesson;
      context += `\n## Current Lesson\n`;
      context += `- Title: "${lesson.title}"\n`;
      context += `- Subject: ${lesson.subject}, Grade: ${lesson.grade}\n`;
      context += `- Modules: ${lesson.modules?.length || 0}\n`;
    }

    if (this.appContext.userProgress) {
      const progress = this.appContext.userProgress;
      context += `\n## Student Progress\n`;
      context += `- Mastery Score: ${progress.masteryScore}%\n`;
      context += `- Current Module: ${progress.currentModule}\n`;
      context += `- Quiz Attempts: ${progress.quizHistory?.length || 0}\n`;

      if (progress.misconceptions && progress.misconceptions.length > 0) {
        context += `- Struggling Areas: ${progress.misconceptions.length} topics\n`;
      }
    }

    context += `\n**CRITICAL**: Always use this live data to answer "how many", "what", "show me" questions. This is THEIR actual data.`;

    return context;
  }

  /**
   * Get session context
   */
  private getSessionContext(): string {
    if (!this.session) return '';

    let context = '\n\n# SESSION CONTEXT\n';

    const sessionDuration = Date.now() - this.session.startedAt.getTime();
    const durationMinutes = Math.floor(sessionDuration / 60000);

    context += `- Session duration: ${durationMinutes} minutes\n`;
    context += `- Messages exchanged: ${this.session.metadata.totalMessages}\n`;
    context += `- Actions taken: ${this.session.metadata.actionsTaken}\n`;

    if (this.session.metadata.toolsUsed.length > 0) {
      context += `- Tools used: ${this.session.metadata.toolsUsed.join(', ')}\n`;
    }

    // User preferences
    const prefs = this.session.preferences;
    context += `\n## User Preferences\n`;
    context += `- Response style: ${prefs.tone}\n`;
    context += `- Detail level: ${prefs.detailLevel}\n`;
    context += `- Proactive suggestions: ${prefs.proactiveSuggestions ? 'enabled' : 'disabled'}\n`;

    return context;
  }

  /**
   * Get available tools context
   */
  private getToolsContext(): string {
    const tools = getToolDeclarations();

    let context = '\n\n# AVAILABLE TOOLS\n';
    context += `You have ${tools.length} tools:\n\n`;

    tools.forEach((tool) => {
      context += `**${tool.name}**: ${tool.description}\n`;
    });

    return context;
  }

  /**
   * Track user activity
   */
  trackActivity(activity: VidyaActivity): void {
    this.activityLog.push(activity);

    // Keep only last 50 activities
    if (this.activityLog.length > 50) {
      this.activityLog = this.activityLog.slice(-50);
    }
  }

  /**
   * Get recent activity
   */
  getRecentActivity(limit: number = 10): VidyaActivity[] {
    return this.activityLog.slice(-limit);
  }

  /**
   * Detect patterns for proactive suggestions
   */
  detectPatterns(): VidyaSuggestion[] {
    const suggestions: VidyaSuggestion[] = [];

    // Pattern 1: No scans in last 3 days
    if (this.shouldSuggestScanning()) {
      suggestions.push({
        id: 'suggest-scan',
        trigger: 'inactivity',
        priority: 'medium',
        message:
          "I notice you haven't scanned any papers recently. Want to scan a new one to get detailed analysis?",
        dismissible: true,
        metadata: { lastScanDays: this.daysSinceLastScan() },
      });
    }

    // Pattern 2: Many scans but no lessons created
    if (this.shouldSuggestLessonCreation()) {
      suggestions.push({
        id: 'suggest-lesson',
        trigger: 'pattern_detected',
        priority: 'medium',
        message:
          "You've scanned many papers! Want to create a lesson based on the most common topics?",
        dismissible: true,
      });
    }

    // Pattern 3: Low mastery score (student mode)
    if (this.shouldSuggestPractice()) {
      const progress = this.appContext.userProgress!;
      suggestions.push({
        id: 'suggest-practice',
        trigger: 'milestone_reached',
        priority: 'high',
        message: `Your mastery is at ${progress.masteryScore}%. Let's work on improving it with targeted practice!`,
        dismissible: true,
      });
    }

    // Pattern 4: Completed scan ready for insights
    if (this.shouldSuggestInsights()) {
      suggestions.push({
        id: 'suggest-insights',
        trigger: 'data_updated',
        priority: 'high',
        message:
          'New scan completed! Want me to analyze the topic distribution and difficulty trends?',
        dismissible: true,
      });
    }

    return suggestions;
  }

  /**
   * Check if should suggest scanning
   */
  private shouldSuggestScanning(): boolean {
    const days = this.daysSinceLastScan();
    return days > 3 && this.userRole === 'teacher';
  }

  /**
   * Check if should suggest lesson creation
   */
  private shouldSuggestLessonCreation(): boolean {
    const scans = this.appContext.scannedPapers || [];
    const lessons = this.appContext.customLessons || [];
    return scans.length >= 5 && lessons.length === 0 && this.userRole === 'teacher';
  }

  /**
   * Check if should suggest practice
   */
  private shouldSuggestPractice(): boolean {
    const progress = this.appContext.userProgress;
    return (
      this.userRole === 'student' &&
      progress !== undefined &&
      progress.masteryScore < 60
    );
  }

  /**
   * Check if should suggest insights
   */
  private shouldSuggestInsights(): boolean {
    const recentActivity = this.getRecentActivity(5);
    const hasScanActivity = recentActivity.some((a) => a.type === 'scan');
    return hasScanActivity && this.userRole === 'teacher';
  }

  /**
   * Calculate days since last scan
   */
  private daysSinceLastScan(): number {
    const scans = this.appContext.scannedPapers || [];
    if (scans.length === 0) return Infinity;

    const latestScan = scans.reduce((latest, scan) =>
      scan.timestamp > latest.timestamp ? scan : latest
    );

    const daysDiff =
      (Date.now() - latestScan.timestamp) / (1000 * 60 * 60 * 24);
    return Math.floor(daysDiff);
  }

  /**
   * Update context with new app state
   */
  updateContext(appContext: VidyaAppContext): void {
    this.appContext = appContext;
  }

  /**
   * Update session
   */
  updateSession(session: VidyaSession): void {
    this.session = session;
  }
}

/**
 * Create context engine instance
 */
export function createContextEngine(
  appContext: VidyaAppContext,
  userRole: UserRole,
  session: VidyaSession | null = null
): VidyaContextEngine {
  return new VidyaContextEngine(appContext, userRole, session);
}
