/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDYA V3 - SECURITY LAYER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Input sanitization, prompt injection detection, rate limiting, and validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SecurityConfig {
  maxInputLength: 500;
  maxContextLength: 10000;
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  blockedPatterns: RegExp[];
}

export interface SecurityCheckResult {
  isValid: boolean;
  sanitizedInput?: string;
  violations: SecurityViolation[];
}

export interface SecurityViolation {
  type: 'PROMPT_INJECTION' | 'EXCESSIVE_LENGTH' | 'RATE_LIMIT' | 'BLOCKED_PATTERN';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxInputLength: 500,
  maxContextLength: 10000,
  rateLimit: {
    requests: 20, // 20 requests per window
    windowMs: 60000, // 1 minute
  },
  blockedPatterns: [
    // Dangerous keywords
    /<script>/gi,
    /javascript:/gi,
    /onerror=/gi,
    /onload=/gi,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT INJECTION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that indicate prompt injection attempts
 */
const INJECTION_PATTERNS = [
  // Direct instruction override
  /ignore (previous|all|above|prior) (instructions|prompts|rules|directives)/i,
  /disregard (previous|all|above|prior) (instructions|prompts|rules)/i,
  /forget (previous|all|above|prior) (instructions|prompts|rules)/i,

  // Role manipulation
  /you are now/i,
  /act as (a |an )?(?!teacher|student|assistant)/i, // Allow "act as teacher" but block others
  /pretend (to be|you are)/i,
  /simulate (being|a)/i,

  // System prompt extraction
  /what are your (instructions|rules|system prompt|guidelines)/i,
  /show me your (instructions|rules|system prompt|prompts)/i,
  /repeat your (instructions|rules|system prompt)/i,
  /print your (instructions|system prompt)/i,

  // Delimiter injection
  /system:\s/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[\/INST\]/i,

  // Code execution attempts
  /execute\s+(code|command|script)/i,
  /eval\(/i,
  /exec\(/i,
  /subprocess/i,

  // Jailbreak patterns
  /DAN mode/i,
  /developer mode/i,
  /jailbreak/i,
  /bypass (your|the) (restrictions|rules|guidelines)/i,
];

/**
 * Detect prompt injection attempts
 */
export function detectPromptInjection(input: string): SecurityViolation[] {
  const violations: SecurityViolation[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      violations.push({
        type: 'PROMPT_INJECTION',
        message: `Potential prompt injection detected: pattern "${pattern.source}"`,
        severity: 'critical',
      });
    }
  }

  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string, config: SecurityConfig = DEFAULT_SECURITY_CONFIG): string {
  let sanitized = input;

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > config.maxInputLength) {
    sanitized = sanitized.substring(0, config.maxInputLength);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Normalize whitespace (collapse multiple spaces)
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Escape HTML entities to prevent XSS in rendered output
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Validate input against blocked patterns
 */
export function validateAgainstBlockedPatterns(
  input: string,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): SecurityViolation[] {
  const violations: SecurityViolation[] = [];

  for (const pattern of config.blockedPatterns) {
    if (pattern.test(input)) {
      violations.push({
        type: 'BLOCKED_PATTERN',
        message: `Input contains blocked pattern: "${pattern.source}"`,
        severity: 'high',
      });
    }
  }

  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  check(userId: string, config: SecurityConfig = DEFAULT_SECURITY_CONFIG): boolean {
    const now = Date.now();
    const windowStart = now - config.rateLimit.windowMs;

    // Get user's request timestamps
    let timestamps = this.requests.get(userId) || [];

    // Remove old timestamps outside the window
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= config.rateLimit.requests) {
      return false; // Rate limit exceeded
    }

    // Add current timestamp
    timestamps.push(now);
    this.requests.set(userId, timestamps);

    return true; // Within rate limit
  }

  reset(userId: string): void {
    this.requests.delete(userId);
  }

  cleanup(): void {
    // Remove old entries (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    for (const [userId, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter((ts) => ts > fiveMinutesAgo);

      if (validTimestamps.length === 0) {
        this.requests.delete(userId);
      } else {
        this.requests.set(userId, validTimestamps);
      }
    }
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter();

// Cleanup every minute
setInterval(() => globalRateLimiter.cleanup(), 60000);

export function checkRateLimit(
  userId: string,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): SecurityViolation | null {
  const allowed = globalRateLimiter.check(userId, config);

  if (!allowed) {
    return {
      type: 'RATE_LIMIT',
      message: `Rate limit exceeded: ${config.rateLimit.requests} requests per ${config.rateLimit.windowMs / 1000}s`,
      severity: 'medium',
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE SECURITY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Perform comprehensive security check on user input
 */
export function securityCheck(
  input: string,
  userId: string,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): SecurityCheckResult {
  const violations: SecurityViolation[] = [];

  // 1. Check length
  if (input.length > config.maxInputLength) {
    violations.push({
      type: 'EXCESSIVE_LENGTH',
      message: `Input exceeds maximum length of ${config.maxInputLength} characters`,
      severity: 'low',
    });
  }

  // 2. Check rate limit
  const rateLimitViolation = checkRateLimit(userId, config);
  if (rateLimitViolation) {
    violations.push(rateLimitViolation);
  }

  // 3. Detect prompt injection
  const injectionViolations = detectPromptInjection(input);
  violations.push(...injectionViolations);

  // 4. Check blocked patterns
  const blockedViolations = validateAgainstBlockedPatterns(input, config);
  violations.push(...blockedViolations);

  // 5. Sanitize input (always do this)
  const sanitizedInput = sanitizeInput(input, config);

  // Determine if valid (block critical and high severity violations)
  const criticalViolations = violations.filter((v) => v.severity === 'critical' || v.severity === 'high');
  const isValid = criticalViolations.length === 0;

  return {
    isValid,
    sanitizedInput: isValid ? sanitizedInput : undefined,
    violations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL PARAMETER VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate tool parameters against schema
 */
export function validateToolParams(toolName: string, params: any, schema: any): SecurityCheckResult {
  const violations: SecurityViolation[] = [];

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in params)) {
        violations.push({
          type: 'BLOCKED_PATTERN',
          message: `Missing required parameter: ${field}`,
          severity: 'high',
        });
      }
    }
  }

  // Validate types and values
  if (schema.properties) {
    for (const [key, value] of Object.entries(params)) {
      const propSchema = schema.properties[key];

      if (!propSchema) {
        violations.push({
          type: 'BLOCKED_PATTERN',
          message: `Unknown parameter: ${key}`,
          severity: 'medium',
        });
        continue;
      }

      // Type validation
      const actualType = typeof value;
      const expectedType = propSchema.type;

      if (actualType !== expectedType) {
        violations.push({
          type: 'BLOCKED_PATTERN',
          message: `Invalid type for ${key}: expected ${expectedType}, got ${actualType}`,
          severity: 'high',
        });
      }

      // Enum validation
      if (propSchema.enum && !propSchema.enum.includes(value)) {
        violations.push({
          type: 'BLOCKED_PATTERN',
          message: `Invalid value for ${key}: must be one of ${propSchema.enum.join(', ')}`,
          severity: 'high',
        });
      }

      // String sanitization
      if (expectedType === 'string' && typeof value === 'string') {
        params[key] = sanitizeInput(value);
      }
    }
  }

  const isValid = violations.filter((v) => v.severity === 'critical' || v.severity === 'high').length === 0;

  return {
    isValid,
    sanitizedInput: isValid ? JSON.stringify(params) : undefined,
    violations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { DEFAULT_SECURITY_CONFIG };
export default {
  securityCheck,
  sanitizeInput,
  detectPromptInjection,
  validateToolParams,
  checkRateLimit,
};
