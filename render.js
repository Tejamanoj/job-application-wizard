/**
 * DOM Rendering and UI Update functions for the Multi-Step Job Application Wizard.
 */

// Helper to convert camelCase to Title Case (e.g., "fullName" -> "Full Name")
function formatKey(key) {
  const result = key.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Updates the visibility of each step section with transition classes.
 * @param {number} currentStep - The step to display (1 to 4)
 */
export function renderStepVisibility(currentStep) {
  const sections = document.querySelectorAll('.step-section');
  sections.forEach((section) => {
    const stepNum = parseInt(section.dataset.step, 10);
    if (stepNum === currentStep) {
      section.classList.remove('hidden');
      // Force reflow for CSS animation
      void section.offsetWidth;
      section.classList.add('active');
    } else {
      section.classList.remove('active');
      section.classList.add('hidden');
    }
  });
}

/**
 * Updates the progress stepper at the top of the wizard.
 * @param {Object} formState - Single source of truth state
 * @param {Function} onStepClick - Callback when a stepper item is clicked
 */
export function renderStepper(formState, onStepClick) {
  const { currentStep, meta: { stepValidity } } = formState;
  const steps = document.querySelectorAll('.stepper-step');
  const progressBar = document.querySelector('.stepper-progress-bar-fill');

  // Update progress bar line
  // There are 4 steps, so 3 intervals. (currentStep - 1) / 3 * 100%
  const progressPercent = ((currentStep - 1) / 3) * 100;
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
  }

  steps.forEach((stepEl) => {
    const stepNum = parseInt(stepEl.dataset.step, 10);
    const circle = stepEl.querySelector('.step-circle');
    
    // Determine completed status:
    // A step is completed if it is less than currentStep, AND it is valid.
    // Or we can say a step is completed if its validity is true. Let's use the actual validity state.
    const isCompleted = stepNum < currentStep && stepValidity[stepNum] === true;
    const isCurrent = stepNum === currentStep;
    
    // Clear existing classes
    stepEl.classList.remove('completed', 'current', 'locked');
    circle.innerHTML = ''; // Clear contents

    if (isCompleted) {
      stepEl.classList.add('completed');
      circle.innerHTML = '&#10003;'; // Checkmark
      stepEl.style.cursor = 'pointer';
      // Enable direct click
      stepEl.onclick = () => onStepClick(stepNum);
    } else if (isCurrent) {
      stepEl.classList.add('current');
      circle.textContent = stepNum;
      stepEl.style.cursor = 'default';
      stepEl.onclick = null;
    } else {
      stepEl.classList.add('locked');
      circle.textContent = stepNum;
      stepEl.style.cursor = 'not-allowed';
      // If user went back to Step 1, Step 2 is still "valid" and completed.
      // Can they click it? Yes, we can allow clicking to any step that has been completed (validity verified).
      const hasCompletedBefore = stepValidity[stepNum] === true || (stepNum < currentStep);
      
      // The rule says: "Users can click "Back" or click directly on any already-completed step in the
      // progress indicator at any time... Users CANNOT jump forward to a locked step."
      // Let's check if the step before it is valid. In general, they can go forward only if all steps up to stepNum are valid.
      let canJump = true;
      for (let s = 1; s < stepNum; s++) {
        if (!stepValidity[s]) {
          canJump = false;
          break;
        }
      }

      if (canJump) {
        stepEl.classList.remove('locked');
        stepEl.classList.add('completed'); // show as completed/accessible
        stepEl.style.cursor = 'pointer';
        stepEl.onclick = () => onStepClick(stepNum);
      } else {
        stepEl.onclick = null;
      }
    }
  });
}

/**
 * Synchronizes inputs in the DOM with the state.
 * Only done for inputs on Step 1 and Step 2 since Step 3 is dynamic and Step 4 is read-only.
 * @param {Object} formState
 */
export function renderInputValues(formState) {
  const { personalInfo, experience } = formState;

  // Step 1
  for (const [key, val] of Object.entries(personalInfo)) {
    const input = document.getElementById(key);
    if (input) {
      input.value = val;
    }
  }

  // Step 2
  for (const [key, val] of Object.entries(experience)) {
    const input = document.getElementById(key);
    if (input) {
      input.value = val;
    }
  }

  // Update description counter
  renderDescriptionCounter(experience.description || '');
}

/**
 * Updates the description character counter.
 * @param {string} text
 */
export function renderDescriptionCounter(text) {
  const counter = document.getElementById('description-counter');
  if (counter) {
    const remaining = 500 - text.length;
    counter.textContent = `${text.length} / 500 characters (${remaining} remaining)`;
    if (remaining < 0) {
      counter.classList.add('error');
    } else {
      counter.classList.remove('error');
    }
  }
}

/**
 * Dynamically builds the skills list items.
 * @param {Object} formState - State containing the skills array
 * @param {Function} onRemoveSkill - Handler for deleting a skill
 * @param {Function} onSkillFieldChange - Handler for skill inputs modification
 * @param {Object} validationErrors - Errors for the skills step
 */
export function renderSkillsList(formState, onRemoveSkill, onSkillFieldChange, validationErrors = {}) {
  const container = document.getElementById('skills-container');
  if (!container) return;

  const skills = formState.skills || [];

  if (skills.length === 0) {
    container.innerHTML = `
      <div class="empty-skills-msg">
        <p>No skills added yet. Add at least one skill to proceed.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = ''; // Clear container

  skills.forEach((skill, index) => {
    // Find validation errors for this specific skill if any
    const skillErr = validationErrors.skills ? validationErrors.skills.find(e => e.id === skill.id) : null;

    const skillRow = document.createElement('div');
    skillRow.className = 'skill-entry';
    skillRow.dataset.id = skill.id;

    // Create unique field IDs for labeling/accessibility if needed
    const nameId = `skill-name-${skill.id}`;
    const proficiencyId = `skill-prof-${skill.id}`;
    const yearsId = `skill-years-${skill.id}`;

    skillRow.innerHTML = `
      <div class="skill-index-badge">${index + 1}</div>
      <div class="skill-fields-grid">
        <div class="form-group">
          <label for="${nameId}">Skill Name</label>
          <input 
            type="text" 
            id="${nameId}" 
            data-field="name" 
            class="form-input skill-input-field ${skillErr && skillErr.name ? 'input-error' : ''}" 
            placeholder="e.g. JavaScript"
            value="${skill.name || ''}"
          />
          ${skillErr && skillErr.name ? `<span class="error-msg">${skillErr.name}</span>` : ''}
        </div>

        <div class="form-group">
          <label for="${proficiencyId}">Proficiency</label>
          <select 
            id="${proficiencyId}" 
            data-field="proficiency" 
            class="form-select skill-input-field ${skillErr && skillErr.proficiency ? 'input-error' : ''}"
          >
            <option value="" disabled ${!skill.proficiency ? 'selected' : ''}>Select Proficiency</option>
            <option value="Beginner" ${skill.proficiency === 'Beginner' ? 'selected' : ''}>Beginner</option>
            <option value="Intermediate" ${skill.proficiency === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
            <option value="Advanced" ${skill.proficiency === 'Advanced' ? 'selected' : ''}>Advanced</option>
            <option value="Expert" ${skill.proficiency === 'Expert' ? 'selected' : ''}>Expert</option>
          </select>
          ${skillErr && skillErr.proficiency ? `<span class="error-msg">${skillErr.proficiency}</span>` : ''}
        </div>

        <div class="form-group">
          <label for="${yearsId}">Years Used</label>
          <input 
            type="number" 
            id="${yearsId}" 
            data-field="yearsUsed" 
            class="form-input skill-input-field ${skillErr && skillErr.yearsUsed ? 'input-error' : ''}" 
            placeholder="e.g. 3"
            min="0.1" 
            step="any"
            value="${skill.yearsUsed || ''}"
          />
          ${skillErr && skillErr.yearsUsed ? `<span class="error-msg">${skillErr.yearsUsed}</span>` : ''}
        </div>
      </div>
      
      <button type="button" class="btn-remove-skill" aria-label="Remove skill">&times;</button>
    `;

    // Bind change listeners to input elements inside this row
    skillRow.querySelectorAll('.skill-input-field').forEach((input) => {
      const handleValueChange = (e) => {
        const field = e.target.dataset.field;
        const value = e.target.value;
        onSkillFieldChange(skill.id, field, value);
      };

      input.addEventListener('input', handleValueChange);
      input.addEventListener('change', handleValueChange);
      
      // also on blur
      input.addEventListener('blur', (e) => {
        const field = e.target.dataset.field;
        onSkillFieldChange(skill.id, field, e.target.value, true);
      });
    });

    // Bind remove listener
    skillRow.querySelector('.btn-remove-skill').addEventListener('click', () => {
      onRemoveSkill(skill.id);
    });

    container.appendChild(skillRow);
  });
}

/**
 * Dynamically renders validation errors for Step 1 and Step 2.
 * @param {number} step - Current step
 * @param {Object} errors - Error dictionary from validation functions
 */
export function renderFormErrors(step, errors) {
  // Clear any existing global/field errors in current step
  const activeSection = document.querySelector(`.step-section[data-step="${step}"]`);
  if (!activeSection) return;

  // Clear visual error styles
  activeSection.querySelectorAll('.form-input').forEach((input) => {
    input.classList.remove('input-error');
    const existingMsg = input.nextElementSibling;
    if (existingMsg && existingMsg.classList.contains('error-msg')) {
      existingMsg.remove();
    }
  });

  // Clear generic error labels
  const genericError = activeSection.querySelector('.step-generic-error');
  if (genericError) {
    genericError.textContent = '';
    genericError.classList.add('hidden');
  }

  // Display new errors
  for (const [fieldName, errMsg] of Object.entries(errors)) {
    if (fieldName === 'general') {
      if (genericError && errMsg) {
        genericError.textContent = errMsg;
        genericError.classList.remove('hidden');
      }
      continue;
    }

    const input = activeSection.querySelector(`#${fieldName}`);
    if (input) {
      input.classList.add('input-error');
      const errSpan = document.createElement('span');
      errSpan.className = 'error-msg';
      errSpan.textContent = errMsg;
      input.insertAdjacentElement('afterend', errSpan);
    }
  }
}

/**
 * Dynamically builds the step 4 review contents by iterating formState.
 * ZERO hardcoded field values in review HTML.
 * @param {Object} formState
 * @param {Function} onEditStep - Callback to jump back to a step
 */
export function renderReview(formState, onEditStep) {
  const container = document.getElementById('review-content-container');
  if (!container) return;

  container.innerHTML = ''; // Clear review container

  // Exclude administrative/meta keys
  const reviewSections = [
    { key: 'personalInfo', title: 'Personal Information', stepNum: 1 },
    { key: 'experience', title: 'Professional Experience', stepNum: 2 },
    { key: 'skills', title: 'Technical Skills', stepNum: 3 }
  ];

  reviewSections.forEach((sec) => {
    const data = formState[sec.key];
    
    // Create card element for each section
    const sectionCard = document.createElement('div');
    sectionCard.className = 'review-section-card';

    // Header of review card with Edit link
    const headerDiv = document.createElement('div');
    headerDiv.className = 'review-section-header';
    headerDiv.innerHTML = `
      <h3>${sec.title}</h3>
      <button type="button" class="btn-edit-step" data-step="${sec.stepNum}">Edit</button>
    `;
    
    headerDiv.querySelector('.btn-edit-step').addEventListener('click', () => {
      onEditStep(sec.stepNum);
    });

    sectionCard.appendChild(headerDiv);

    // Body content list
    const contentBody = document.createElement('div');
    contentBody.className = 'review-section-body';

    if (Array.isArray(data)) {
      // Dynamic rendering for arrays (e.g. skills)
      if (data.length === 0) {
        contentBody.innerHTML = '<p class="empty-val">No entries added.</p>';
      } else {
        const table = document.createElement('table');
        table.className = 'review-table';
        
        // Generate headers dynamically based on first item's keys (excluding 'id')
        const firstItem = data[0];
        const displayKeys = Object.keys(firstItem).filter(k => k !== 'id');
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        displayKeys.forEach(key => {
          const th = document.createElement('th');
          th.textContent = formatKey(key);
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        data.forEach(item => {
          const row = document.createElement('tr');
          displayKeys.forEach(key => {
            const td = document.createElement('td');
            // Check for empty or falsy values to show placeholder
            td.textContent = item[key] !== undefined && item[key] !== '' ? item[key] : '—';
            row.appendChild(td);
          });
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        contentBody.appendChild(table);
      }
    } else if (typeof data === 'object' && data !== null) {
      // Dynamic rendering for object fields (e.g. personalInfo, experience)
      const list = document.createElement('dl');
      list.className = 'review-details-list';

      let hasFields = false;
      for (const [fieldKey, fieldVal] of Object.entries(data)) {
        hasFields = true;
        const dt = document.createElement('dt');
        dt.textContent = formatKey(fieldKey);
        
        const dd = document.createElement('dd');
        if (fieldVal && fieldVal.trim().length > 0) {
          // If value is long, allow proper line wraps (e.g. description)
          dd.textContent = fieldVal;
          if (fieldKey === 'description') {
            dd.style.whiteSpace = 'pre-wrap';
          }
        } else {
          dd.innerHTML = '<span class="empty-val">Not provided</span>';
        }

        list.appendChild(dt);
        list.appendChild(dd);
      }

      if (!hasFields) {
        contentBody.innerHTML = '<p class="empty-val">No information available.</p>';
      } else {
        contentBody.appendChild(list);
      }
    } else {
      contentBody.innerHTML = `<p>${data}</p>`;
    }

    sectionCard.appendChild(contentBody);
    container.appendChild(sectionCard);
  });
}

/**
 * Triggers a shake animation on the step container for error awareness.
 * @param {number} step
 */
export function shakeStepContainer(step) {
  const container = document.querySelector(`.step-section[data-step="${step}"]`);
  if (container) {
    container.classList.remove('shake');
    // Force browser reflow to restart animation
    void container.offsetWidth;
    container.classList.add('shake');
    // Remove class after animation completes (300ms)
    setTimeout(() => {
      container.classList.remove('shake');
    }, 300);
  }
}
