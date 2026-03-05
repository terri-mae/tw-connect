/**
 * Lightweight validation helpers.
 * Each validator returns { valid: bool, errors: string[] }.
 */

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateContact(data, isNew = true) {
  const errors = [];
  if (isNew || data.first_name !== undefined) {
    if (!data.first_name?.trim()) errors.push('first_name is required');
  }
  if (isNew || data.last_name !== undefined) {
    if (!data.last_name?.trim()) errors.push('last_name is required');
  }
  if (data.email && !validateEmail(data.email)) {
    errors.push('email is invalid');
  }
  if (data.status && !['active', 'cold', 'do_not_contact'].includes(data.status)) {
    errors.push('status must be active, cold, or do_not_contact');
  }
  return { valid: errors.length === 0, errors };
}

function validateCompany(data, isNew = true) {
  const errors = [];
  if (isNew || data.name !== undefined) {
    if (!data.name?.trim()) errors.push('name is required');
  }
  return { valid: errors.length === 0, errors };
}

function validateInteraction(data, isNew = true) {
  const errors = [];
  const validMethods = ['email', 'phone', 'linkedin', 'whatsapp', 'meeting', 'other'];
  if (isNew || data.method !== undefined) {
    if (!validMethods.includes(data.method)) {
      errors.push(`method must be one of: ${validMethods.join(', ')}`);
    }
  }
  if (isNew || data.interaction_date !== undefined) {
    if (!data.interaction_date) errors.push('interaction_date is required');
  }
  if (isNew || data.notes !== undefined) {
    if (!data.notes?.trim()) errors.push('notes is required');
  }
  return { valid: errors.length === 0, errors };
}

function validateUser(data, isNew = true) {
  const errors = [];
  if (isNew || data.email !== undefined) {
    if (!validateEmail(data.email)) errors.push('email is invalid');
  }
  if (isNew || data.password !== undefined) {
    if (!data.password || data.password.length < 10) {
      errors.push('password must be at least 10 characters');
    }
  }
  if (isNew || data.first_name !== undefined) {
    if (!data.first_name?.trim()) errors.push('first_name is required');
  }
  if (isNew || data.last_name !== undefined) {
    if (!data.last_name?.trim()) errors.push('last_name is required');
  }
  if (data.role !== undefined && !['admin', 'member'].includes(data.role)) {
    errors.push('role must be admin or member');
  }
  return { valid: errors.length === 0, errors };
}

/** Safely parse integer page/limit query params */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = {
  validateContact,
  validateCompany,
  validateInteraction,
  validateUser,
  parsePagination,
};
