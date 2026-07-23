# 🧙 Job Application Wizard

A modern, responsive multi-step job application form featuring smart resume PDF auto-fill, skills autocomplete, dark mode, and session-only state management.

🔗 **Live Demo:** [job-application-wizard.vercel.app](https://job-application-wizard.vercel.app)

---

> ⚠️ **Development Note — Resume Parser Status:**  
> The **Resume PDF Extraction feature is currently in Active Development / Beta**. While it successfully parses text, names, emails, phones, skills, and work experience from standard single-column PDF resumes, extraction logic for non-standard, image-based, or multi-column PDF layouts is undergoing continuous improvement. Candidates can review and edit all auto-filled details at any step or choose **Fill Manually**.

---

## ✨ Key Features

### 📄 1. Resume Auto-Fill (PDF Parsing) *(In Active Beta)*
- Upload a PDF resume on landing to auto-fill applicant fields
- Extracts:
  - **Name & Contact**: First Name, Last Name, Email, Phone, LinkedIn
  - **Work Experience**: Extracted positions, titles, companies, and project descriptions
  - **Skills**: Matched against 100+ tech/business skills + dynamic resume section parsing
- **Professional Summary**: Intentionally left blank for candidates to craft personally

### 🎯 2. Interactive Welcome Modal
- Choice screen upon landing:
  - 📄 **Upload Resume** — fast-track application using PDF parsing
  - ✍️ **Fill Manually** — step-by-step manual completion

### 📋 3. Multi-Step Form Layout
- **Step 1 – Personal Information:** Full name, email (with real-time format validation), 10-digit phone, LinkedIn, address, contact preference, and professional summary (with character counter).
- **Step 2 – Professional Experience:** Dynamic card layout to add multiple work entries with current employment checkboxes and character counters.
- **Step 3 – Expertise & Skills:** Rich skills manager with proficiency dropdowns and years of experience.
- **Step 4 – Review & Submit:** Comprehensive summary view with inline step edit buttons before submission.

### 💡 4. Smart Skills Autocomplete
- Real-time search across 100+ predefined tech & business skills
- Custom skill creation via `Add "custom skill"` dropdown item for unlisted skills

### 🌙 5. Theme Support (Dark / Light Mode)
- Floating dark/light mode toggle in top-right pill and sidebar
- Persists theme selection in `localStorage` across visits

### 🔒 6. Session-Only Privacy Storage
- Application state is saved in `sessionStorage`
- Data **persists on page refresh (F5)** so you don't lose progress while working
- Data is **automatically wiped when the browser tab is closed** or when clicking **Start Over**

### 📧 7. Automated Email Submission
- Submits completed applications to the candidate's email via FormSubmit endpoint
- Personalized confirmation notification with spam folder reminders

### 📥 8. Download Summary (.JSON)
- Export a clean structured JSON file of the application summary upon completion

---

## 🗂️ Project File Structure

```
Wizard/
├── index.html       # Single-page wizard structure & step containers
├── app.js           # Core state management, resume PDF parser, validation & submission
├── styles.css       # Design system, dark theme overrides, smooth step animations
└── README.md        # Comprehensive documentation & setup instructions
```

---

## 🛠️ Tech Stack

| Component | Technology Used |
|---|---|
| **Structure & Logic** | HTML5, Vanilla JavaScript (ES6+) |
| **Styling** | Vanilla CSS, Tailwind CSS (CDN utilities) |
| **PDF Extraction** | PDF.js (Mozilla) + Latin1 Stream Decoder fallback |
| **Form Endpoint** | FormSubmit.co AJAX API |
| **Deployment** | Vercel Auto-Deploy linked to `main` branch |

---

## 🚀 Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/Tejamanoj/job-application-wizard.git
   cd job-application-wizard
   ```

2. Start a local static server:
   ```bash
   npx http-server ./ -p 3000
   ```

3. Open **http://localhost:3000** in your browser.

---

## 👤 Author

**Amara Teja Manoj Kumar R**  
📧 [tejamanojkumaramara@gmail.com](mailto:tejamanojkumaramara@gmail.com)  
🔗 [LinkedIn Profile](https://linkedin.com/in/amara-teja-manoj-kumar)  
🐙 [GitHub Repository](https://github.com/Tejamanoj/job-application-wizard)
