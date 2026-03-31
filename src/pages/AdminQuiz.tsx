import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2, ChevronLeft, Loader2, ShieldAlert,
  ImagePlus, X, Globe, EyeOff, Sparkles, FolderOpen, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  fetchCategories, createCategory, updateCategory, deleteCategory, toggleCategoryPublished,
  fetchDecks, createDeck, updateDeck, deleteDeck, toggleDeckPublished,
  fetchQuestionsForDeck, createQuestion, updateQuestion,
  replaceAnswers, deleteQuestion, uploadQuizImage, deleteQuizImage,
} from "@/lib/quiz-client";
import type { Category, Deck, Question } from "@/types/quiz";
import { PdfQuizGenerator } from "@/components/PdfQuizGenerator";
import { TextQuizImporter } from "@/components/TextQuizImporter";

// ── Blank form shapes ─────────────────────────────────────────────────────────

const blankCategoryForm = () => ({ name: "", description: "" });
const blankDeckForm = () => ({ name: "", subject: "", description: "" });
const blankQuestionForm = () => ({
  text: "",
  explanation: "",
  answers: ["", "", "", ""],
  correctIndex: 0,
});

const LABELS = ["A", "B", "C", "D"];

// ── Main component ────────────────────────────────────────────────────────────

const AdminQuiz = () => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // View hierarchy: categories → decks → questions
  const [view, setView] = useState<"categories" | "decks" | "questions">("categories");

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Deck state
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  // Question state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState(blankCategoryForm());
  const [savingCategory, setSavingCategory] = useState(false);

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

  // PDF generator
  const [pdfGeneratorOpen, setPdfGeneratorOpen] = useState(false);

  // Text importer
  const [textImporterOpen, setTextImporterOpen] = useState(false);

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // ── Load categories ──────────────────────────────────────────────────────────
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      setCategories(await fetchCategories());
    } catch (e: any) {
      toast({ title: "Error loading categories", description: e.message, variant: "destructive" });
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  // ── Load decks for a category ────────────────────────────────────────────────
  const loadDecksForCategory = async (category: Category) => {
    setSelectedCategory(category);
    setView("decks");
    setLoadingDecks(true);
    try {
      const all = await fetchDecks();
      setDecks(all.filter((d) => d.subject === category.name));
    } catch (e: any) {
      toast({ title: "Error loading decks", description: e.message, variant: "destructive" });
    } finally {
      setLoadingDecks(false);
    }
  };

  // ── Load questions for a deck ────────────────────────────────────────────────
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

  // ── Category dialog helpers ──────────────────────────────────────────────────
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm(blankCategoryForm());
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description ?? "" });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }
    setSavingCategory(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm, editingCategory.name);
        toast({ title: "Category updated" });
      } else {
        await createCategory(categoryForm);
        toast({ title: "Category created" });
      }
      setCategoryDialogOpen(false);
      loadCategories();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"? This will NOT delete its quizzes, but they will become uncategorised.`)) return;
    try {
      await deleteCategory(cat.id);
      toast({ title: "Category deleted" });
      loadCategories();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleCategoryPublish = async (cat: Category) => {
    try {
      await toggleCategoryPublished(cat.id, !cat.is_published);
      toast({ title: cat.is_published ? "Category unpublished" : "Category published" });
      loadCategories();
    } catch (e: any) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  };

  // ── Deck dialog helpers ──────────────────────────────────────────────────────
  const openCreateDeck = () => {
    setEditingDeck(null);
    // Pre-fill subject with the current category
    setDeckForm({ name: "", subject: selectedCategory?.name ?? "", description: "" });
    setDeckDialogOpen(true);
  };

  const openEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setDeckForm({ name: deck.name, subject: deck.subject ?? "", description: deck.description ?? "" });
    setDeckDialogOpen(true);
  };

  const handleSaveDeck = async () => {
    if (!deckForm.name.trim()) {
      toast({ title: "Deck name is required", variant: "destructive" });
      return;
    }
    if (!deckForm.subject.trim()) {
      toast({ title: "You must select a category", variant: "destructive" });
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
      if (selectedCategory) loadDecksForCategory(selectedCategory);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingDeck(false);
    }
  };

  const handleTogglePublish = async (deck: Deck) => {
    try {
      await toggleDeckPublished(deck.id, !deck.is_published);
      setDecks((prev) =>
        prev.map((d) => d.id === deck.id ? { ...d, is_published: !d.is_published } : d)
      );
      toast({ title: deck.is_published ? "Deck unpublished" : "Deck published" });
    } catch (e: any) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteDeck = async (deck: Deck) => {
    if (!confirm(`Delete "${deck.name}" and all its questions?`)) return;
    try {
      await deleteDeck(deck.id);
      toast({ title: "Deck deleted" });
      if (selectedCategory) loadDecksForCategory(selectedCategory);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  // ── Question dialog helpers ──────────────────────────────────────────────────
  const resetImageState = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const openAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm(blankQuestionForm());
    resetImageState();
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    const answers = [...q.answers];
    while (answers.length < 4) answers.push({ id: "", question_id: q.id, text: "", is_correct: false });
    const correctIndex = answers.findIndex((a) => a.is_correct);
    setQuestionForm({
      text: q.text,
      explanation: q.explanation ?? "",
      answers: answers.slice(0, 4).map((a) => a.text),
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
    });
    resetImageState();
    setExistingImageUrl(q.image_url ?? null);
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
      let finalImageUrl: string | null | undefined = undefined;
      if (imageFile) {
        if (existingImageUrl) await deleteQuizImage(existingImageUrl).catch(() => {});
        finalImageUrl = await uploadQuizImage(imageFile);
      } else if (existingImageUrl === null && editingQuestion?.image_url) {
        await deleteQuizImage(editingQuestion.image_url).catch(() => {});
        finalImageUrl = null;
      }

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, {
          text: questionForm.text,
          explanation: questionForm.explanation || undefined,
          ...(finalImageUrl !== undefined ? { image_url: finalImageUrl } : {}),
        });
        await replaceAnswers(editingQuestion.id, answers);
        toast({ title: "Question updated" });
      } else {
        await createQuestion({
          deck_id: selectedDeck!.id,
          text: questionForm.text,
          explanation: questionForm.explanation || undefined,
          image_url: finalImageUrl ?? undefined,
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

  // ── Render guards ────────────────────────────────────────────────────────────
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

  // ── Breadcrumb ───────────────────────────────────────────────────────────────
  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <button
        className="hover:text-foreground transition-colors"
        onClick={() => setView("categories")}
      >
        Categories
      </button>
      {(view === "decks" || view === "questions") && selectedCategory && (
        <>
          <span>/</span>
          <button
            className="hover:text-foreground transition-colors"
            onClick={() => loadDecksForCategory(selectedCategory)}
          >
            {selectedCategory.name}
          </button>
        </>
      )}
      {view === "questions" && selectedDeck && (
        <>
          <span>/</span>
          <span className="text-foreground font-medium">{selectedDeck.name}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Quiz Admin</h1>
          {breadcrumb}
        </div>

        <div className="flex gap-2">
          {view === "categories" && (
            <Button onClick={openCreateCategory} className="gap-2">
              <Plus className="w-4 h-4" /> New Category
            </Button>
          )}

          {view === "decks" && (
            <>
              <Button variant="outline" onClick={() => setView("categories")} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="outline" onClick={() => setPdfGeneratorOpen(true)} className="gap-2">
                <Sparkles className="w-4 h-4" /> Generate from PDF
              </Button>
              <Button onClick={openCreateDeck} className="gap-2">
                <Plus className="w-4 h-4" /> New Quiz
              </Button>
            </>
          )}

          {view === "questions" && (
            <>
              <Button
                variant="outline"
                onClick={() => selectedCategory && loadDecksForCategory(selectedCategory)}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="outline" onClick={() => setTextImporterOpen(true)} className="gap-2">
                <Sparkles className="w-4 h-4" /> Import from Text
              </Button>
              <Button onClick={openAddQuestion} className="gap-2">
                <Plus className="w-4 h-4" /> Add Question
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Categories view ── */}
      {view === "categories" && (
        <>
          {loadingCategories ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No categories yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a category first, then add quizzes inside it.
                </p>
                <Button className="mt-4 gap-2" onClick={openCreateCategory}>
                  <Plus className="w-4 h-4" /> New Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => loadDecksForCategory(cat)}
                >
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base truncate">{cat.name}</h3>
                        <Badge
                          variant={cat.is_published ? "default" : "outline"}
                          className={cat.is_published
                            ? "bg-green-500 hover:bg-green-500 text-white border-green-500"
                            : "text-muted-foreground"}
                        >
                          {cat.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground truncate">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant={cat.is_published ? "outline" : "default"}
                        className={cat.is_published
                          ? "gap-1.5 text-muted-foreground"
                          : "gap-1.5 bg-green-500 hover:bg-green-600 text-white border-0"}
                        onClick={() => handleToggleCategoryPublish(cat)}
                      >
                        {cat.is_published
                          ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</>
                          : <><Globe className="w-3.5 h-3.5" /> Publish</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditCategory(cat)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCategory(cat)}
                      >
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

      {/* ── Decks view ── */}
      {view === "decks" && (
        <>
          {loadingDecks ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : decks.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No quizzes in this category</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a quiz to <span className="font-semibold">{selectedCategory?.name}</span>.
                </p>
                <Button className="mt-4 gap-2" onClick={openCreateDeck}>
                  <Plus className="w-4 h-4" /> New Quiz
                </Button>
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
                        <Badge
                          variant={deck.is_published ? "default" : "outline"}
                          className={deck.is_published
                            ? "bg-green-500 hover:bg-green-500 text-white border-green-500"
                            : "text-muted-foreground"}
                        >
                          {deck.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      {deck.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{deck.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {deck.question_count} question{deck.question_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => loadQuestions(deck)}>
                        Manage Questions
                      </Button>
                      <Button
                        size="sm"
                        variant={deck.is_published ? "outline" : "default"}
                        className={deck.is_published
                          ? "gap-1.5 text-muted-foreground"
                          : "gap-1.5 bg-green-500 hover:bg-green-600 text-white border-0"}
                        onClick={() => handleTogglePublish(deck)}
                      >
                        {deck.is_published
                          ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</>
                          : <><Globe className="w-3.5 h-3.5" /> Publish</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditDeck(deck)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteDeck(deck)}
                      >
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

      {/* ── Questions view ── */}
      {view === "questions" && (
        <>
          {loadingQuestions ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteQuestion(q)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {q.image_url && (
                      <img
                        src={q.image_url}
                        alt="Question image"
                        className="w-full max-h-48 object-contain rounded-lg border bg-muted/20 mb-3"
                      />
                    )}
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
                        {a.is_correct && (
                          <span className="ml-auto text-xs font-semibold text-green-600 dark:text-green-400">
                            Correct
                          </span>
                        )}
                      </div>
                    ))}
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── PDF Quiz Generator ── */}
      <PdfQuizGenerator
        open={pdfGeneratorOpen}
        onOpenChange={setPdfGeneratorOpen}
        onSuccess={() => selectedCategory && loadDecksForCategory(selectedCategory)}
      />

      {/* ── Text Quiz Importer ── */}
      {selectedDeck && (
        <TextQuizImporter
          open={textImporterOpen}
          onOpenChange={setTextImporterOpen}
          deck={selectedDeck}
          existingCount={questions.length}
          onSuccess={() => selectedDeck && loadQuestions(selectedDeck)}
        />
      )}

      {/* ── Category Dialog ── */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Biology, Mathematics, History"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Short description of this category"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={savingCategory}>
              {savingCategory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deck Dialog ── */}
      <Dialog open={deckDialogOpen} onOpenChange={setDeckDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDeck ? "Edit Quiz" : "New Quiz"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Quiz Name *</Label>
              <Input
                placeholder="e.g. Biology Paper 1 2023"
                value={deckForm.name}
                onChange={(e) => setDeckForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={deckForm.subject}
                onValueChange={(val) => setDeckForm((f) => ({ ...f, subject: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="text-xs text-destructive">
                  No categories exist. Create a category first.
                </p>
              )}
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
            <Button onClick={handleSaveDeck} disabled={savingDeck || categories.length === 0}>
              {savingDeck && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingDeck ? "Save Changes" : "Create Quiz"}
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
              <p className="text-xs text-muted-foreground">
                Select the radio button next to the correct answer.
              </p>
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
            <div className="space-y-2">
              <Label>Image (optional)</Label>
              {(imagePreview || existingImageUrl) && (
                <div className="relative w-full rounded-lg overflow-hidden border bg-muted/20">
                  <img
                    src={imagePreview ?? existingImageUrl!}
                    alt="Question preview"
                    className="w-full max-h-48 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setExistingImageUrl(null);
                      if (imageInputRef.current) imageInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 rounded-full bg-background/80 border p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }}
              />
              {!imagePreview && !existingImageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-dashed"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4" /> Upload image
                </Button>
              )}
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
