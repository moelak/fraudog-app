// utils/sqlValidator.ts

// Allowed SQL keywords/operators for conditions
const SQL_KEYWORDS = [
  "AND",
  "OR",
  "NOT",
  "IN",
  "BETWEEN",
  "LIKE",
  "IS",
  "NULL",
  "=", "<", ">", "<=", ">=", "!=",
];

// Regex for simple conditions like "amount > 1000" or "currency = 'USD'"
// Allow parentheses around simple conditions
const SIMPLE_CONDITION = /^\(?\s*[a-zA-Z_][a-zA-Z0-9_]*\s*(=|!=|>|<|>=|<=)\s*('[^']*'|\d+(\.\d+)?)\s*\)?$/;


// Split condition by AND/OR while keeping the operators
function tokenizeCondition(condition: string): string[] {
  return condition
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+(AND|OR)\s+/i);
}

export function validateRuleCondition(condition: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const trimmed = condition.trim();

  if (!trimmed) {
    return { valid: false, errors: ["Condition cannot be empty"] };
  }

  // Prevent full SQL statements
  if (/select\s+/i.test(trimmed) || /insert\s+/i.test(trimmed) || /drop\s+/i.test(trimmed)) {
    errors.push("Condition must not contain full SQL statements (SELECT, INSERT, DROP, etc.).");
  }

  // Tokenize condition by AND/OR
  const tokens = tokenizeCondition(trimmed);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();

    // Skip logical operators (we validate them separately)
    if (/^(AND|OR)$/i.test(token)) {
      if (!SQL_KEYWORDS.includes(token.toUpperCase())) {
        errors.push(`Invalid logical operator: "${token}"`);
      }
      continue;
    }

    // Check if condition matches "field op value"
    if (!SIMPLE_CONDITION.test(token)) {
      errors.push(`Invalid expression: "${token}"`);
    }
  }

  // Check balanced parentheses
  const open = (trimmed.match(/\(/g) || []).length;
  const close = (trimmed.match(/\)/g) || []).length;
  if (open !== close) {
    errors.push("Unbalanced parentheses in condition");
  }

  // Extra: check for unsupported ALL CAPS keywords
  for (const word of trimmed.split(/\s+/)) {
    if (/^[A-Z]+$/.test(word) && !SQL_KEYWORDS.includes(word.toUpperCase())) {
      errors.push(`Unsupported keyword: "${word}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}
