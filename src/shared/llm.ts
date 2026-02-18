import type { Settings } from "./storage";
import type { TailorResult } from "./types";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  model?: string;
  error?: { message?: string };
};

function buildPrompt(resumeText: string, jobDescription: string) {
  return `You are an expert ATS resume writer and career coach.

Your task is to redesign the candidate’s resume so it matches the given Job Description perfectly.

INPUTS:
1. Candidate Resume:
${resumeText}

2. Target Job Description:
${jobDescription}

INSTRUCTIONS:
- Rewrite the resume to maximize ATS score for this specific job.
- Do NOT add fake experience or fake projects.
- Only rewrite and improve existing skills, projects, and work.
- Use keywords and responsibilities from the job description naturally.
- Keep the resume professional, modern, and clean.

OUTPUT FORMAT (STRICT):
Return the resume in the following structure:

## Professional Summary
(3-4 strong lines tailored for this job)

## Key Skills (ATS Optimized)
- Skill 1
- Skill 2
- Skill 3

## Experience / Internship (if available)
Rewrite bullet points with action verbs + measurable impact.

## Projects (Most Relevant First)
For each project:
- Title
- 2-3 bullet points aligned with job role

## Education

## Certifications / Achievements (if any)

IMPORTANT RULES:
- Use strong action verbs (Built, Designed, Optimized, Developed).
- Add measurable outcomes where possible (only if supported by resume; otherwise omit metrics).
- Prioritize job-relevant skills and projects.
- Make the resume ready for product-based companies.

Return only the redesigned resume text in the strict format above.`;
}

export async function tailorResumeWithLLM(
  settings: Settings,
  resumeText: string,
  jobDescription: string
): Promise<TailorResult> {
  const baseUrl = settings.llm.baseUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/v1/chat/completions`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.llm.apiKey}`
    },
    body: JSON.stringify({
      model: settings.llm.model,
      temperature: settings.llm.temperature,
      messages: [
        {
          role: "system",
          content:
            "You rewrite resumes for ATS. Never invent experience, employers, dates, tools, metrics, or projects. If information is missing, omit it."
        },
        { role: "user", content: buildPrompt(resumeText, jobDescription) }
      ]
    })
  });

  const data = (await resp.json()) as ChatCompletionResponse;
  if (!resp.ok) {
    const msg = data?.error?.message || `LLM request failed (${resp.status})`;
    throw new Error(msg);
  }

  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) throw new Error("LLM returned empty response");

  return {
    resumeMarkdown: content,
    model: data.model
  };
}

