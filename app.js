import { validateStep1, validateStep2, validateStep3 } from './validation.js';
import {
  renderStepVisibility,
  renderStepper,
  renderInputValues,
  renderSkillsList,
  renderFormErrors,
  renderReview,
  renderDescriptionCounter,
  shakeStepContainer
} from './render.js';

// Schema versioning for state migration
const STATE_VERSION = '1.0.0';
const STORAGE_KEY = `jobAppWizard_v${STATE_VERSION}`;

// Standard DEFAULT STATE
const DEFAULT_STATE = {
  currentStep: 1,
  personalInfo: { fullName: '', email: '', phone: '', address: '' },
  experience: { company: '', role: '', years: '', description: '' },
  skills: [],
  meta: {
    // Stores live validity of steps
    stepValidity: { 1: false, 2: false, 3: false }
  }
};

let formState = JSON.parse(JSON.stringify(DEFAULT_STATE));

// Fields to track if they've been touched (for showing inline error on blur)
const touchedFields = {
  personalInfo: {},
  experience: {},
  skills: {}
};

/**
 * Generate a robust unique ID for dynamic skill items
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Save current state to LocalStorage
 */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(formState));
}

/**
 * Load state from LocalStorage with version safety
 */
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Verify basic schema checks to ensure compatibility
      if (
        parsed &&
        typeof parsed.currentStep === 'number' &&
        parsed.personalInfo &&
        parsed.experience &&
        Array.isArray(parsed.skills) &&
        parsed.meta &&
        parsed.meta.stepValidity
      ) {
        formState = parsed;
      }
    }
  } catch (e) {
    console.error('Error parsing localStorage state, resetting to default.', e);
    formState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

/**
 * Validates the current state and updates stepValidity in meta.
 */
function validateState() {
  const v1 = validateStep1(formState.personalInfo);
  formState.meta.stepValidity[1] = v1.valid;

  const v2 = validateStep2(formState.experience);
  formState.meta.stepValidity[2] = v2.valid;

  const v3 = validateStep3(formState.skills);
  formState.meta.stepValidity[3] = v3.valid;
}

/**
 * Core Render Pipeline
 * Synchronizes the entire UI with the state object.
 */
function renderApp() {
  const currentStep = formState.currentStep;

  // 1. Display correct step section
  renderStepVisibility(currentStep);

  // 2. Render stepper progress
  renderStepper(formState, jumpToStep);

  // 3. Render inputs value
  renderInputValues(formState);

  // 4. Update footer button visibility
  updateFooterButtons();

  // 5. If Step 3: Render skills list
  if (currentStep === 3) {
    const v3 = validateStep3(formState.skills);
    // Only pass errors for fields that have been touched (blurred)
    const filteredErrors = filterTouchedSkillErrors(v3.errors);
    renderSkillsList(formState, removeSkill, onSkillFieldChange, filteredErrors);
    
    // Also display general error if step was validated once and skills is empty
    const generalErrEl = document.getElementById('skills-generic-error');
    if (generalErrEl) {
      if (touchedFields.skills.general && !v3.valid && v3.errors.general) {
        generalErrEl.textContent = v3.errors.general;
        generalErrEl.classList.remove('hidden');
      } else {
        generalErrEl.classList.add('hidden');
      }
    }
  }

  // 6. If Step 4: Render dynamic review details
  if (currentStep === 4) {
    renderReview(formState, jumpToStep);
  }

  // 7. Show inline validation errors for touched inputs in Step 1 or 2
  if (currentStep === 1) {
    const v1 = validateStep1(formState.personalInfo);
    const activeErrors = {};
    for (const key of Object.keys(v1.errors)) {
      if (touchedFields.personalInfo[key]) {
        activeErrors[key] = v1.errors[key];
      }
    }
    renderFormErrors(1, activeErrors);
  } else if (currentStep === 2) {
    const v2 = validateStep2(formState.experience);
    const activeErrors = {};
    for (const key of Object.keys(v2.errors)) {
      if (touchedFields.experience[key]) {
        activeErrors[key] = v2.errors[key];
      }
    }
    renderFormErrors(2, activeErrors);
  }
}

/**
 * Filter out validation errors for skill items/fields that haven't been touched yet
 */
function filterTouchedSkillErrors(rawErrors) {
  if (!rawErrors || !Array.isArray(rawErrors.skills)) return {};
  
  const filtered = {
    general: rawErrors.general,
    skills: []
  };

  rawErrors.skills.forEach((skillErr) => {
    const id = skillErr.id;
    const itemTouch = touchedFields.skills[id] || {};
    const filteredItemErr = {};

    for (const field of ['name', 'proficiency', 'yearsUsed']) {
      if (skillErr[field] && itemTouch[field]) {
        filteredItemErr[field] = skillErr[field];
      }
    }

    if (Object.keys(filteredItemErr).length > 0) {
      filteredItemErr.id = id;
      filtered.skills.push(filteredItemErr);
    }
  });

  return filtered;
}

/**
 * Show/Hide/Disable actions in the footer based on currentStep
 */
function updateFooterButtons() {
  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');
  const btnSubmit = document.getElementById('btn-submit');
  const footer = document.getElementById('wizard-footer');

  // If we are showing success screen, hide footer entirely
  if (document.getElementById('success-screen').classList.contains('hidden') === false) {
    footer.style.display = 'none';
    return;
  } else {
    footer.style.display = 'flex';
  }

  // Back button visibility
  if (formState.currentStep === 1) {
    btnBack.style.visibility = 'hidden';
  } else {
    btnBack.style.visibility = 'visible';
  }

  // Next vs Submit buttons toggling
  if (formState.currentStep === 4) {
    btnNext.classList.add('hidden');
    btnSubmit.classList.remove('hidden');
  } else {
    btnNext.classList.remove('hidden');
    btnSubmit.classList.add('hidden');
  }
}

/**
 * Handles Step-to-Step direct jumps (stepper and review edits)
 * @param {number} targetStep
 */
function jumpToStep(targetStep) {
  if (targetStep === formState.currentStep) return;

  // Navigation validation safety:
  // If moving forward, we must ensure all steps before the target are valid
  if (targetStep > formState.currentStep) {
    for (let s = formState.currentStep; s < targetStep; s++) {
      const stepValid = validateStep(s);
      if (!stepValid) {
        touchAllStepFields(s);
        renderApp();
        shakeStepContainer(s);
        return;
      }
    }
  }

  // Move freely
  formState.currentStep = targetStep;
  saveState();
  renderApp();
}

/**
 * Validates a single step data
 * @param {number} step
 * @returns {boolean}
 */
function validateStep(step) {
  if (step === 1) return validateStep1(formState.personalInfo).valid;
  if (step === 2) return validateStep2(formState.experience).valid;
  if (step === 3) return validateStep3(formState.skills).valid;
  return true;
}

/**
 * Touch all fields on a specific step to force error messages to render
 * @param {number} step
 */
function touchAllStepFields(step) {
  if (step === 1) {
    for (const key of Object.keys(formState.personalInfo)) {
      touchedFields.personalInfo[key] = true;
    }
  } else if (step === 2) {
    for (const key of Object.keys(formState.experience)) {
      touchedFields.experience[key] = true;
    }
  } else if (step === 3) {
    touchedFields.skills.general = true;
    formState.skills.forEach((skill) => {
      touchedFields.skills[skill.id] = {
        name: true,
        proficiency: true,
        yearsUsed: true
      };
    });
  }
}

/* ==========================================================================
   State & Event Actions
   ========================================================================== */

/**
 * Step 3 Skills Addition Action
 */
function addSkill() {
  const newSkill = {
    id: generateId(),
    name: '',
    proficiency: '',
    yearsUsed: ''
  };
  formState.skills.push(newSkill);
  
  // Set initialized touch states for the new skill (don't flag as error immediately until blur)
  touchedFields.skills[newSkill.id] = {
    name: false,
    proficiency: false,
    yearsUsed: false
  };

  validateState();
  saveState();
  renderApp();

  // Focus the name field of the new skill row
  setTimeout(() => {
    const input = document.getElementById(`skill-name-${newSkill.id}`);
    if (input) input.focus();
  }, 50);
}

/**
 * Step 3 Skills Removal Action
 * @param {string} id
 */
function removeSkill(id) {
  formState.skills = formState.skills.filter(s => s.id !== id);
  delete touchedFields.skills[id];

  // If user has touched the skills view, keep general error visible
  touchedFields.skills.general = true;

  validateState();
  saveState();
  renderApp();
}

/**
 * Step 3 skill entry modification callback
 */
function onSkillFieldChange(skillId, field, value, runValidationOnly = false) {
  if (!runValidationOnly && field) {
    const skill = formState.skills.find(s => s.id === skillId);
    if (skill) {
      skill[field] = value;
    }
  }

  // Flag that field as touched
  if (field) {
    if (!touchedFields.skills[skillId]) {
      touchedFields.skills[skillId] = {};
    }
    touchedFields.skills[skillId][field] = true;
  } else if (runValidationOnly) {
    // If runValidationOnly, flag all elements inside this skill row as touched
    if (!touchedFields.skills[skillId]) {
      touchedFields.skills[skillId] = {};
    }
    touchedFields.skills[skillId].name = true;
    touchedFields.skills[skillId].proficiency = true;
    touchedFields.skills[skillId].yearsUsed = true;
  }

  validateState();
  saveState();

  // Optimized render: only update inline error in DOM if field is specified,
  // preventing losing focus by completely rebuilding the skill inputs.
  if (field) {
    const v3 = validateStep3(formState.skills);
    const skillErr = v3.errors.skills ? v3.errors.skills.find(e => e.id === skillId) : null;
    const errorMsg = skillErr ? skillErr[field] : null;

    const skillRow = document.querySelector(`.skill-entry[data-id="${skillId}"]`);
    if (skillRow) {
      const inputEl = skillRow.querySelector(`[data-field="${field}"]`);
      if (inputEl) {
        const existingMsg = inputEl.nextElementSibling;
        if (!errorMsg) {
          inputEl.classList.remove('input-error');
          if (existingMsg && existingMsg.classList.contains('error-msg')) {
            existingMsg.remove();
          }
        } else {
          inputEl.classList.add('input-error');
          if (existingMsg && existingMsg.classList.contains('error-msg')) {
            existingMsg.textContent = errorMsg;
          } else {
            const errSpan = document.createElement('span');
            errSpan.className = 'error-msg';
            errSpan.textContent = errorMsg;
            inputEl.insertAdjacentElement('afterend', errSpan);
          }
        }
      }
    }
    
    // Check if the overall Step 3 is valid and update stepper in background
    renderStepper(formState, jumpToStep);
  } else {
    renderApp();
  }
}

/**
 * Main Form Step Navigation: Next Page
 */
function handleNext() {
  const current = formState.currentStep;
  const isStepValid = validateStep(current);

  if (isStepValid) {
    formState.currentStep = current + 1;
    saveState();
    renderApp();
  } else {
    // Highlight all errors and perform shake
    touchAllStepFields(current);
    renderApp();
    shakeStepContainer(current);
  }
}

/**
 * Main Form Step Navigation: Back Page
 */
function handleBack() {
  if (formState.currentStep > 1) {
    formState.currentStep--;
    saveState();
    renderApp();
  }
}

/**
 * Submit Action with Simulated Latency & Success screen
 */
function handleSubmit() {
  // Validate everything first
  const v1 = validateStep(1);
  const v2 = validateStep(2);
  const v3 = validateStep(3);

  if (!v1 || !v2 || !v3) {
    // Go to first invalid step
    if (!v1) jumpToStep(1);
    else if (!v2) jumpToStep(2);
    else if (!v3) jumpToStep(3);
    return;
  }

  const btnSubmit = document.getElementById('btn-submit');
  const btnBack = document.getElementById('btn-back');
  const originalText = btnSubmit.innerHTML;

  // Apply loading state
  btnSubmit.disabled = true;
  btnBack.disabled = true;
  btnSubmit.innerHTML = `<span class="spinner" aria-hidden="true"></span> Submitting...`;

  setTimeout(() => {
    // Log finalized object
    console.log('Application Form Submitted Successfully:', JSON.parse(JSON.stringify(formState)));

    // Clear wizard elements
    document.querySelectorAll('.step-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelector('.stepper-container').style.display = 'none';
    
    // Display success panel
    const successScreen = document.getElementById('success-screen');
    successScreen.classList.remove('hidden');

    // Update buttons state
    btnSubmit.disabled = false;
    btnBack.disabled = false;
    btnSubmit.innerHTML = originalText;
    updateFooterButtons();
    
    // Reset state & localStorage
    localStorage.removeItem(STORAGE_KEY);
    formState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }, 800);
}

/**
 * Complete Hard Reset of the state
 */
function startOver() {
  const proceed = confirm('Are you sure you want to start over? All entered information will be permanently discarded.');
  if (proceed) {
    localStorage.removeItem(STORAGE_KEY);
    formState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    
    // Reset touched logs
    touchedFields.personalInfo = {};
    touchedFields.experience = {};
    touchedFields.skills = {};

    // Restore view settings
    document.querySelector('.stepper-container').style.display = 'block';
    document.getElementById('success-screen').classList.add('hidden');

    validateState();
    saveState();
    renderApp();
  }
}

/**
 * Restarts wizard after success submit screen
 */
function restartWizard() {
  localStorage.removeItem(STORAGE_KEY);
  formState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  
  touchedFields.personalInfo = {};
  touchedFields.experience = {};
  touchedFields.skills = {};

  document.querySelector('.stepper-container').style.display = 'block';
  document.getElementById('success-screen').classList.add('hidden');

  validateState();
  saveState();
  renderApp();
}

/* ==========================================================================
   Initialization & Input Binding
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Load local state
  loadState();

  // Validate state to ensure status elements match loaded values
  validateState();

  // Render initial application
  renderApp();

  // Event Listeners: Navigation
  document.getElementById('btn-next').addEventListener('click', handleNext);
  document.getElementById('btn-back').addEventListener('click', handleBack);
  document.getElementById('btn-submit').addEventListener('click', handleSubmit);
  document.getElementById('btn-start-over').addEventListener('click', startOver);
  document.getElementById('btn-restart-wizard').addEventListener('click', restartWizard);

  // Event Listeners: Step 3 Add Skill
  document.getElementById('btn-add-skill').addEventListener('click', addSkill);

  // Bind input listeners for Step 1
  const step1Inputs = ['fullName', 'email', 'phone', 'address'];
  step1Inputs.forEach((fieldName) => {
    const input = document.getElementById(fieldName);
    if (input) {
      input.addEventListener('input', (e) => {
        formState.personalInfo[fieldName] = e.target.value;
        validateState();
        saveState();
        
        // If this field was already touched, dynamically update inline error display
        if (touchedFields.personalInfo[fieldName]) {
          const v1 = validateStep1(formState.personalInfo);
          const errorMsg = v1.errors[fieldName];
          const existingMsg = input.nextElementSibling;
          if (!errorMsg) {
            input.classList.remove('input-error');
            if (existingMsg && existingMsg.classList.contains('error-msg')) {
              existingMsg.remove();
            }
          } else {
            input.classList.add('input-error');
            if (existingMsg && existingMsg.classList.contains('error-msg')) {
              existingMsg.textContent = errorMsg;
            } else {
              const errSpan = document.createElement('span');
              errSpan.className = 'error-msg';
              errSpan.textContent = errorMsg;
              input.insertAdjacentElement('afterend', errSpan);
            }
          }
        }
        
        // Update stepper indicator status in real time
        renderStepper(formState, jumpToStep);
      });

      input.addEventListener('blur', () => {
        touchedFields.personalInfo[fieldName] = true;
        validateState();
        saveState();
        renderApp();
      });
    }
  });

  // Bind input listeners for Step 2
  const step2Inputs = ['company', 'role', 'years', 'description'];
  step2Inputs.forEach((fieldName) => {
    const input = document.getElementById(fieldName);
    if (input) {
      input.addEventListener('input', (e) => {
        formState.experience[fieldName] = e.target.value;
        if (fieldName === 'description') {
          renderDescriptionCounter(e.target.value);
        }
        validateState();
        saveState();
        
        // If this field was already touched, dynamically update inline error display
        if (touchedFields.experience[fieldName]) {
          const v2 = validateStep2(formState.experience);
          const errorMsg = v2.errors[fieldName];
          const existingMsg = input.nextElementSibling;
          if (!errorMsg) {
            input.classList.remove('input-error');
            if (existingMsg && existingMsg.classList.contains('error-msg')) {
              existingMsg.remove();
            }
          } else {
            input.classList.add('input-error');
            if (existingMsg && existingMsg.classList.contains('error-msg')) {
              existingMsg.textContent = errorMsg;
            } else {
              const errSpan = document.createElement('span');
              errSpan.className = 'error-msg';
              errSpan.textContent = errorMsg;
              input.insertAdjacentElement('afterend', errSpan);
            }
          }
        }
        
        // Update stepper indicator status in real time
        renderStepper(formState, jumpToStep);
      });

      input.addEventListener('blur', () => {
        touchedFields.experience[fieldName] = true;
        validateState();
        saveState();
        renderApp();
      });
    }
  });
});
