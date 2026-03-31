// Supabase Edge Function: Raw text → Quiz parser via Gemini API
import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

interface GeneratedAnswer {
  text: string;
  is_correct: boolean;
}

interface GeneratedQuestion {
  text: string;
  answers: GeneratedAnswer[];
  explanation?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "Missing Authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonError(401, "Unauthorized");

    if (!GEMINI_API_KEY) return jsonError(500, "GEMINI_API_KEY is not configured");

    const body = await req.json().catch(() => null);
    if (!body || typeof body.text !== "string" || !body.text.trim()) {
      return jsonError(400, "Request body must contain a non-empty 'text' field");
    }

    const rawText: string = body.text.trim();
    if (rawText.length > 100_000) {
      return jsonError(400, "Text is too long (max 100,000 characters)");
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildPrompt(rawText),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorBody);
      return jsonError(502, `Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!responseText) return jsonError(422, "Gemini returned an empty response.");

    const questions = parseQuestionsFromResponse(responseText);

    if (!questions || questions.length === 0) {
      return jsonError(422, "Could not find any questions in the pasted text. Make sure the text contains numbered questions with answer choices.");
    }

    return jsonOk({ questions });

  } catch (err) {
    console.error("text-quiz-parser error:", err);
    return jsonError(500, err instanceof Error ? err.message : "Unexpected error");
  }
});

function buildPrompt(rawText: string): string {
  return `You are an expert exam question parser. The following raw text was pasted from an exam paper, textbook, or study material. It may be in Malay or English.

Your job is to extract all multiple-choice questions from the text and return them as a structured JSON array.

Rules for identifying questions:
- Questions are typically numbered (1., 1), Q1, Soalan 1, etc.)
- Answer choices are typically labeled A/B/C/D, a/b/c/d, (A)/(B), A., B., or Roman numerals I/II/III/IV
- If the text explicitly marks a correct answer (e.g. "Answer: B", "Jawapan: C", an asterisk *, underline, or any other marker), mark that answer as is_correct: true
- If NO correct answers are marked in the text, set ALL is_correct to false — the admin will mark them manually
- Do NOT guess or invent correct answers if they are not clearly indicated in the source text
- Preserve the original question and answer text exactly as written, including the original language

Return ONLY a valid JSON array — no markdown, no explanation, no code fences, just the raw JSON.

Each question must follow this exact structure:
[
  {
    "text": "The question text here?",
    "answers": [
      {"text": "Option A text", "is_correct": false},
      {"text": "Option B text", "is_correct": true},
      {"text": "Option C text", "is_correct": false},
      {"text": "Option D text", "is_correct": false}
    ],
    "explanation": "Brief explanation if any context clues exist, otherwise omit this field"
  }
]

Additional rules:
- Each question must have between 2 and 4 answer choices
- Do not duplicate questions
- If the text is not a question-answer format, return an empty array []
- Return ONLY the JSON array, nothing else

Here is the raw text to parse:

---
${rawText}
---`;
}

function parseQuestionsFromResponse(raw: string): GeneratedQuestion[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
  }

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No valid JSON array found in Gemini response");
  }

  const jsonStr = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) throw new Error("Response is not a JSON array");

  return parsed
    .filter((q: any) => q.text && Array.isArray(q.answers) && q.answers.length >= 2)
    .map((q: any): GeneratedQuestion => ({
      text: String(q.text),
      answers: (q.answers as any[]).slice(0, 4).map((a: any) => ({
        text: String(a.text ?? ""),
        is_correct: Boolean(a.is_correct),
      })),
      explanation: q.explanation ? String(q.explanation) : undefined,
    }));
}

function jsonOk<T>(data: T): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
