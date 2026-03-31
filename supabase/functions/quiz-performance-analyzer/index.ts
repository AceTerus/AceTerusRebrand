// Supabase Edge Function: Analyze quiz performance using Gemini API
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check — same pattern as pdf-quiz-generator
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(401, "Missing Authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError(401, "Unauthorized");
    }

    if (!GEMINI_API_KEY) {
      return jsonError(500, "GEMINI_API_KEY is not configured");
    }

    // Parse JSON body
    const body = await req.json();
    const current = body?.current;
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!current) {
      return jsonError(400, "Missing current quiz result");
    }

    const questionsData = Array.isArray(current.questions_data)
      ? current.questions_data
      : [];

    // Build prompt
    const wrongList = questionsData
      .filter((q: any) => !q.is_correct && !q.was_skipped)
      .map((q: any) => `- ${q.text}`)
      .join("\n");

    const skippedList = questionsData
      .filter((q: any) => q.was_skipped)
      .map((q: any) => `- ${q.text}`)
      .join("\n");

    const historySection =
      history.length === 0
        ? "This is the student's first quiz attempt."
        : `Previous results (most recent first):\n${history
            .map(
              (h: any, i: number) =>
                `${i + 1}. "${h.deck_name}" (${h.category}) — ${Number(h.score).toFixed(1)}% on ${new Date(h.completed_at).toLocaleDateString()}`
            )
            .join("\n")}`;

    const SPM_SEJARAH_SYLLABUS = `
SILIBUS SEJARAH SPM (KSSM)

=== TINGKATAN 4 ===

Bab 1: Kemunculan Tamadun Awal Manusia
- Pengertian dan ciri-ciri tamadun
- Faktor kemunculan tamadun (pertanian, sungai, kepimpinan, agama)
- Perkembangan manusia prasejarah
- Sumbangan tamadun awal kepada manusia

Bab 2: Tamadun Mesopotamia
- Latar belakang geografi Mesopotamia
- Pencapaian dalam pertanian, penulisan (cuneiform), undang-undang (Kod Hammurabi)
- Sistem pemerintahan dan agama
- Sumbangan tamadun Mesopotamia

Bab 3: Tamadun Mesir Purba
- Peranan Sungai Nil
- Sistem pemerintahan Firaun
- Pencapaian: hieroglif, seni bina (piramid), perubatan, astronomi
- Kepercayaan dan agama

Bab 4: Tamadun India
- Tamadun Indus (Mohenjo-daro, Harappa)
- Sistem kasta dan agama Hindu dan Buddha
- Pencapaian dalam matematik, astronomi, perubatan
- Pengaruh tamadun India ke Asia Tenggara

Bab 5: Tamadun China
- Sistem pemerintahan dinasti
- Pencapaian: kertas, cetakan, kompas, ubat bedil
- Falsafah Confucius, Taoisme, Buddhisme
- Sistem tulisan dan pentadbiran

Bab 6: Tamadun Awal Asia Tenggara
- Kerajaan Funan
- Kerajaan Champa
- Kerajaan Khmer (Angkor Wat)
- Kerajaan Srivijaya
- Kerajaan Majapahit
- Pengaruh India dan China di Asia Tenggara

Bab 7: Kerajaan Alam Melayu
- Kerajaan Melayu awal (Kedah Tua, Gangga Negara)
- Kerajaan Bercorak Hindu-Buddha
- Sistem pemerintahan dan sosial
- Perdagangan dan hubungan luar

Bab 8: Kesultanan Melayu Melaka
- Penubuhan Kesultanan Melaka oleh Parameswara
- Perkembangan Islam di Melaka
- Sistem pentadbiran (Sultan, Bendahara, Temenggung, Laksamana)
- Peranan Melaka sebagai pusat perdagangan dan penyebaran Islam
- Undang-Undang Melaka dan Undang-Undang Laut Melaka
- Bahasa Melayu sebagai lingua franca
- Kejatuhan Melaka kepada Portugis (1511)

Bab 9: Perkembangan Islam di Malaysia
- Kedatangan Islam ke Asia Tenggara
- Faktor penyebaran Islam
- Pengaruh Islam dalam pemerintahan, undang-undang, dan sosiobudaya
- Institusi Islam: masjid, madrasah, ulama

=== TINGKATAN 5 ===

Bab 1: Nasionalisme di Asia, Afrika dan Amerika Latin
- Konsep nasionalisme
- Nasionalisme di India (Gandhi, Kongres Kebangsaan India)
- Nasionalisme di China (Sun Yat-sen, Revolusi 1911)
- Nasionalisme di Filipina, Vietnam, Indonesia
- Nasionalisme di Afrika
- Nasionalisme di Amerika Latin
- Faktor-faktor yang mendorong nasionalisme

Bab 2: Nasionalisme di Malaysia Sehingga Perang Dunia Kedua
- Latar belakang penjajahan British
- Kesedaran awal nasionalisme Melayu
- Persatuan dan pertubuhan Melayu awal
- Akhbar dan majalah Melayu sebagai alat nasionalisme
- Pengaruh luar terhadap nasionalisme tempatan
- Isu tanah, ekonomi, dan pendidikan

Bab 3: Perang Dunia Kedua dan Kesannya di Malaysia
- Sebab-sebab Perang Dunia Kedua
- Penaklukan Jepun di Malaysia (1941-1942)
- Pentadbiran Jepun di Tanah Melayu dan Borneo
- Penentangan terhadap Jepun (MPAJA, Force 136)
- Kesan Perang Dunia Kedua terhadap Malaysia
- Penyerahan Jepun (1945)

Bab 4: Semangat Kebangsaan dan Kemerdekaan
- Malayan Union dan penentangan orang Melayu
- Pembentukan Persekutuan Tanah Melayu 1948
- Darurat 1948-1960
- Perjuangan kemerdekaan melalui rundingan
- Pilihanraya 1955 dan Perikatan
- Kemerdekaan 31 Ogos 1957
- Pembentukan Malaysia 16 September 1963
- Pemisahan Singapura 1965

Bab 5: Pembinaan Negara dan Bangsa Malaysia
- Cabaran awal pembinaan negara
- Dasar Ekonomi Baru (DEB) 1971
- Dasar Pendidikan Kebangsaan
- Perlembagaan Malaysia: Rukun Negara
- Perpaduan kaum dan integrasi nasional
- Wawasan 2020

Bab 6: Kemajuan dan Kesejahteraan Negara
- Pembangunan ekonomi Malaysia
- Perindustrian dan pertanian moden
- Dasar Pembangunan Nasional (DPN)
- Dasar Wawasan Negara (DWN)
- Kemajuan infrastruktur dan teknologi
- Kualiti hidup rakyat Malaysia

Bab 7: Malaysia dan Kerjasama Antarabangsa
- Penglibatan Malaysia dalam ASEAN
- Peranan Malaysia dalam PBB
- Dasar luar Malaysia (berkecuali, tidak berpihak)
- Gerakan Negara-Negara Berkecuali (NAM)
- Pertubuhan Kerjasama Islam (OIC)
- Sumbangan Malaysia dalam pengaman dunia
- Hubungan Malaysia dengan negara-negara lain
`;

    const prompt = `You are an expert educational AI tutor specialising in SPM Sejarah. Analyze this student's quiz performance and return ONLY a valid JSON object (no markdown, no code fences). Write ALL text fields in Bahasa Malaysia.

Use the SPM Sejarah syllabus below to identify the exact BAB (chapter) and SUBTOPIK the student is weak or strong in, based on the questions they got wrong or skipped. Be specific — name the bab number and subtopik title from the syllabus.

${SPM_SEJARAH_SYLLABUS}

---

Current quiz: "${current.deck_name}" (${current.category})
Score: ${Number(current.score).toFixed(1)}% — ${current.correct_count} betul, ${current.wrong_count} salah, ${current.skipped_count} dilangkau daripada ${current.total_count}

${wrongList ? `Soalan yang dijawab salah:\n${wrongList}` : "Semua soalan dijawab dengan betul!"}
${skippedList ? `\nSoalan yang dilangkau:\n${skippedList}` : ""}

${historySection}

Return this JSON structure only (all values in Bahasa Malaysia):
{"overall_trend":"improving atau declining atau stable atau first_attempt","performance_summary":"1-2 ayat ringkasan prestasi","weak_areas":["Bab X: Nama Bab — Subtopik"],"strong_areas":["Bab X: Nama Bab — Subtopik"],"improvement_tips":["tip1","tip2","tip3"],"comparison_note":"1 ayat perbandingan dengan percubaan lepas"}`;

    // Call Gemini — same pattern as pdf-quiz-generator
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", geminiRes.status, errText);
      return jsonError(502, `Gemini API error ${geminiRes.status}: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText) {
      return jsonError(422, "Gemini returned empty response");
    }

    // Parse JSON from response
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
    }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return jsonError(422, `Could not parse Gemini response: ${cleaned.slice(0, 200)}`);
    }

    const analysis = JSON.parse(cleaned.slice(start, end + 1));

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("quiz-performance-analyzer error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(500, msg);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
