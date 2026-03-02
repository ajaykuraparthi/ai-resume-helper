# AI Resume Helper 

A Chrome extension that **captures any job post and tailors your resume to it in seconds**.

- Capture job descriptions from **LinkedIn / Naukri** with one click  
- Paste your resume and generate a **job‑specific, ATS‑friendly version**  
- See **match insights** (score + missing keywords)  
- Export as **PDF / DOCX**  
- Keep a **personal history** of tailored versions with optional **privacy mode**

Perfect for students and professionals who apply to many roles and don’t want to rewrite their resume from scratch every time.

---

## Features

- **One‑click job capture**  
  Detects and extracts job descriptions from LinkedIn and Naukri job pages. For other sites, you can paste the JD manually.

  <img width="1904" height="921" alt="Screenshot 2026-02-18 181625" src="https://github.com/user-attachments/assets/7fed4317-7ff5-475a-8e24-b639545b8598" />


- **Resume tailoring (no fake experience)**  
  Rewrites your existing resume to better match the target job description. It **does not invent** companies, roles, or projects.

- **ATS keyword match insights**  
  Estimates how well your resume matches the job and suggests important keywords you might be missing.

- **PDF & DOCX export**  
  Download the tailored resume in recruiter‑friendly formats.

  <img width="1802" height="858" alt="Screenshot 2026-02-18 191406" src="https://github.com/user-attachments/assets/9db211d2-7657-4d2d-a95e-8e5b4c65ef4a" />


- **Version history per job**  
  Quickly reload previous tailored versions. Great for A/B testing or re‑applying later.

- **Privacy mode**  
  When enabled, history lives only in the current browser session and is cleared when you close Chrome.

---

## Getting Started (Local Install)

> Until the extension is published on the Chrome Web Store, you can install it locally in Developer Mode.

### 1. Install dependencies

```bash
npm install
```

### 2. Build the extension

```bash
npm run build
```

This creates a production build in the `dist/` folder.

### 3. Load in Chrome

1. Open `chrome://extensions` in Chrome  
2. Turn on **Developer mode** (top‑right toggle)  
3. Click **Load unpacked**  
4. Select the `dist/` folder

You should now see **AI Resume Helper Pro** in your extensions list.

---

## Configure Your AI Provider

AI Resume Helper Pro uses an **OpenAI‑compatible API**. Each user brings their own key – there is no shared backend.

Open the extension **Settings** and configure:

- **API base URL**  
  - OpenAI: `https://api.openai.com`  
  - Groq: `https://api.groq.com/openai`

- **API key**  
  - Your provider’s API key (e.g. OpenAI or Groq)

- **Model**  
  - Example (OpenAI): `gpt-4.1-mini`  
  - Example (Groq): `llama-3.1-8b-instant`

- **Creativity (temperature)**  
  - `0–0.3`: safer, more predictable wording  
  - `0.4–0.7`: more varied language

Click **Save settings** and accept the permission prompt if Chrome asks for host access.

---

## How to Use

1. **Open a job post**  
   - Preferably a LinkedIn or Naukri job page.

2. **Capture the job description**  
   - Click the extension icon.  
   - Click **Capture from current tab**, or paste the JD into the Job Description box.

3. **Paste your resume**  
   - Paste your current resume text into the **Your Resume** box.

4. **Generate a tailored version**  
   - Click **Create tailored resume**.  
   - Wait a few seconds while the AI rewrites your resume for this specific job.

5. **Review & export**  
   - Check the tailored resume in the output area.  
   - Optionally adjust details.  
   - Click **Copy to clipboard**, **Download as PDF**, or **Download as DOCX**.

---

## Privacy

- Your resume and job descriptions are processed directly in the browser and sent **only** to the AI provider you configure (e.g., OpenAI or Groq).  
- History is stored locally using Chrome extension storage.  
- **Privacy mode** keeps history only for the active session and clears it when you close the browser.  
- You can clear all saved versions at any time from the popup.

---

## Tech Stack

- **Chrome Extension Manifest V3**
- **Vite + React** for UI
- **TypeScript** for type safety
- **docx** for DOCX export
- **jsPDF** for PDF export

---

## Contributing / Feedback

If you’d like to extend this project (more job boards, more formats, better ATS analysis), you can:

- Fork the repo and open a pull request  
- Suggest ideas (e.g., cover letter generation, bulk tailoring, company‑specific templates)

This project is also a great portfolio piece to showcase:

- Chrome extension development  
- Modern React + TypeScript frontend  
- Practical AI integration for real‑world job search problems.

