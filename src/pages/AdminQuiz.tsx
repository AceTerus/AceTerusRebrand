import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, ChevronLeft, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  fetchDecks,
  createDeck,
  updateDeck,
  deleteDeck,
  fetchQuestionsForDeck,
  createQuestion,
  updateQuestion,
  replaceAnswers,
  deleteQuestion,
} from "@/lib/quiz-client";
import type { Deck, Question } from "@/types/quiz";

// ── Blank form shapes ─────────────────────────────────────────────────────────

const blankDeckForm = () => ({ name: "", subject: "", description: "" });

const blankQuestionForm = () => ({
  text: "",
  explanation: "",
  answers: ["", "", "", ""],
  correctIndex: 0,
});

// ── Main component ────────────────────────────────────────────────────────────

const AdminQuiz = () => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Views
  const [view, setView] = useState<"decks" | "questions">("decks");

  // Deck state
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  // Question state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Deck dialog
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [deckForm, setDeckForm] = useState(blankDeckForm());
  const [savingDeck, setSavingDeck] = useState(false);

  // Question dialog
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState(blankQuestionForm());
  const [savingQuestion, setSavingQuestion] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // ── Load decks ──────────────────────────────────────────────────────────────
  const loadDecks = async () => {
    setLoadingDecks(true);
    try {
      setDecks(await fetchDecks());
    } catch (e: any) {
      toast({ title: "Error loading decks", description: e.message, variant: "destructive" });
    } finally {
      setLoadingDecks(false);
    }
  };

  useEffect(() => { loadDecks(); }, []);

  // ── Load questions for selected deck ────────────────────────────────────────
  const loadQuestions = async (deck: Deck) => {
    setSelectedDeck(deck);
    setView("questions");
    setLoadingQuestions(true);
    try {
      setQuestions(await fetchQuestionsForDeck(deck.id));
    } catch (e: any) {
      toast({ title: "Error loading questions", description: e.message, variant: "destructive" });
    } finally {
      setLoadingQuestions(false);
    }
  };

  // ── Deck dialog helpers ─────────────────────────────────────────────────────
  const openCreateDeck = () => {
    setEditingDeck(null);
    setDeckForm(blankDeckForm());
    setDeckDialogOpen(true);
  };

  const openEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setDeckForm({ name: deck.name, subject: deck.subject ?? "", description: deck.description ?? "" });
    setDeckDialogOpen(true);
  };

  const handleSaveDeck = async () => {
    if (!deckForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSavingDeck(true);
    try {
      if (editingDeck) {
        await updateDeck(editingDeck.id, deckForm);
        toast({ title: "Deck updated" });
      } else {
        await createDeck(deckForm);
        toast({ title: "Deck created" });
      }
      setDeckDialogOpen(false);
      loadDecks();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingDeck(false);
    }
  };

  const handleDeleteDeck = async (deck: Deck) => {
    if (!confirm(`Delete "${deck.name}" and all its questions?`)) return;
    try {
      await deleteDeck(deck.id);
      toast({ title: "Deck deleted" });
      loadDecks();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  // ── Question dialog helpers ─────────────────────────────────────────────────
  const openAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm(blankQuestionForm());
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    const answers = [...q.answers];
    // Pad to 4 if fewer
    while (answers.length < 4) answers.push({ id: "", question_id: q.id, text: "", is_correct: false });
    const correctIndex = answers.findIndex((a) => a.is_correct);
    setQuestionForm({
      text: q.text,
      explanation: q.explanation ?? "",
      answers: answers.slice(0, 4).map((a) => a.text),
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
    });
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.text.trim()) {
      toast({ title: "Question text is required", variant: "destructive" });
      return;
    }
    const filledAnswers = questionForm.answers.filter((a) => a.trim());
    if (filledAnswers.length < 2) {
      toast({ title: "At least 2 answer choices are required", variant: "destructive" });
      return;
    }

    const answers = questionForm.answers
      .map((text, idx) => ({ text: text.trim(), is_correct: idx === questionForm.correctIndex }))
      .filter((a) => a.text);

    setSavingQuestion(true);
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, {
          text: questionForm.text,
          explanation: questionForm.explanation || undefined,
        });
        await replaceAnswers(editingQuestion.id, answers);
        toast({ title: "Question updated" });
      } else {
        await createQuestion({
          deck_id: selectedDeck!.id,
          text: questionForm.text,
          explanation: questionForm.explanation || undefined,
          order: questions.length,
          answers,
        });
        toast({ title: "Question added" });
      }
      setQuestionDialogOpen(false);
      loadQuestions(selectedDeck!);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (q: Question) => {
    if (!confirm("Delete this question?")) return;
    try {
      await deleteQuestion(q.id);
      toast({ title: "Question deleted" });
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  // ── Render guards ───────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  const LABELS = ["A", "B", "C", "D"];

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Quiz Admin</h1>
          <p className="text-muted-foreground mt-1">
            {view === "decks" ? "Manage quiz decks" : `Questions in "${selectedDeck?.name}"`}
          </p>
        </div>
        {view === "decks" ? (
          <Button onClick={openCreateDeck} className="gap-2">
            <Plus className="w-4 h-4" /> New Deck
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setView("decks")} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Back to Decks
            </Button>
            <Button onClick={openAddQuestion} className="gap-2">
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          </div>
        )}
      </div>

      {/* ── Deck List ── */}
      {view === "decks" && (
        <>
          {loadingDecks ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : decks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No decks yet. Click "New Deck" to create your first quiz.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {decks.map((deck) => (
                <Card key={deck.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{deck.name}</h3>
                        {deck.subject && <Badge variant="secondary">{deck.subject}</Badge>}
                      </div>
                      {deck.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{deck.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{deck.question_count} question{deck.question_count !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => loadQuestions(deck)}>
                        Manage Questions
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditDeck(deck)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteDeck(deck)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Question List ── */}
      {view === "questions" && (
        <>
          {loadingQuestions ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : questions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No questions yet. Click "Add Question" to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <Card key={q.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Badge variant="outline" className="shrink-0 mt-0.5">Q{idx + 1}</Badge>
                        <CardTitle className="text-base font-medium leading-snug">{q.text}</CardTitle>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => openEditQuestion(q)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteQuestion(q)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {q.answers.map((a, i) => (
                      <div
                        key={a.id}
                        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
                          a.is_correct
                            ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-300"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        <span className="font-semibold shrink-0">{LABELS[i]}.</span>
                        <span>{a.text}</span>
                        {a.is_correct && <span className="ml-auto text-xs font-semibold text-green-600 dark:text-green-400">Correct</span>}
                      </div>
                    ))}
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground mt-2 italic">Explanation: {q.explanation}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Deck Dialog ── */}
      <Dialog open={deckDialogOpen} onOpenChange={setDeckDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDeck ? "Edit Deck" : "New Deck"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Biology Paper 1"
                value={deckForm.name}
                onChange={(e) => setDeckForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subject / Category</Label>
              <Input
                placeholder="e.g. Biology, History, Maths"
                value={deckForm.subject}
                onChange={(e) => setDeckForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional short description"
                value={deckForm.description}
                onChange={(e) => setDeckForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeckDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDeck} disabled={savingDeck}>
              {savingDeck && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingDeck ? "Save Changes" : "Create Deck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Question Dialog ── */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Question *</Label>
              <Textarea
                placeholder="Enter your question here"
                value={questionForm.text}
                onChange={(e) => setQuestionForm((f) => ({ ...f, text: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Answer Choices (select the correct one)</Label>
              {questionForm.answers.map((answer, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={questionForm.correctIndex === idx}
                    onChange={() => setQuestionForm((f) => ({ ...f, correctIndex: idx }))}
                    className="accent-primary w-4 h-4 shrink-0"
                  />
                  <span className="font-semibold text-sm w-5 shrink-0">{LABELS[idx]}.</span>
                  <Input
                    placeholder={`Answer ${LABELS[idx]}`}
                    value={answer}
                    onChange={(e) => {
                      const answers = [...questionForm.answers];
                      answers[idx] = e.target.value;
                      setQuestionForm((f) => ({ ...f, answers }));
                    }}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Explanation (optional)</Label>
              <Textarea
                placeholder="Explain why this answer is correct"
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm((f) => ({ ...f, explanation: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveQuestion} disabled={savingQuestion}>
              {savingQuestion && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingQuestion ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminQuiz;
