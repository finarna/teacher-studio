/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - RESPONSE RENDERER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Render structured responses with controlled formatting
 */

import { QueryResponse } from './vidyaQueryHandlers';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RenderedResponse {
  markdown: string;
  executionTime?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE RENDERERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render table data
 */
function renderTable(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return '*No data available*';
  }

  // Auto-detect headers from first object
  const detectedHeaders = headers || Object.keys(data[0]);

  // Build table
  let table = '\n';

  // Header row
  table += '| ' + detectedHeaders.map(h => h.charAt(0).toUpperCase() + h.slice(1)).join(' | ') + ' |\n';

  // Separator row
  table += '| ' + detectedHeaders.map(() => '---').join(' | ') + ' |\n';

  // Data rows
  data.forEach(row => {
    table += '| ' + detectedHeaders.map(header => {
      const value = row[header];
      // Format values
      if (value === null || value === undefined) return '-';
      if (typeof value === 'number') return value.toString();
      return value.toString();
    }).join(' | ') + ' |\n';
  });

  table += '\n';

  return table;
}

/**
 * Render list data
 */
function renderList(data: any[], numbered: boolean = true): string {
  if (!data || data.length === 0) {
    return '*No items available*';
  }

  let list = '\n';

  data.forEach((item, idx) => {
    const prefix = numbered ? `${idx + 1}.` : '-';

    // If item is object, render key-value pairs
    if (typeof item === 'object' && item !== null) {
      const entries = Object.entries(item);
      if (entries.length === 1) {
        // Single key-value: render inline
        list += `${prefix} ${entries[0][1]}\n`;
      } else {
        // Multiple keys: render as sub-list
        list += `${prefix} ${entries.map(([key, value]) => `**${key}**: ${value}`).join(' | ')}\n`;
      }
    } else {
      list += `${prefix} ${item}\n`;
    }
  });

  list += '\n';

  return list;
}

/**
 * Render count data
 */
function renderCount(data: { count: number; entity: string; detail: string }): string {
  const icon = getEntityIcon(data.entity);

  return `
${icon} **${data.count}** ${data.entity} ${data.detail}
`;
}

/**
 * Render text data
 */
function renderText(text: string): string {
  return `\n${text}\n`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get emoji icon for entity type
 */
function getEntityIcon(entity: string): string {
  const icons: Record<string, string> = {
    questions: '❓',
    scans: '📄',
    lessons: '📚',
    topics: '📊',
    insights: '💡',
  };

  return icons[entity] || '📌';
}

/**
 * Get header emoji for query type
 */
function getQueryTypeIcon(queryType: string): string {
  const icons: Record<string, string> = {
    COUNT: '🔢',
    RANK: '🏆',
    LIST: '📋',
    TOPICS: '📊',
    FILTER: '🔍',
    SPECIFIC: '❓',
  };

  return icons[queryType] || '💡';
}

/**
 * Format metadata
 */
function formatMetadata(metadata?: any): string {
  if (!metadata) return '';

  const parts: string[] = [];

  if (metadata.totalCount !== undefined) {
    parts.push(`Total: ${metadata.totalCount}`);
  }

  if (metadata.filteredCount !== undefined && metadata.filteredCount !== metadata.totalCount) {
    parts.push(`Filtered: ${metadata.filteredCount}`);
  }

  if (metadata.executionTime !== undefined) {
    parts.push(`⚡ ${metadata.executionTime}ms`);
  }

  if (parts.length === 0) return '';

  return `\n*${parts.join(' | ')}*\n`;
}

/**
 * Format suggestions
 */
function formatSuggestions(suggestions?: string[]): string {
  if (!suggestions || suggestions.length === 0) return '';

  return `
**💡 What's next?**
${suggestions.map(s => `- ${s}`).join('\n')}
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render query response to markdown
 */
export function renderQueryResponse(response: QueryResponse): RenderedResponse {
  const icon = getQueryTypeIcon(response.queryType);

  let markdown = `### ${icon} ${response.queryType.charAt(0) + response.queryType.slice(1).toLowerCase()} Query\n`;

  // Add summary
  markdown += `\n${response.summary}\n`;

  // Add main content based on type
  switch (response.result.type) {
    case 'table':
      markdown += renderTable(response.result.data);
      break;
    case 'list':
      markdown += renderList(response.result.data);
      break;
    case 'count':
      markdown += renderCount(response.result.data);
      break;
    case 'text':
      markdown += renderText(response.result.data);
      break;
    default:
      markdown += `\n*Unsupported result type: ${response.result.type}*\n`;
  }

  // Add metadata
  markdown += formatMetadata(response.result.metadata);

  // Add suggestions
  markdown += formatSuggestions(response.suggestions);

  return {
    markdown,
    executionTime: response.result.metadata?.executionTime,
  };
}

/**
 * Render action response to markdown
 */
export function renderActionResponse(actionType: string, result: any): RenderedResponse {
  let markdown = `### ⚙️ Action: ${actionType}\n\n`;

  if (result.success) {
    markdown += `✅ **Success!** ${result.message || 'Action completed successfully.'}\n`;

    if (result.result) {
      markdown += `\n**Details:**\n`;
      markdown += renderText(JSON.stringify(result.result, null, 2));
    }
  } else {
    markdown += `❌ **Failed!** ${result.error || 'Action failed.'}\n`;
  }

  return {
    markdown,
  };
}

/**
 * Render conversation response
 */
export function renderConversationResponse(text: string): RenderedResponse {
  return {
    markdown: text,
  };
}

/**
 * Render error response
 */
export function renderErrorResponse(error: string, details?: any): RenderedResponse {
  let markdown = `### ❌ Error\n\n`;
  markdown += `${error}\n`;

  if (details) {
    markdown += `\n**Details:**\n`;
    markdown += renderText(JSON.stringify(details, null, 2));
  }

  return {
    markdown,
  };
}

/**
 * Render security violation
 */
export function renderSecurityViolation(violations: any[]): RenderedResponse {
  let markdown = `### 🛡️ Security Alert\n\n`;
  markdown += `Your request was blocked due to security concerns:\n\n`;

  violations.forEach((violation, idx) => {
    markdown += `${idx + 1}. **${violation.type}**: ${violation.message} (Severity: ${violation.severity})\n`;
  });

  markdown += `\nPlease rephrase your request and try again.`;

  return {
    markdown,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  renderQueryResponse,
  renderActionResponse,
  renderConversationResponse,
  renderErrorResponse,
  renderSecurityViolation,
};
