// ══════════════════════════════════════════════════════════════
// STATE & PERSISTENCE
// ══════════════════════════════════════════════════════════════
const STORAGE_KEY = 'stitchWizardState_v2';

function defaultState() {
  return {
    currentStep: 1,
    data: {
      firstName: '', lastName: '', email: '', phone: '',
      linkedin: '', preferredContact: 'email', address: '', professionalSummary: '',
      experiences: [{ company: '', title: '', location: '', start_date: '', end_date: '', description: '' }],
      skills: []
    }
  };
}

let formState = defaultState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(formState));
}
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) { try { formState = JSON.parse(saved); } catch(e) { formState = defaultState(); } }
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  hydrateStep1();
  renderExperienceEntries();
  renderSkillsStep();
  renderSidebar();
  renderUI();
  bindStep1Inputs();

  document.getElementById('f-professionalSummary').addEventListener('input', e => {
    formState.data.professionalSummary = e.target.value;
    document.getElementById('summary-counter').textContent = e.target.value.length;
    saveState();
  });
  document.getElementById('f-preferredContact').addEventListener('change', e => {
    formState.data.preferredContact = e.target.value;
    saveState();
  });
  document.getElementById('skill-search-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = e.target.value.trim();
      if (name) { addSkill(name, true); e.target.value = ''; }
    }
  });
  document.getElementById('add-skill-manual-btn').addEventListener('click', () => addSkill('', false));
  document.getElementById('add-position-btn').addEventListener('click', addExperienceEntry);
  document.getElementById('prev-btn').addEventListener('click', handlePrev);
  document.getElementById('next-btn').addEventListener('click', handleNext);
  document.getElementById('reset-btn').addEventListener('click', handleReset);
});

// ══════════════════════════════════════════════════════════════
// STEP 1 — PERSONAL INFO
// ══════════════════════════════════════════════════════════════
function hydrateStep1() {
  const d = formState.data;
  ['firstName','lastName','email','phone','linkedin','address','professionalSummary'].forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) el.value = d[f] || '';
  });
  const pc = document.getElementById('f-preferredContact');
  if (pc) pc.value = d.preferredContact || 'email';
  document.getElementById('summary-counter').textContent = (d.professionalSummary || '').length;
}

function bindStep1Inputs() {
  ['firstName','lastName','email','phone','linkedin','address'].forEach(f => {
    const el = document.getElementById('f-' + f);
    if (!el) return;
    el.addEventListener('input', () => {
      formState.data[f] = el.value;
      saveState();
      clearInputError(el);
    });
  });
}

// ══════════════════════════════════════════════════════════════
// STEP 2 — EXPERIENCE
// ══════════════════════════════════════════════════════════════
function buildExperienceCard(exp, index) {
  const isFirst = index === 0;
  const div = document.createElement('div');
  div.className = 'experience-card bg-white p-lg rounded-lg border border-outline-variant space-y-md';
  div.dataset.expIndex = index;

  div.innerHTML = `
    ${!isFirst ? `
    <div class="flex justify-between items-center">
      <h3 class="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant">Position ${index + 1}</h3>
      <button type="button" class="remove-exp-btn text-error hover:bg-red-50 p-xs rounded-full transition-colors">
        <span class="material-symbols-outlined text-[20px]">delete</span>
      </button>
    </div>` : ''}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
      <div class="flex flex-col gap-xs">
        <label class="text-label-md text-on-surface">Company Name <span class="text-error">*</span></label>
        <input data-field="company" type="text" value="${esc(exp.company)}" placeholder="e.g. Goldman Sachs"
          class="exp-input p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all"/>
      </div>
      <div class="flex flex-col gap-xs">
        <label class="text-label-md text-on-surface">Job Title <span class="text-error">*</span></label>
        <input data-field="title" type="text" value="${esc(exp.title)}" placeholder="e.g. Senior Analyst"
          class="exp-input p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all"/>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
      <div class="flex flex-col gap-xs">
        <label class="text-label-md text-on-surface">Location</label>
        <input data-field="location" type="text" value="${esc(exp.location)}" placeholder="e.g. New York, NY"
          class="exp-input p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all"/>
      </div>
      <div class="grid grid-cols-2 gap-sm">
        <div class="flex flex-col gap-xs">
          <label class="text-label-md text-on-surface">Start Date</label>
          <input data-field="start_date" type="date" value="${esc(exp.start_date)}"
            class="exp-input p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all"/>
        </div>
        <div class="flex flex-col gap-xs">
          <label class="text-label-md text-on-surface">End Date</label>
          <input data-field="end_date" type="date" value="${esc(exp.end_date)}"
            class="exp-input p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all"/>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-xs">
      <div class="flex justify-between items-center">
        <label class="text-label-md text-on-surface">Description</label>
        <span class="desc-counter text-[10px] text-on-surface-variant font-mono">${(exp.description||'').length} / 500</span>
      </div>
      <textarea data-field="description" maxlength="500" rows="4"
        placeholder="Highlight your key achievements and responsibilities..."
        class="exp-input w-full p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all resize-none">${esc(exp.description)}</textarea>
    </div>
  `;

  const removeBtn = div.querySelector('.remove-exp-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      formState.data.experiences.splice(index, 1);
      if (!formState.data.experiences.length) {
        formState.data.experiences = [{ company:'',title:'',location:'',start_date:'',end_date:'',description:'' }];
      }
      saveState();
      renderExperienceEntries();
    });
  }

  div.querySelectorAll('.exp-input').forEach(input => {
    const field = input.dataset.field;
    input.addEventListener('input', () => {
      if (formState.data.experiences[index] !== undefined) {
        formState.data.experiences[index][field] = input.value;
        if (field === 'description') {
          div.querySelector('.desc-counter').textContent = `${input.value.length} / 500`;
        }
        saveState();
      }
    });
  });

  return div;
}

function renderExperienceEntries() {
  const container = document.getElementById('experience-entries');
  if (!container) return;
  container.innerHTML = '';
  formState.data.experiences.forEach((exp, i) => container.appendChild(buildExperienceCard(exp, i)));
}

function addExperienceEntry() {
  formState.data.experiences.push({ company:'',title:'',location:'',start_date:'',end_date:'',description:'' });
  saveState();
  renderExperienceEntries();
  setTimeout(() => {
    const cards = document.querySelectorAll('#experience-entries .experience-card');
    if (cards.length) cards[cards.length-1].scrollIntoView({ behavior:'smooth', block:'start' });
  }, 50);
}

// ══════════════════════════════════════════════════════════════
// STEP 3 — SKILLS
// ══════════════════════════════════════════════════════════════
function addSkill(name = '', fromSearch = false) {
  formState.data.skills.push({ name, proficiency: 'intermediate', yearsUsed: '' });
  saveState();
  renderSkillsStep();
  if (!fromSearch) {
    setTimeout(() => {
      const rows = document.querySelectorAll('#skills-list-container .skill-row');
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const nameInput = lastRow.querySelector('[data-field="name"]');
        if (nameInput && !nameInput.readOnly) nameInput.focus();
      }
    }, 50);
  }
  document.getElementById('skill-error').classList.add('hidden');
}

function renderSkillsStep() {
  const tagContainer = document.getElementById('selected-skills-tags');
  const listContainer = document.getElementById('skills-list-container');
  if (!tagContainer || !listContainer) return;

  tagContainer.innerHTML = '';
  listContainer.innerHTML = '';

  formState.data.skills.forEach((skill, i) => {
    // Tag chip (only if skill has a name)
    if (skill.name) {
      const tag = document.createElement('span');
      tag.className = 'skill-tag flex items-center gap-xs bg-secondary-container text-on-secondary-container px-sm py-xs rounded-full text-body-sm font-medium';
      tag.innerHTML = `${esc(skill.name)} <button type="button" class="hover:text-error transition-colors flex items-center"><span class="material-symbols-outlined text-sm">close</span></button>`;
      tag.querySelector('button').addEventListener('click', () => {
        formState.data.skills.splice(i, 1);
        saveState();
        renderSkillsStep();
      });
      tagContainer.appendChild(tag);
    }

    // Proficiency row
    const row = document.createElement('div');
    row.className = 'skill-row bg-surface-container-low p-md rounded-lg border border-outline-variant flex flex-col gap-md';
    const isNamed = !!skill.name;
    row.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div class="flex flex-col gap-xs">
          <label class="text-label-md text-on-surface">Skill Name</label>
          <input data-field="name" type="text" value="${esc(skill.name)}" placeholder="e.g. Python" ${isNamed ? 'readonly' : ''}
            class="p-sm border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all ${isNamed ? 'bg-surface-container' : 'bg-white'}"/>
        </div>
        <div class="flex flex-col gap-xs">
          <label class="text-label-md text-on-surface">Proficiency Level</label>
          <select data-field="proficiency"
            class="p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all">
            <option value="beginner" ${skill.proficiency==='beginner'?'selected':''}>Beginner</option>
            <option value="intermediate" ${skill.proficiency==='intermediate'?'selected':''}>Intermediate</option>
            <option value="advanced" ${skill.proficiency==='advanced'?'selected':''}>Advanced</option>
            <option value="expert" ${skill.proficiency==='expert'?'selected':''}>Expert</option>
          </select>
        </div>
      </div>
      <div class="flex items-end justify-between">
        <div class="flex flex-col gap-xs">
          <label class="text-label-md text-on-surface">Years Used</label>
          <input data-field="yearsUsed" type="number" min="0" value="${skill.yearsUsed||''}"
            class="p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all w-32"/>
        </div>
        <button type="button" class="remove-skill-btn p-sm text-error hover:bg-red-50 rounded-lg transition-colors flex items-center gap-xs">
          <span class="material-symbols-outlined text-sm">delete</span>
          <span class="text-label-md">Remove</span>
        </button>
      </div>
    `;

    row.querySelector('.remove-skill-btn').addEventListener('click', () => {
      formState.data.skills.splice(i, 1);
      saveState();
      renderSkillsStep();
    });

    row.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
        if (!formState.data.skills[i]) return;
        formState.data.skills[i][el.dataset.field] = el.value;
        saveState();
        if (el.dataset.field === 'name') {
          refreshTagsOnly();
        }
      });
    });

    listContainer.appendChild(row);
  });
}

function refreshTagsOnly() {
  const tagContainer = document.getElementById('selected-skills-tags');
  if (!tagContainer) return;
  tagContainer.innerHTML = '';
  formState.data.skills.forEach((skill, i) => {
    if (!skill.name) return;
    const tag = document.createElement('span');
    tag.className = 'skill-tag flex items-center gap-xs bg-secondary-container text-on-secondary-container px-sm py-xs rounded-full text-body-sm font-medium';
    tag.innerHTML = `${esc(skill.name)} <button type="button" class="hover:text-error transition-colors flex items-center"><span class="material-symbols-outlined text-sm">close</span></button>`;
    tag.querySelector('button').addEventListener('click', () => {
      formState.data.skills.splice(i, 1);
      saveState();
      renderSkillsStep();
    });
    tagContainer.appendChild(tag);
  });
}

// ══════════════════════════════════════════════════════════════
// STEP 4 — REVIEW
// ══════════════════════════════════════════════════════════════
const EXP_ICONS = ['account_balance','business','work','apartment','corporate_fare'];

function renderReview() {
  const container = document.getElementById('review-content');
  if (!container) return;
  const d = formState.data;
  const fullName = [d.firstName, d.lastName].filter(Boolean).join(' ');

  container.innerHTML = `
    <section>
      <div class="flex justify-between items-baseline border-b border-outline-variant pb-xs mb-sm">
        <h3 class="text-label-caps text-on-surface-variant uppercase tracking-widest">Personal Information</h3>
        <button type="button" onclick="jumpToStep(1)" class="text-secondary text-label-md font-bold hover:underline flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">edit</span> Edit
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div><p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Full Name</p><p class="text-on-surface text-body-sm mt-1">${fullName || '—'}</p></div>
        <div><p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Email Address</p><p class="text-on-surface text-body-sm mt-1">${d.email || '—'}</p></div>
        <div><p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Phone Number</p><p class="text-on-surface text-body-sm mt-1">${d.phone || '—'}</p></div>
        <div><p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">LinkedIn Profile</p><p class="text-secondary text-body-sm mt-1">${d.linkedin || 'Not provided'}</p></div>
        <div><p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Preferred Contact</p><p class="text-on-surface text-body-sm mt-1 capitalize">${d.preferredContact || 'Email'}</p></div>
        ${d.address ? `<div><p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Address</p><p class="text-on-surface text-body-sm mt-1">${d.address}</p></div>` : ''}
        ${d.professionalSummary ? `<div class="md:col-span-2"><p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Professional Summary</p><p class="text-on-surface text-body-sm leading-relaxed mt-1">${d.professionalSummary}</p></div>` : ''}
      </div>
    </section>

    <section>
      <div class="flex justify-between items-baseline border-b border-outline-variant pb-xs mb-sm">
        <h3 class="text-label-caps text-on-surface-variant uppercase tracking-widest">Professional Experience</h3>
        <button type="button" onclick="jumpToStep(2)" class="text-secondary text-label-md font-bold hover:underline flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">edit</span> Edit
        </button>
      </div>
      <div class="space-y-lg">
        ${d.experiences.filter(e => e.company || e.title).map((exp, i) => `
          <div class="flex gap-md">
            <div class="w-12 h-12 rounded bg-surface-container flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-primary">${EXP_ICONS[i % EXP_ICONS.length]}</span>
            </div>
            <div class="flex-1">
              <h4 class="text-label-md text-primary font-bold">${exp.title || '—'}</h4>
              <p class="text-body-sm text-on-surface-variant mb-xs">
                ${exp.company || ''}${exp.location ? ' · ' + exp.location : ''}${exp.start_date ? ' · ' + exp.start_date : ''}${exp.end_date ? ' – ' + exp.end_date : ''}
              </p>
              ${exp.description ? `<p class="text-on-surface text-body-sm leading-relaxed">${exp.description}</p>` : ''}
            </div>
          </div>
        `).join('') || '<p class="text-on-surface-variant text-body-sm">No experience added.</p>'}
      </div>
    </section>

    <section>
      <div class="flex justify-between items-baseline border-b border-outline-variant pb-xs mb-sm">
        <h3 class="text-label-caps text-on-surface-variant uppercase tracking-widest">Expertise &amp; Skills</h3>
        <button type="button" onclick="jumpToStep(3)" class="text-secondary text-label-md font-bold hover:underline flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">edit</span> Edit
        </button>
      </div>
      <div class="flex flex-wrap gap-xs pt-xs">
        ${d.skills.filter(s => s.name).map(s => `
          <span class="bg-surface-container-high text-primary px-sm py-xs rounded-full text-label-md">
            ${esc(s.name)}${s.proficiency ? ' · ' + s.proficiency : ''}${s.yearsUsed ? ' · ' + s.yearsUsed + ' yrs' : ''}
          </span>
        `).join('') || '<p class="text-on-surface-variant text-body-sm">No skills added.</p>'}
      </div>
    </section>
  `;
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════
const STEPS = [
  { num: 1, label: 'Personal Info' },
  { num: 2, label: 'Professional Work' },
  { num: 3, label: 'Expertise & Skills' },
  { num: 4, label: 'Review & Submit' }
];

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  const step = formState.currentStep;
  nav.innerHTML = STEPS.map(s => {
    const isDone = s.num < step;
    const isActive = s.num === step;
    return `
      <div class="flex items-center gap-sm p-sm rounded-lg cursor-pointer transition-colors
        ${isActive ? 'bg-white/10' : ''} ${!isDone && !isActive ? 'opacity-50' : ''}"
        onclick="jumpToStep(${s.num})">
        <div class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0
          ${isActive ? 'bg-secondary border-secondary text-white' : isDone ? 'border-secondary text-secondary' : 'border-on-primary-container text-white'}">
          ${isDone ? '<span class="material-symbols-outlined text-sm">check</span>' : s.num}
        </div>
        <div class="flex flex-col">
          <span class="text-[12px] text-on-primary-container uppercase font-bold tracking-widest">Step ${s.num}</span>
          <span class="text-[14px] font-medium">${s.label}</span>
        </div>
        ${isDone ? '<span class="material-symbols-outlined ml-auto text-sm text-secondary">check_circle</span>' : ''}
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// UI RENDER
// ══════════════════════════════════════════════════════════════
function renderUI() {
  const step = formState.currentStep;

  // Show/hide steps
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('step-' + i);
    if (!el) continue;
    if (i === step) {
      el.classList.remove('hidden-step');
      el.classList.add('active-step', 'step-fade');
    } else {
      el.classList.add('hidden-step');
      el.classList.remove('active-step', 'step-fade');
    }
  }

  // Back button
  const prevBtn = document.getElementById('prev-btn');
  prevBtn.style.visibility = step === 1 ? 'hidden' : 'visible';

  // Next/Submit button
  const nextBtn = document.getElementById('next-btn');
  const nextText = document.getElementById('next-btn-text');
  const nextIcon = document.getElementById('next-btn-icon');
  if (step === 4) {
    nextText.textContent = 'Submit Application';
    nextIcon.textContent = 'send';
    nextBtn.classList.remove('bg-secondary');
    nextBtn.classList.add('bg-primary');
  } else {
    nextText.textContent = 'Next';
    nextIcon.textContent = 'arrow_forward';
    nextBtn.classList.add('bg-secondary');
    nextBtn.classList.remove('bg-primary');
  }

  // Progress indicator (steps 3–4)
  const prog = document.getElementById('progress-indicator');
  if (step >= 3) {
    prog.classList.remove('hidden');
    prog.classList.add('flex');
    document.getElementById('progress-bar').style.width = (((step - 1) / 3) * 100) + '%';
    document.getElementById('progress-label').textContent = `Step ${step} of 4`;
  } else {
    prog.classList.add('hidden');
    prog.classList.remove('flex');
  }

  renderSidebar();
  if (step === 4) renderReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════
function handleNext() {
  if (formState.currentStep === 4) { handleSubmit(); return; }
  if (validateStep(formState.currentStep)) {
    formState.currentStep++;
    saveState();
    renderUI();
  }
}

function handlePrev() {
  if (formState.currentStep > 1) {
    formState.currentStep--;
    saveState();
    renderUI();
  }
}

function jumpToStep(s) {
  if (s <= formState.currentStep) {
    formState.currentStep = s;
    saveState();
    renderUI();
  }
}

function handleReset() {
  if (confirm('Start a fresh application? All progress will be lost.')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

// ══════════════════════════════════════════════════════════════
// SUBMIT & MODAL
// ══════════════════════════════════════════════════════════════
function handleSubmit() {
  const modal = document.getElementById('success-modal');
  const content = document.getElementById('modal-content');
  modal.classList.remove('hidden');
  setTimeout(() => {
    content.classList.remove('scale-95', 'opacity-0');
    content.classList.add('scale-100', 'opacity-100');
  }, 10);
}

function handleModalClose() {
  const modal = document.getElementById('success-modal');
  const content = document.getElementById('modal-content');
  content.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }, 300);
}

// ══════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════
function validateStep(step) {
  clearAllErrors();
  let valid = true;

  if (step === 1) {
    if (!formState.data.firstName.trim()) { markError('f-firstName'); valid = false; }
    if (!formState.data.lastName.trim()) { markError('f-lastName'); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.data.email)) { markError('f-email'); valid = false; }
    if (!/^\d{10}$/.test(formState.data.phone)) { markError('f-phone'); valid = false; }
  } else if (step === 2) {
    const hasValid = formState.data.experiences.some(e => e.company.trim() && e.title.trim());
    if (!hasValid) {
      const cards = document.querySelectorAll('#experience-entries .experience-card');
      if (cards.length) {
        cards[0].querySelectorAll('[data-field="company"],[data-field="title"]').forEach(el => {
          if (!el.value.trim()) el.classList.add('border-red-500');
        });
      }
      valid = false;
    }
  } else if (step === 3) {
    if (!formState.data.skills.some(s => s.name.trim())) {
      document.getElementById('skill-error').classList.remove('hidden');
      valid = false;
    }
  }

  return valid;
}

function markError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('border-red-500');
  const parent = el.closest('.flex-col');
  if (parent) { const msg = parent.querySelector('.error-msg'); if (msg) msg.classList.remove('hidden'); }
}

function clearInputError(el) {
  el.classList.remove('border-red-500');
  const parent = el.closest('.flex-col');
  if (parent) { const msg = parent.querySelector('.error-msg'); if (msg) msg.classList.add('hidden'); }
}

function clearAllErrors() {
  document.querySelectorAll('.error-msg').forEach(e => e.classList.add('hidden'));
  document.querySelectorAll('input,textarea,select').forEach(e => e.classList.remove('border-red-500'));
  const skillErr = document.getElementById('skill-error');
  if (skillErr) skillErr.classList.add('hidden');
}

// ══════════════════════════════════════════════════════════════
// UTIL
// ══════════════════════════════════════════════════════════════
function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
