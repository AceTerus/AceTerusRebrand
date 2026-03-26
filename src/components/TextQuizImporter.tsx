import { useRef, useState } from "react";
import {
  ClipboardList, ImagePlus, Loader2, Sparkles, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createQuestion, uploadQuizImage } from "@/lib/quiz-client";
import type { Deck } from "@/types/quiz";

const LABELS = ["A", "B", "C", "D"];

interface ParsedAnswer {
  text: string;
  is_correct: boolean;
}

interface ParsedQuestion {
  text: string;
  answers: ParsedAnswer[];
  explanation: string;
  imageFile?: File;
  imagePreview?: string;
}

interface TextQuizImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Deck;
  existingCount: number;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const TextQuizImporter = ({
  open,
  onOpenChange,
  deck,
  existingCount,
  onSuccess,
}: TextQuizImporterProps) => {
  const { toast } = useToast();
  const imageInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [step, setStep] = useState<"input" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);

  const reset = () => {
    setStep("input");
    setRawText("");
    setParsing(false);
    setSaving(false);
    setQuestions([]);
    imageInputRefs.current = [];
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // ── Step 1: Parse with Gemini via Supabase edge function ─────────────────
  const handleParse = async () => {
    if (!rawText.trim()) {
      toast({ title: "Please paste some text first", variant: "destructive" });
      return;
    }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("text-quiz-parser", {
        body: { text: rawText },
      });

      if (error) throw new Error(error.message);
      if (!data?.questions || data.questions.length === 0) {
        throw new Error(
          "No questions found. Make sure the text has numbered questions with A/B/C/D choices."
        );
      }

      const parsed: ParsedQuestion[] = (data.questions as any[]).map((q: any) => ({
        text: String(q.text ?? ""),
        explanation: String(q.explanation ?? ""),
        answers: (q.answers as any[]).map((a: any) => ({
          text: String(a.text ?? ""),
          is_correct: Boolean(a.is_correct),
        })),
      }));

      setQuestions(parsed);
      setStep("review");
      toast({
        title: `${parsed.length} question${parsed.length !== 1 ? "s" : ""} parsed`,
        description: "Review, set correct answers, add images, then save.",
      });
    } catch (err: any) {
      toast({ title: "Parsing failed", description: err.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  // ── Question editing helpers ──────────────────────────────────────────────
  const updateQuestion = (idx: number, patch: Partial<ParsedQuestion>) =>
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

  const updateAnswer = (qIdx: number, aIdx: number, text: string) =>
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        return { ...q, answers: q.answers.map((a, j) => (j === aIdx ? { ...a, text } : a)) };
      })
    );

  const setCorrectAnswer = (qIdx: number, aIdx: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        return { ...q, answers: q.answers.map((a, j) => ({ ...a, is_correct: j === aIdx })) };
      })
    );

  const removeQuestion = (idx: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== idx));

  const handleImageSelect = (qIdx: number, file: File) => {
    updateQuestion(qIdx, { imageFile: file, imagePreview: URL.createObjectURL(file) });
  };

  const removeImage = (qIdx: number) => {
    updateQuestion(qIdx, { imageFile: undefined, imagePreview: undefined });
    if (imageInputRefs.current[qIdx]) imageInputRefs.current[qIdx]!.value = "";
  };

  // ── Step 2: Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (questions.length === 0) return;
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) {
        toast({ title: `Q${i + 1}: Question text cannot be empty`, variant: "destructive" });
        return;
      }
      if (questions[i].answers.filter((a) => a.text.trim()).length < 2) {
        toast({ title: `Q${i + 1}: At least 2 answer choices required`, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const imageUrl = q.imageFile ? await uploadQuizImage(q.imageFile) : undefined;
        await createQuestion({
          deck_id: deck.id,
          text: q.text.trim(),
          explanation: q.explanation.trim() || undefined,
          image_url: imageUrl,
          order: existingCount + i,
          answers: q.answers
            .filter((a) => a.text.trim())
            .map((a) => ({ text: a.text.trim(), is_correct: a.is_correct })),
        });
      }
      toast({
        title: `${questions.length} question${questions.length !== 1 ? "s" : ""} added!`,
        description: `Saved to "${deck.name}".`,
      });
      handleClose();
      onSuccess();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const noCorrectCount = questions.filter((q) => !q.answers.some((a) => a.is_correct)).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Import Questions from Text
            {step === "review" && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                Adding to: {deck.name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Paste text ── */}
        {step === "input" && (
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Paste questions from an exam paper, textbook, or notes. Works with numbered questions
              and A/B/C/D answer choices in Malay or English. If correct answers are marked in the
              text, they'll be detected automatically — otherwise set them in the next step.
            </p>
            <div className="space-y-1.5">
              <Label>Paste Questions</Label>
              <Textarea
                placeholder={`Example:\n\n1. What is the capital of Malaysia?\nA. Singapore\nB. Kuala Lumpur\nC. Penang\nD. Johor Bahru\nAnswer: B\n\n2. Which gas makes up most of Earth's atmosphere?\nA. Oxygen\nB. Carbon dioxide\nC. Nitrogen\nD. Hydrogen`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={15}
                className="font-mono text-sm resize-none"
                disabled={parsing}
              />
              <p className="text-xs text-muted-foreground">
                {rawText.length.toLocaleString()} characters
              </p>
            </div>
          </div>
        )}

        {/* ── Parsing indicator ── */}
        {parsing && (
          <div className="flex flex-col gap-1.5 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Parsing with Gemini AI…
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              This may take a few seconds.
            </p>
          </div>
        )}

        {/* ── Step 2: Review & edit ── */}
        {step === "review" && (
          <div className="space-y-4 py-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{questions.length}</span> questions
                parsed. Edit anything, set correct answers, add images, then save.
              </p>
              {noCorrectCount > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400">
                  {noCorrectCount} need correct answer
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => {
                const hasCorrect = q.answers.some((a) => a.is_correct);
                return (
                  <Card key={qIdx} className={`border-l-4 ${hasCorrect ? "border-l-green-500" : "border-l-amber-400"}`}>
                    <CardHeader className="pb-3 pt-4 px-4">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0 mt-0.5">Q{qIdx + 1}</Badge>
                        <Textarea
                          value={q.text}
                          onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                          rows={2}
                          className="flex-1 text-sm resize-none"
                          placeholder="Question text…"
                        />
                        <button
                          onClick={() => removeQuestion(qIdx)}
                          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      {/* Answer choices */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Answer choices — click the radio to mark correct
                        </Label>
                        {q.answers.map((a, aIdx) => (
                          <div key={aIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIdx}`}
                              checked={a.is_correct}
                              onChange={() => setCorrectAnswer(qIdx, aIdx)}
                              className="accent-green-500 w-4 h-4 shrink-0"
                            />
                            <span className="font-semibold text-sm w-5 shrink-0 text-muted-foreground">
                              {LABELS[aIdx]}.
                            </span>
                            <Input
                              value={a.text}
                              onChange={(e) => updateAnswer(qIdx, aIdx, e.target.value)}
                              placeholder={`Answer ${LABELS[aIdx]}`}
                              className={`text-sm ${a.is_correct ? "border-green-500 bg-green-50 dark:bg-green-500/10" : ""}`}
                            />
                          </div>
                        ))}
                        {!hasCorrect && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Select the correct answer above.
                          </p>
                        )}
                      </div>

                      {/* Explanation */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Explanation (optional)</Label>
                        <Textarea
                          value={q.explanation}
                          onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                          rows={2}
                          className="text-xs resize-none"
                          placeholder="Why is this the correct answer? (shown after the student answers)"
                        />
                      </div>

                      {/* Image */}
                      <div>
                        {q.imagePreview ? (
                          <div className="relative w-full rounded-lg overflow-hidden border bg-muted/20">
                            <img
                              src={q.imagePreview}
                              alt="Question image"
                              className="w-full max-h-40 object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(qIdx)}
                              className="absolute top-2 right-2 rounded-full bg-background/80 border p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => imageInputRefs.current[qIdx]?.click()}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-lg px-3 py-2 w-full justify-center transition-colors hover:border-primary"
                          >
                            <ImagePlus className="w-3.5 h-3.5" /> Add image (optional)
                          </button>
                        )}
                        <input
                          ref={(el) => { imageInputRefs.current[qIdx] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageSelect(qIdx, file);
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {questions.length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  All questions removed. Go back to paste new text.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          {step === "review" && (
            <Button
              variant="outline"
              onClick={() => { setStep("input"); setQuestions([]); }}
              disabled={saving}
            >
              ← Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={parsing || saving}>
            Cancel
          </Button>
          {step === "input" ? (
            <Button
              onClick={handleParse}
              disabled={parsing || !rawText.trim()}
              className="gap-2"
            >
              {parsing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Parsing…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Parse with AI</>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving || questions.length === 0}
              className="gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                `Save ${questions.length} Question${questions.length !== 1 ? "s" : ""} to Quiz`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
