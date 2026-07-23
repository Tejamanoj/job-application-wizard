/**
 * Pure validation functions for the Multi-Step Job Application Wizard.
 * These functions operate solely on data passed to them and do not access the DOM.
 */

/**
 * Validates Step 1: Personal Info
 * @param {Object} personalInfo
 * @returns {Object} { valid: boolean, errors: Object }
 */
export function validateStep1(personalInfo) {
  const errors = {};
  const { fullName, email, phone } = personalInfo || {};

  // Full Name: required, min 2 chars
  if (!fullName || fullName.trim().length < 2) {
    errors.fullName = 'Full name is required and must be at least 2 characters.';
  }

  // Email: required, valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    errors.email = 'A valid email address is required.';
  }

  // Phone: required, 10 digits
  const phoneRegex = /^\d{10}$/;
  if (!phone || !phoneRegex.test(phone.trim())) {
    errors.phone = 'Phone number must be exactly 10 digits.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates Step 2: Experience
 * @param {Object} experience
 * @returns {Object} { valid: boolean, errors: Object }
 */
export function validateStep2(experience) {
  const errors = {};
  const { company, role, years, description } = experience || {};

  // Company Name: required
  if (!company || company.trim().length === 0) {
    errors.company = 'Company name is required.';
  }

  // Job Title: required
  if (!role || role.trim().length === 0) {
    errors.role = 'Job title is required.';
  }

  // Years of Experience: required, number, 0 to 50
  const yearsNum = Number(years);
  if (years === '' || years === undefined || isNaN(yearsNum) || yearsNum < 0 || yearsNum > 50) {
    errors.years = 'Years of experience must be a number between 0 and 50.';
  }

  // Description: optional, max 500 chars
  if (description && description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates Step 3: Skills
 * @param {Array} skills
 * @returns {Object} { valid: boolean, errors: Object }
 */
export function validateStep3(skills) {
  const errors = {
    general: '',
    skills: []
  };

  // Enforce: minimum 1 skill required
  if (!Array.isArray(skills) || skills.length === 0) {
    errors.general = 'Add at least one skill to continue.';
    return {
      valid: false,
      errors
    };
  }

  let allSkillsValid = true;

  skills.forEach((skill) => {
    const skillErrors = {};
    const { id, name, proficiency, yearsUsed } = skill;

    if (!name || name.trim().length === 0) {
      skillErrors.name = 'Skill name is required.';
    }

    const validProficiencies = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    if (!proficiency || !validProficiencies.includes(proficiency)) {
      skillErrors.proficiency = 'Please select a valid proficiency level.';
    }

    const yearsNum = Number(yearsUsed);
    if (yearsUsed === '' || yearsUsed === undefined || isNaN(yearsNum) || yearsNum <= 0) {
      skillErrors.yearsUsed = 'Years used must be a positive number greater than 0.';
    }

    if (Object.keys(skillErrors).length > 0) {
      skillErrors.id = id;
      errors.skills.push(skillErrors);
      allSkillsValid = false;
    }
  });

  return {
    valid: allSkillsValid,
    errors
  };
}
