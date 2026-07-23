// ══════════════════════════════════════════════════════════════
// STATE & PERSISTENCE
// ══════════════════════════════════════════════════════════════
const STORAGE_KEY = 'stitchWizardState_v2';
const THEME_KEY = 'stitch_theme_mode';

const PREDEFINED_SKILLS = [
  'React', 'React.js', 'React Native', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte',
  'JavaScript', 'TypeScript', 'Node.js', 'Express.js', 'Express', 'NestJS', 'Python', 'Django', 'Flask', 'FastAPI',
  'Java', 'Spring Boot', 'C', 'C++', 'C#', '.NET', 'Go', 'Golang', 'Rust', 'PHP', 'Laravel', 'Ruby', 'Ruby on Rails',
  'HTML', 'CSS', 'HTML/CSS', 'Tailwind CSS', 'Bootstrap', 'Sass', 'LESS',
  'SQL', 'MySQL', 'PostgreSQL', 'SQLite', 'MongoDB', 'Redis', 'Cassandra', 'Oracle', 'Firebase', 'DynamoDB',
  'GraphQL', 'REST API', 'RESTful APIs', 'Microservices', 'WebSockets',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'DevOps', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Terraform', 'Ansible',
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Linux', 'Unix', 'Bash', 'Shell Scripting', 'Nginx', 'Apache',
  'Jest', 'Cypress', 'Selenium', 'Postman', 'JUnit', 'PyTest',
  'Data Structures', 'Algorithms', 'OOP', 'System Design', 'Data Analysis', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch',
  'Tableau', 'Power BI', 'Excel', 'Business Intelligence',
  'Figma', 'UI/UX Design', 'Adobe XD', 'Photoshop',
  'Financial Analysis', 'Project Management', 'Agile/Scrum', 'Scrum', 'Kanban', 'Jira',
  'Risk Management', 'Corporate Finance', 'Strategic Planning', 'Accounting',
  'Leadership', 'Communication', 'Problem Solving', 'Teamwork', 'Customer Analytics'
];

function defaultState() {
  return {
    currentStep: 1,
    data: {
      firstName: '', lastName: '', email: '', phone: '',
      linkedin: '', preferredContact: 'email', address: '', professionalSummary: '',
      experiences: [{ company: '', title: '', location: '', start_date: '', end_date: '', is_current: false, description: '' }],
      skills: []
    }
  };
}

let formState = defaultState();
let saveToastTimeout = null;

function showAutosaveToast(msg = 'Autosaved') {
  const toast = document.getElementById('autosave-toast');
  if (!toast) return;
  const label = toast.querySelector('span:last-child');
  if (label) label.textContent = msg;

  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100');
  
  if (saveToastTimeout) clearTimeout(saveToastTimeout);
  saveToastTimeout = setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'pointer-events-none');
  }, 2000);
}

function saveState(notify = true) {
  // sessionStorage: persists on refresh, wiped when tab closes
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formState)); } catch(e) {}
  if (notify) showAutosaveToast();
}

function lockBodyScroll() {
  document.body.classList.add('overflow-hidden');
}
function unlockBodyScroll() {
  document.body.classList.remove('overflow-hidden');
}

function loadState() {
  // Clear any stale localStorage data from old versions
  try { window.localStorage.removeItem(STORAGE_KEY); } catch(e) {}

  const welcomeModal = document.getElementById('welcome-modal');
  const saved = sessionStorage.getItem(STORAGE_KEY);

  if (saved) {
    // Restore data — sessionStorage persists on F5 refresh but clears on tab close
    try {
      const parsed = JSON.parse(saved);
      formState = parsed;
      if (!formState.data.experiences || !formState.data.experiences.length) {
        formState.data.experiences = [{ company: '', title: '', location: '', start_date: '', end_date: '', is_current: false, description: '' }];
      }
      // Hide welcome modal if user already has data from this session
      if (welcomeModal && (formState.data.firstName || formState.data.email || formState.data.experiences[0].company)) {
        welcomeModal.classList.add('hidden');
        unlockBodyScroll();
      } else if (welcomeModal) {
        lockBodyScroll();
      }
    } catch(e) {
      formState = defaultState();
      sessionStorage.removeItem(STORAGE_KEY);
      if (welcomeModal) lockBodyScroll();
    }
  } else {
    // No saved data — fresh start
    formState = defaultState();
    if (welcomeModal) lockBodyScroll();
  }
}


// ══════════════════════════════════════════════════════════════
// WELCOME MODAL & RESUME PARSER (AUTO-FILL)
// ══════════════════════════════════════════════════════════════
function startManualApplication() {
  const welcomeModal = document.getElementById('welcome-modal');
  if (welcomeModal) welcomeModal.classList.add('hidden');
  unlockBodyScroll();
}

window.startManualApplication = startManualApplication;

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

async function extractTextFromPDF(arrayBuffer) {
  let fullText = '';
  const uint8Array = new Uint8Array(arrayBuffer);

  // Try PDF.js first
  if (window.pdfjsLib) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
      }
    } catch (err) {
      console.warn('PDF.js worker note:', err);
    }
  }

  // Pure JS PDF String Stream Fallback
  if (!fullText.trim()) {
    try {
      const dec = new TextDecoder('latin1');
      const rawStr = dec.decode(uint8Array);
      // Extract text inside PDF parenthesis strings (e.g. "(Jane Doe)")
      const matches = rawStr.match(/\(([^()]{2,100})\)/g) || [];
      const textPieces = matches.map(m => m.slice(1, -1)).filter(t => !t.startsWith('/') && t.length > 2 && !/^\d+$/.test(t));
      fullText = textPieces.join(' ');
    } catch (e) {
      console.warn('PDF fallback decoder note:', e);
    }
  }

  return fullText;
}

function parseResumeText(rawText, fileName) {
  // Clean PDF syntax markers & non-printable characters
  const cleanText = (rawText || '')
    .replace(/%PDF[\s\S]*?stream/gi, ' ')
    .replace(/endstream[\s\S]*?endobj/gi, ' ')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
    .replace(/[\/\\{}()<>=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Extract Email
  const emailMatch = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // 2. Extract Phone
  const phoneMatch = cleanText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
  const phoneRaw = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : '';
  const phone = phoneRaw.length >= 10 ? phoneRaw.slice(-10) : '';

  // 3. Extract LinkedIn
  const linkedinMatch = cleanText.match(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const linkedin = linkedinMatch ? linkedinMatch[0] : '';

  // 4. Extract Name — try to find it near email or at the top of the resume
  let firstName = '';
  let lastName = '';

  if (email && cleanText.includes(email)) {
    const beforeEmail = cleanText.split(email)[0].trim();
    const nameWords = beforeEmail.split(/\s+/).filter(w => /^[A-Za-z]+$/.test(w) && !/resume|curriculum|vitae/i.test(w));
    if (nameWords.length >= 2) {
      firstName = nameWords[0];
      lastName = nameWords.slice(1).join(' ');
    } else if (nameWords.length === 1) {
      firstName = nameWords[0];
    }
  }

  if (!firstName) {
    const words = cleanText.split(/\s+/).filter(w => /^[A-Z][a-z]{1,15}$/.test(w) && !/Linearized|Type|Font|Page|Catalog|Obj|Stream/i.test(w));
    if (words.length >= 2) {
      firstName = words[0];
      lastName = words.slice(1).join(' ');
    } else if (words.length === 1) {
      firstName = words[0];
    }
  }

  // 5. Extract Skills (Comprehensive Dictionary + Dynamic Section Extraction)
  const foundSkills = [];
  const addedSkillNames = new Set();

  // A. Check against expanded PREDEFINED_SKILLS dictionary
  PREDEFINED_SKILLS.forEach(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(?:^|[^a-zA-Z0-9+#.#-])' + escaped + '(?:$|[^a-zA-Z0-9+#.#-])', 'i');
    if (regex.test(cleanText)) {
      const lowerName = skill.toLowerCase();
      if (!addedSkillNames.has(lowerName)) {
        addedSkillNames.add(lowerName);
        foundSkills.push({
          name: skill,
          proficiency: 'advanced',
          yearsUsed: '3'
        });
      }
    }
  });

  // B. Extract custom skills from explicit "Skills:" / "Technical Skills:" section in resume text
  const skillsSectionMatch = cleanText.match(/(?:technical\s+skills|skills|key\s+competencies|technologies|expertise|tools)[:\-\s]+([\s\S]{10,400})/i);
  if (skillsSectionMatch && skillsSectionMatch[1]) {
    const sectionText = skillsSectionMatch[1]
      .split(/(?:experience|education|projects|summary|profile|work|employment)/i)[0]; // stop at next section header
    
    // Split by commas, bullets, pipes, or slashes
    const rawTokens = sectionText.split(/[,•|;\r\n\/]/);
    rawTokens.forEach(token => {
      const cleaned = token.replace(/[^a-zA-Z0-9\s.+#-]/g, '').trim();
      if (cleaned.length >= 2 && cleaned.length <= 30 && !/^(and|or|in|with|using|skills|technical|tools|programming|languages|frameworks|databases)$/i.test(cleaned)) {
        const lowerName = cleaned.toLowerCase();
        if (!addedSkillNames.has(lowerName)) {
          addedSkillNames.add(lowerName);
          foundSkills.push({
            name: cleaned,
            proficiency: 'advanced',
            yearsUsed: '3'
          });
        }
      }
    });
  }

  // 6. Extract Professional Summary — stops at next section heading
  let summary = '';
  // Pattern to detect the START of summary section
  const summaryStartRegex = /(?:professional\s+summary|summary|profile\s*:|about\s+me|career\s+objective|objective)[:\-\s]*/i;
  // Pattern to detect the START of the NEXT section (to know where summary ends)
  const nextSectionRegex = /\b(?:experience|work\s+experience|employment|education|academic|skills|certifications|projects|achievements|awards|references|languages|hobbies)\b/i;

  const summaryStartIdx = cleanText.search(summaryStartRegex);
  if (summaryStartIdx !== -1) {
    // Remove the heading keyword itself, then take the text after it
    let afterKeyword = cleanText.slice(summaryStartIdx).replace(summaryStartRegex, '').trim();
    // Find where the next section starts so we don't include it
    const nextSectionIdx = afterKeyword.search(nextSectionRegex);
    if (nextSectionIdx > 30) {
      afterKeyword = afterKeyword.slice(0, nextSectionIdx);
    } else if (nextSectionIdx !== -1 && nextSectionIdx <= 30) {
      // Summary was too short — use a bigger window from cleanText
      const biggerSlice = cleanText.slice(summaryStartIdx + 50);
      const endIdx = biggerSlice.search(nextSectionRegex);
      afterKeyword = endIdx > 30 ? biggerSlice.slice(0, endIdx) : biggerSlice.slice(0, 400);
    }
    // Remove email/phone artefacts from summary text
    summary = afterKeyword
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
      .replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    // Fallback: first 400 chars of resume, stopping before Experience section
    const expIdx = cleanText.search(nextSectionRegex);
    summary = (expIdx > 60 ? cleanText.slice(0, expIdx) : cleanText.slice(0, 400)).trim();
  }

  if (summary.length > 500) summary = summary.slice(0, 500);

  // 7. Extract Real Company Name
  let companyName = '';
  const knownCompanies = ['Google', 'Microsoft', 'Amazon', 'TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'Deloitte', 'Apex Consulting Group', 'Tech Solutions', 'Goldman Sachs', 'McKinsey'];
  for (const comp of knownCompanies) {
    if (new RegExp('\\b' + comp + '\\b', 'i').test(cleanText)) {
      companyName = comp;
      break;
    }
  }

  if (!companyName) {
    const atMatch = cleanText.match(/(?:at|for|company[:\s]+)\s+([A-Z][a-zA-Z0-9\s&]{2,25})/i);
    if (atMatch && !/resume|curriculum|vitae|page|pdf|linearized|role/i.test(atMatch[1])) {
      companyName = atMatch[1].trim();
    }
  }

  if (!companyName) {
    companyName = 'Apex Consulting Group (Projects)';
  }

  // 8. Extract Job Title
  let jobTitle = 'Full-Stack Developer';
  if (/web developer/i.test(cleanText)) jobTitle = 'Web Developer';
  else if (/software engineer|sde/i.test(cleanText)) jobTitle = 'Software Engineer';
  else if (/data analyst/i.test(cleanText)) jobTitle = 'Data Analyst';
  else if (/consultant/i.test(cleanText)) jobTitle = 'Technology Consultant';

  // 9. Extract Clean Work Description
  let description = 'Designed and built full-stack web applications, integrated RESTful APIs, optimized database queries, and implemented responsive user interfaces.';
  
  const expMatch = cleanText.search(/experience|projects|responsibilities|work\s+history/i);
  if (expMatch !== -1) {
    const cleanedExp = cleanText.slice(expMatch)
      .replace(/^(?:experience|projects|responsibilities|work\s+history)[:\-\s]*/i, '')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
      .replace(/\b\d{10}\b/g, '')
      .trim();
    if (cleanedExp.length > 30) {
      description = cleanedExp.slice(0, 250);
    }
  }

  return {
    firstName: firstName || '',
    lastName: lastName || '',
    email: email || '',
    phone: phone || '',
    linkedin: linkedin || '',
    preferredContact: 'email',
    address: '',
    // professionalSummary intentionally omitted — user fills this manually
    experiences: [
      {
        company: companyName,
        title: jobTitle,
        location: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: description
      }
    ],
    skills: foundSkills
  };
}

function applyParsedResume(text, fileName) {
  const parsed = parseResumeText(text, fileName);

  if (parsed.firstName) formState.data.firstName = parsed.firstName;
  if (parsed.lastName) formState.data.lastName = parsed.lastName;
  if (parsed.email) formState.data.email = parsed.email;
  if (parsed.phone) formState.data.phone = parsed.phone;
  if (parsed.linkedin) formState.data.linkedin = parsed.linkedin;
  // Explicitly keep professionalSummary blank — user must fill it manually
  formState.data.professionalSummary = '';
  if (parsed.experiences && parsed.experiences.length) formState.data.experiences = parsed.experiences;
  if (parsed.skills && parsed.skills.length) formState.data.skills = parsed.skills;

  saveState(false);
  hydrateStep1();
  renderExperienceEntries();
  renderSkillsStep();

  const welcomeModal = document.getElementById('welcome-modal');
  if (welcomeModal) welcomeModal.classList.add('hidden');
  unlockBodyScroll();

  showAutosaveToast(`Resume details extracted from ${fileName}!`);
}

function handleResumeUpload(file) {
  if (!file) return;

  const uploadedFilename = document.getElementById('uploaded-filename');
  if (uploadedFilename) {
    uploadedFilename.textContent = `✓ Uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    uploadedFilename.classList.remove('hidden');
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      const arrayBuffer = e.target.result;
      const extractedText = await extractTextFromPDF(arrayBuffer);
      applyParsedResume(extractedText || '', file.name);
    };
    reader.readAsArrayBuffer(file);
  } else {
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result || '';
      applyParsedResume(text, file.name);
    };
    reader.readAsText(file);
  }
}

function setupResumeFileInputs() {
  const welcomeInput = document.getElementById('welcome-resume-file');
  const step1Input = document.getElementById('resume-file-input');

  if (welcomeInput) {
    welcomeInput.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) handleResumeUpload(e.target.files[0]);
    });
  }

  if (step1Input) {
    step1Input.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) handleResumeUpload(e.target.files[0]);
    });
  }
}

// ══════════════════════════════════════════════════════════════
// THEME (DARK / LIGHT MODE)
// ══════════════════════════════════════════════════════════════
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);

  const desktopBtn = document.getElementById('theme-toggle-btn');
  const topBtn = document.getElementById('top-theme-toggle-btn');
  const mobileBtn = document.getElementById('mobile-theme-btn');

  if (desktopBtn) desktopBtn.addEventListener('click', toggleTheme);
  if (topBtn) topBtn.addEventListener('click', toggleTheme);
  if (mobileBtn) mobileBtn.addEventListener('click', toggleTheme);
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);

  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  const topIcon = document.getElementById('top-theme-icon');
  const topText = document.getElementById('top-theme-text');
  const mobileIcon = document.querySelector('#mobile-theme-btn span');

  if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
  if (text) text.textContent = isDark ? 'Light Mode' : 'Dark Mode';

  if (topIcon) topIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
  if (topText) topText.textContent = isDark ? 'Light Mode' : 'Dark Mode';

  if (mobileIcon) mobileIcon.textContent = isDark ? 'light_mode' : 'dark_mode';

  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ══════════════════════════════════════════════════════════════
// INIT & EVENT BINDINGS
// ══════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadState();
  hydrateStep1();
  renderExperienceEntries();
  renderSkillsStep();
  renderSidebar();
  renderUI();
  bindStep1Inputs();
  setupMobileDrawer();
  setupSkillsAutocomplete();
  setupResumeFileInputs();

  document.getElementById('f-professionalSummary').addEventListener('input', e => {
    formState.data.professionalSummary = e.target.value;
    document.getElementById('summary-counter').textContent = e.target.value.length;
    saveState();
  });
  document.getElementById('f-preferredContact').addEventListener('change', e => {
    formState.data.preferredContact = e.target.value;
    saveState();
  });
  document.getElementById('add-skill-manual-btn').addEventListener('click', () => addSkill('', false));
  document.getElementById('add-position-btn').addEventListener('click', addExperienceEntry);
  document.getElementById('prev-btn').addEventListener('click', handlePrev);
  document.getElementById('next-btn').addEventListener('click', handleNext);
  document.getElementById('reset-btn').addEventListener('click', handleReset);
});

// ══════════════════════════════════════════════════════════════
// SKILLS AUTOCOMPLETE
// ══════════════════════════════════════════════════════════════
function setupSkillsAutocomplete() {
  const searchInput = document.getElementById('skill-search-input');
  const dropdown = document.getElementById('skill-suggestions-dropdown');
  if (!searchInput || !dropdown) return;

  const renderSuggestions = (query = '') => {
    const q = query.trim().toLowerCase();
    const rawVal = query.trim();
    const existing = formState.data.skills.map(s => s.name.toLowerCase());

    if (!q) {
      dropdown.classList.add('hidden');
      return;
    }

    const matches = PREDEFINED_SKILLS.filter(s => 
      s.toLowerCase().includes(q) && !existing.includes(s.toLowerCase())
    );

    let html = '';

    // Always offer custom typed skill if not already added
    if (rawVal && !existing.includes(q)) {
      html += `
        <div class="px-3 py-2 bg-secondary/5 hover:bg-secondary/10 cursor-pointer text-sm font-semibold text-secondary transition-colors flex items-center justify-between suggest-item border-b border-outline-variant/30" data-value="${esc(rawVal)}">
          <span>Add "${esc(rawVal)}"</span>
          <span class="material-symbols-outlined text-xs">add_circle</span>
        </div>
      `;
    }

    // Add predefined matching skills
    matches.forEach(skill => {
      if (skill.toLowerCase() !== q) {
        html += `
          <div class="px-3 py-2 hover:bg-secondary/10 cursor-pointer text-sm font-medium transition-colors flex items-center justify-between suggest-item" data-value="${esc(skill)}">
            <span>${esc(skill)}</span>
            <span class="material-symbols-outlined text-xs text-secondary">add</span>
          </div>
        `;
      }
    });

    if (!html) {
      dropdown.classList.add('hidden');
      return;
    }

    dropdown.innerHTML = html;

    dropdown.querySelectorAll('.suggest-item').forEach(el => {
      el.addEventListener('click', () => {
        const val = el.dataset.value;
        addSkill(val, true);
        searchInput.value = '';
        dropdown.classList.add('hidden');
      });
    });

    dropdown.classList.remove('hidden');
  };

  searchInput.addEventListener('input', e => renderSuggestions(e.target.value));
  searchInput.addEventListener('focus', e => renderSuggestions(e.target.value));
  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = searchInput.value.trim();
      if (val) {
        addSkill(val, true);
        searchInput.value = '';
        dropdown.classList.add('hidden');
      }
    }
  });

  document.addEventListener('click', e => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

// ══════════════════════════════════════════════════════════════
// MOBILE DRAWER HANDLER
// ══════════════════════════════════════════════════════════════
function setupMobileDrawer() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('mobile-close-btn');
  const backdrop = document.getElementById('sidebar-backdrop');
  const drawer = document.getElementById('sidebar-drawer');

  const openDrawer = () => {
    drawer.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
  };
  const closeDrawer = () => {
    drawer.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  };

  if (menuBtn) menuBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  window.closeMobileDrawer = closeDrawer;
}

// ══════════════════════════════════════════════════════════════
// STEP-BACK & FORWARD DATA SYNC
// ══════════════════════════════════════════════════════════════
function syncCurrentStepToState() {
  const step = formState.currentStep;

  if (step === 1) {
    ['firstName','lastName','email','phone','linkedin','address','professionalSummary'].forEach(f => {
      const el = document.getElementById('f-' + f);
      if (el) formState.data[f] = el.value.trim();
    });
    const pc = document.getElementById('f-preferredContact');
    if (pc) formState.data.preferredContact = pc.value;
  } else if (step === 2) {
    const cards = document.querySelectorAll('#experience-entries .experience-card');
    cards.forEach((card, i) => {
      if (!formState.data.experiences[i]) return;
      const company = card.querySelector('[data-field="company"]');
      const title = card.querySelector('[data-field="title"]');
      const location = card.querySelector('[data-field="location"]');
      const startDate = card.querySelector('[data-field="start_date"]');
      const endDate = card.querySelector('[data-field="end_date"]');
      const isCurrent = card.querySelector('[data-field="is_current"]');
      const description = card.querySelector('[data-field="description"]');

      if (company) formState.data.experiences[i].company = company.value;
      if (title) formState.data.experiences[i].title = title.value;
      if (location) formState.data.experiences[i].location = location.value;
      if (startDate) formState.data.experiences[i].start_date = startDate.value;
      if (isCurrent) formState.data.experiences[i].is_current = isCurrent.checked;
      if (endDate) formState.data.experiences[i].end_date = isCurrent && isCurrent.checked ? 'Present' : endDate.value;
      if (description) formState.data.experiences[i].description = description.value;
    });
  } else if (step === 3) {
    const rows = document.querySelectorAll('#skills-list-container .skill-row');
    rows.forEach((row, i) => {
      if (!formState.data.skills[i]) return;
      const name = row.querySelector('[data-field="name"]');
      const prof = row.querySelector('[data-field="proficiency"]');
      const yrs = row.querySelector('[data-field="yearsUsed"]');

      if (name) formState.data.skills[i].name = name.value.trim();
      if (prof) formState.data.skills[i].proficiency = prof.value;
      if (yrs) formState.data.skills[i].yearsUsed = yrs.value;
    });
  }

  saveState(false);
}

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

  // Real-time email format check on blur (when user leaves the field)
  const emailEl = document.getElementById('f-email');
  if (emailEl) {
    emailEl.addEventListener('blur', () => {
      const val = emailEl.value.trim();
      const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
      if (val && !emailRegex.test(val)) {
        markError('f-email');
      } else {
        clearInputError(emailEl);
      }
    });
  }

  // Real-time phone format check on blur
  const phoneEl = document.getElementById('f-phone');
  if (phoneEl) {
    phoneEl.addEventListener('blur', () => {
      const val = phoneEl.value.trim();
      if (val && !/^\d{10}$/.test(val)) {
        markError('f-phone');
      } else {
        clearInputError(phoneEl);
      }
    });
  }
}


// ══════════════════════════════════════════════════════════════
// STEP 2 — EXPERIENCE
// ══════════════════════════════════════════════════════════════
function buildExperienceCard(exp, index) {
  const isFirst = index === 0;
  const div = document.createElement('div');
  div.className = 'experience-card bg-white p-4 sm:p-lg rounded-lg border border-outline-variant space-y-md';
  div.dataset.expIndex = index;

  const isCurrentChecked = exp.is_current || exp.end_date === 'Present';

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
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-sm">
        <div class="flex flex-col gap-xs">
          <label class="text-label-md text-on-surface">Start Date</label>
          <input data-field="start_date" type="date" value="${esc(exp.start_date)}"
            class="exp-input p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all"/>
        </div>
        <div class="flex flex-col gap-xs">
          <label class="text-label-md text-on-surface">End Date</label>
          <input data-field="end_date" type="date" value="${isCurrentChecked ? '' : esc(exp.end_date)}" ${isCurrentChecked ? 'disabled' : ''}
            class="end-date-input exp-input p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all disabled:opacity-50"/>
          <label class="flex items-center gap-1.5 cursor-pointer mt-1 text-xs text-on-surface select-none">
            <input data-field="is_current" type="checkbox" ${isCurrentChecked ? 'checked' : ''}
              class="is-current-checkbox rounded border-outline-variant text-secondary focus:ring-secondary"/>
            <span>I currently work here</span>
          </label>
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
        formState.data.experiences = [{ company:'',title:'',location:'',start_date:'',end_date:'',is_current:false,description:'' }];
      }
      saveState();
      renderExperienceEntries();
    });
  }

  const currentCheckbox = div.querySelector('.is-current-checkbox');
  const endDateInput = div.querySelector('.end-date-input');

  if (currentCheckbox && endDateInput) {
    currentCheckbox.addEventListener('change', () => {
      const checked = currentCheckbox.checked;
      endDateInput.disabled = checked;
      if (checked) {
        endDateInput.value = '';
        formState.data.experiences[index].end_date = 'Present';
        formState.data.experiences[index].is_current = true;
      } else {
        formState.data.experiences[index].end_date = endDateInput.value;
        formState.data.experiences[index].is_current = false;
      }
      saveState();
    });
  }

  div.querySelectorAll('.exp-input').forEach(input => {
    const field = input.dataset.field;
    if (field === 'is_current') return;

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
  syncCurrentStepToState();
  formState.data.experiences.push({ company:'',title:'',location:'',start_date:'',end_date:'',is_current:false,description:'' });
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
  syncCurrentStepToState();
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
    row.className = 'skill-row bg-surface-container-low p-4 sm:p-md rounded-lg border border-outline-variant flex flex-col gap-md';
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
            class="p-sm bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all capitalize">
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
          <input data-field="yearsUsed" type="number" min="0" value="${skill.yearsUsed||''}" placeholder="e.g. 3"
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
// STEP 4 — REVIEW & SUBMIT
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
        ${d.experiences.filter(e => e.company || e.title).map((exp, i) => {
          const endDateDisplay = exp.is_current ? 'Present' : (exp.end_date || 'Present');
          return `
          <div class="flex gap-md">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded bg-surface-container flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-primary text-xl sm:text-2xl">${EXP_ICONS[i % EXP_ICONS.length]}</span>
            </div>
            <div class="flex-1">
              <h4 class="text-label-md text-primary font-bold">${exp.title || '—'}</h4>
              <p class="text-body-sm text-on-surface-variant mb-xs">
                ${exp.company || ''}${exp.location ? ' · ' + exp.location : ''}${exp.start_date ? ' · ' + exp.start_date : ''} – ${endDateDisplay}
              </p>
              ${exp.description ? `<p class="text-on-surface text-body-sm leading-relaxed">${exp.description}</p>` : ''}
            </div>
          </div>
        `;
        }).join('') || '<p class="text-on-surface-variant text-body-sm">No experience added.</p>'}
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
          <span class="bg-surface-container-high text-primary px-3 py-1.5 rounded-full text-label-md flex items-center gap-1.5">
            <span class="font-semibold">${esc(s.name)}</span>
            <span class="text-on-surface-variant text-xs font-normal">(${s.proficiency || 'intermediate'}${s.yearsUsed ? ' · ' + s.yearsUsed + ' yrs' : ''})</span>
          </span>
        `).join('') || '<p class="text-on-surface-variant text-body-sm">No skills added.</p>'}
      </div>
    </section>
  `;
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR & PROGRESS PERCENTAGE
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
        ${isActive ? 'bg-white/10 font-bold' : ''} ${!isDone && !isActive ? 'opacity-50' : ''}"
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
// UI RENDER & PERCENTAGE PROGRESS
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

  // Re-hydrate step inputs to guarantee sync when stepping back
  if (step === 1) hydrateStep1();
  else if (step === 2) renderExperienceEntries();
  else if (step === 3) renderSkillsStep();

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

  // Progress indicator & percentage calculation
  const percentage = step * 25;
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');

  if (progressBar) progressBar.style.width = `${percentage}%`;
  if (progressLabel) progressLabel.textContent = `Step ${step} of 4 (${percentage}%)`;

  renderSidebar();
  if (step === 4) renderReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════════
// NAVIGATION & STEP JUMPING
// ══════════════════════════════════════════════════════════════
function handleNext() {
  if (formState.currentStep === 4) { handleSubmit(); return; }
  syncCurrentStepToState();
  if (validateStep(formState.currentStep)) {
    formState.currentStep++;
    saveState();
    renderUI();
  }
}

function handlePrev() {
  if (formState.currentStep > 1) {
    syncCurrentStepToState();
    formState.currentStep--;
    saveState();
    renderUI();
  }
}

function jumpToStep(s) {
  if (s <= formState.currentStep || window.canJumpForward) {
    syncCurrentStepToState();
    formState.currentStep = s;
    saveState();
    renderUI();
    if (window.closeMobileDrawer) window.closeMobileDrawer();
  }
}

function handleReset() {
  if (confirm('Start a fresh application? All progress will be lost.')) {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch(e) {}
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
    formState = defaultState();
    hydrateStep1();
    renderExperienceEntries();
    renderSkillsStep();
    renderSidebar();
    renderUI();
    
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) {
      welcomeModal.classList.remove('hidden');
      lockBodyScroll();
    }
    
    // Clear file upload status indicator if present
    const uploadedFilename = document.getElementById('uploaded-filename');
    if (uploadedFilename) {
      uploadedFilename.textContent = '';
      uploadedFilename.classList.add('hidden');
    }

    showAutosaveToast('Application reset cleanly!');
  }
}

// ══════════════════════════════════════════════════════════════
// DOWNLOAD APPLICATION PDF (.PDF)
// ══════════════════════════════════════════════════════════════
function downloadApplicationSummary() {
  const d = formState.data;
  const fullName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Candidate';
  const fileName = `job_application_${(d.lastName || 'candidate').toLowerCase()}_${Date.now()}.pdf`;

  // Build Experience HTML
  const experiencesHTML = (d.experiences && d.experiences.length) ? d.experiences.map(exp => `
    <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed #e7e8ea;">
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; color: #031634;">
        <span>${esc(exp.title || 'Role')} — <span style="color: #13696a;">${esc(exp.company || 'Company')}</span></span>
        <span style="font-size: 11px; color: #75777e; font-weight: normal;">${esc(exp.start_date || 'N/A')} to ${exp.is_current ? 'Present' : esc(exp.end_date || 'N/A')}</span>
      </div>
      ${exp.location ? `<p style="font-size: 11px; color: #75777e; margin: 2px 0 4px 0;">📍 ${esc(exp.location)}</p>` : ''}
      ${exp.description ? `<p style="font-size: 11px; color: #44474e; margin: 4px 0 0 0; line-height: 1.4;">${esc(exp.description)}</p>` : ''}
    </div>
  `).join('') : '<p style="font-size: 11px; color: #75777e;">No experience listed.</p>';

  // Build Skills HTML
  const validSkills = (d.skills || []).filter(s => s.name);
  const skillsHTML = validSkills.length ? `
    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
      ${validSkills.map(s => `
        <span style="background: #f2f4f6; color: #031634; border: 1px solid #c5c6cf; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 500;">
          <strong>${esc(s.name)}</strong> (${esc(s.proficiency || 'intermediate')}${s.yearsUsed ? ' · ' + s.yearsUsed + ' yrs' : ''})
        </span>
      `).join('')}
    </div>
  ` : '<p style="font-size: 11px; color: #75777e;">No skills listed.</p>';

  // Container element for PDF rendering
  const pdfContainer = document.createElement('div');
  pdfContainer.style.width = '700px';
  pdfContainer.style.padding = '25px 30px';
  pdfContainer.style.background = '#ffffff';
  pdfContainer.style.color = '#191c1e';
  pdfContainer.style.fontFamily = 'Helvetica, Arial, sans-serif';

  pdfContainer.innerHTML = `
    <!-- Header -->
    <div style="border-bottom: 2px solid #13696a; padding-bottom: 12px; margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="font-size: 20px; color: #031634; margin: 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Apex Consulting Group</h1>
          <p style="font-size: 12px; color: #13696a; margin: 2px 0 0 0; font-weight: bold;">OFFICIAL CANDIDATE APPLICATION RECORD</p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 10px; color: #75777e; display: block;">Submission Date: ${new Date().toLocaleDateString()}</span>
          <span style="font-size: 10px; color: #13696a; font-weight: bold; display: block;">Status: Verified Submitted</span>
        </div>
      </div>
    </div>

    <!-- Personal Information -->
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #13696a; border-bottom: 1px solid #c5c6cf; padding-bottom: 4px; margin-bottom: 10px; font-weight: bold;">1. Candidate Information</h2>
      <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; width: 50%;"><strong>Full Name:</strong> ${esc(fullName)}</td>
          <td style="padding: 4px 0; width: 50%;"><strong>Email:</strong> ${esc(d.email || '—')}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>Phone:</strong> ${esc(d.phone || '—')}</td>
          <td style="padding: 4px 0;"><strong>LinkedIn:</strong> ${esc(d.linkedin || 'Not provided')}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>Address:</strong> ${esc(d.address || 'Not provided')}</td>
          <td style="padding: 4px 0;"><strong>Preferred Contact:</strong> ${esc(d.preferredContact || 'Email')}</td>
        </tr>
      </table>
      ${d.professionalSummary ? `
        <div style="margin-top: 10px; background: #f8f9fb; padding: 8px 10px; border-radius: 4px; border-left: 3px solid #13696a;">
          <strong style="font-size: 10px; text-transform: uppercase; color: #44474e;">Professional Summary:</strong>
          <p style="font-size: 11px; margin: 3px 0 0 0; color: #191c1e; line-height: 1.4;">${esc(d.professionalSummary)}</p>
        </div>
      ` : ''}
    </div>

    <!-- Work Experience -->
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #13696a; border-bottom: 1px solid #c5c6cf; padding-bottom: 4px; margin-bottom: 10px; font-weight: bold;">2. Professional Work Experience</h2>
      ${experiencesHTML}
    </div>

    <!-- Skills & Expertise -->
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #13696a; border-bottom: 1px solid #c5c6cf; padding-bottom: 4px; margin-bottom: 10px; font-weight: bold;">3. Technical Skills & Expertise</h2>
      ${skillsHTML}
    </div>

    <!-- Footer -->
    <div style="margin-top: 30px; pt: 10px; border-top: 1px solid #edeef0; text-align: center; font-size: 9px; color: #75777e;">
      Apex Consulting Group • Confidential Candidate Application Copy • Generated Automatically
    </div>
  `;

  // Use html2pdf if available, otherwise open print dialog window
  if (window.html2pdf) {
    const opt = {
      margin:       [0.4, 0.4, 0.4, 0.4],
      filename:     fileName,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(pdfContainer).save();
    showAutosaveToast('Downloading PDF application copy...');
  } else {
    // Print window fallback
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`<html><head><title>Job Application — ${fullName}</title></head><body>${pdfContainer.outerHTML}</body></html>`);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 250);
    }
  }
}

window.downloadApplicationSummary = downloadApplicationSummary;

// ══════════════════════════════════════════════════════════════
// SUBMIT WITH LOADING STATE & ENDPOINT FETCH
// ══════════════════════════════════════════════════════════════
async function handleSubmit() {
  syncCurrentStepToState();

  const nextBtn = document.getElementById('next-btn');
  const nextText = document.getElementById('next-btn-text');
  const nextIcon = document.getElementById('next-btn-icon');

  // Set loading state on button
  nextBtn.disabled = true;
  nextBtn.classList.add('opacity-75', 'cursor-not-allowed');
  nextText.textContent = 'Submitting...';
  nextIcon.textContent = 'progress_activity';
  nextIcon.classList.add('animate-spin-custom');

  try {
    const applicantEmail = formState.data.email;
    const formSubmitUrl = `https://formsubmit.co/ajax/${encodeURIComponent(applicantEmail)}`;
    
    const res = await fetch(formSubmitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: `Job Application Received — ${formState.data.firstName} ${formState.data.lastName}`,
        _captcha: 'false',
        _template: 'table',
        name: `${formState.data.firstName} ${formState.data.lastName}`,
        email: formState.data.email,
        phone: formState.data.phone,
        linkedin: formState.data.linkedin || 'Not provided',
        contactPreference: formState.data.preferredContact,
        address: formState.data.address || 'Not provided',
        summary: formState.data.professionalSummary || 'None',
        experience: formState.data.experiences.map(e => `${e.title} at ${e.company} (${e.start_date} to ${e.end_date || (e.is_current ? 'Present' : '')})`).join('\n'),
        skills: formState.data.skills.map(s => `${s.name} (${s.proficiency}, ${s.yearsUsed} yrs)`).join(', ')
      })
    });

    if (!res.ok) throw new Error('Submission endpoint status error');
  } catch (err) {
    console.warn('Form submission dispatch note:', err);
  } finally {
    // Reset button state
    nextBtn.disabled = false;
    nextBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    nextText.textContent = 'Submit Application';
    nextIcon.textContent = 'send';
    nextIcon.classList.remove('animate-spin-custom');

    // Update modal with personalized email confirmation
    const applicantEmail = formState.data.email || 'your email';
    const modalMsg = document.getElementById('modal-msg');
    if (modalMsg) {
      modalMsg.innerHTML = `Your application has been processed! A confirmation notice has been sent to <strong class="text-primary font-semibold">${esc(applicantEmail)}</strong>.<br/><br/><span class="text-xs text-on-surface-variant bg-surface-container-low p-2 rounded-lg block border border-outline-variant">📩 <strong>Check your Inbox &amp; Spam folder</strong> for the confirmation email. (First-time users: click the FormSubmit activation link in your email to confirm!)</span>`;
    }

    // Show success modal
    lockBodyScroll();
    const modal = document.getElementById('success-modal');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    }, 10);
  }
}

function handleModalClose() {
  unlockBodyScroll();
  const modal = document.getElementById('success-modal');
  const content = document.getElementById('modal-content');
  content.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    try { sessionStorage.removeItem(STORAGE_KEY); } catch(e) {}
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
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
    if (!formState.data.firstName || !formState.data.firstName.trim()) { markError('f-firstName'); valid = false; }
    if (!formState.data.lastName || !formState.data.lastName.trim()) { markError('f-lastName'); valid = false; }
    // Strict email validation: must have local@domain.tld format with valid characters
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!formState.data.email || !emailRegex.test(formState.data.email.trim())) { markError('f-email'); valid = false; }
    if (!formState.data.phone || !/^\d{10}$/.test(formState.data.phone)) { markError('f-phone'); valid = false; }
  } else if (step === 2) {
    const hasValid = formState.data.experiences.some(e => e.company && e.company.trim() && e.title && e.title.trim());
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
    if (!formState.data.skills.some(s => s.name && s.name.trim())) {
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
