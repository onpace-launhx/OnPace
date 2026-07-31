"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Plus,
  Save,
  Trash2,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  BookMarked,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Trophy,
  Upload,
  FileText,
  BrainCircuit,
  Search,
  Eye,
  Check
} from "lucide-react";
import { getTranslations } from "@/lib/translations";
import { StudyVisual } from "@/components/ai/StudyVisual";
import type { StudyVisualSpec } from "@/lib/study-visual";

export default function NotesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  const [notes, setNotes] = useState<any[]>([]);
  const [noteSearch, setNoteSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Split-screen navigation states (mobile-responsive)
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [isMobileViewingEditor, setIsMobileViewingEditor] = useState(false);

  // Editor inputs
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editMode, setEditMode] = useState<"write" | "preview">("write");

  // AI Practice Hub active tab: "flashcards" | "quiz"
  const [activeTab, setActiveTab] = useState<"flashcards" | "quiz">("flashcards");

  // Flashcards states
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [practiceCount, setPracticeCount] = useState("6");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz states
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isQuestionAnswered, setIsQuestionAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  // Upload & AI analysis states
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // AI Note Enhancement states
  const [enhancingAI, setEnhancingAI] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<{
    title?: string;
    enhancedContent: string;
    visual?: StudyVisualSpec | null;
  } | null>(null);
  const [studyVisual, setStudyVisual] = useState<StudyVisualSpec | null>(null);
  const [generatingVisual, setGeneratingVisual] = useState(false);

  const handleEnhanceNoteWithAI = async () => {
    if (!content.trim() || content.trim().length < 5) {
      alert(lang === "tr" ? "Not içeriği iyileştirilmeyecek kadar kısa." : "Note content is too short to enhance.");
      return;
    }
    setEnhancingAI(true);
    try {
      const res = await fetch("/api/notes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enhance",
          text: content,
          title: title,
          language: lang,
        })
      });
      const data = await res.json();
      if (data.enhancedContent) {
        setEnhancedResult(data);
      } else {
        alert(data.error || "Enhancement failed.");
      }
    } catch {
      alert("Network error while enhancing note.");
    }
    setEnhancingAI(false);
  };

  const handleGenerateStudyVisual = async () => {
    if (content.trim().length < 5 || generatingVisual) return;
    setGeneratingVisual(true);
    try {
      const response = await fetch("/api/study-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: content, title, language: lang }),
      });
      const data = await response.json();
      if (!response.ok || !data.visual) throw new Error(data.error || "Study visual could not be created.");
      setStudyVisual(data.visual);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Study visual could not be created.");
    } finally {
      setGeneratingVisual(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      const now = new Date();
      const trialEnds = profileData?.trial_ends_at ? new Date(profileData.trial_ends_at) : null;
      const isTrialActive = trialEnds && trialEnds > now;
      const isPro = profileData?.plan === "pro" || profileData?.plan === "founding" || isTrialActive;

      if (!isPro) {
        router.push("/billing");
        return;
      }
      setProfile(profileData);

      // Fetch notes
      const { data: notesData } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (notesData) {
        setNotes(notesData);
        if (notesData.length > 0) {
          handleSelectNote(notesData[0]);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [router, supabase]);

  const handleSelectNote = async (note: any) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setIsMobileViewingEditor(true);
    setIsFlipped(false);
    setActiveCardIndex(0);
    setActiveTab("flashcards");

    // Fetch related flashcards
    const { data: cardData } = await supabase
      .from("flashcards")
      .select("*")
      .eq("note_id", note.id)
      .order("created_at", { ascending: true });
    setFlashcards(cardData || []);

    // Fetch related quizzes
    const { data: quizData } = await supabase
      .from("quizzes")
      .select("*")
      .eq("note_id", note.id)
      .order("created_at", { ascending: false });
    
    if (quizData && quizData.length > 0) {
      setActiveQuiz(quizData[0]);
      setIsQuizFinished(quizData[0].score !== null);
      setQuizScore(quizData[0].score || 0);
      setCurrentQuestionIdx(0);
      setSelectedOptionIdx(null);
      setIsQuestionAnswered(false);
    } else {
      setActiveQuiz(null);
      setIsQuizFinished(false);
      setQuizScore(0);
    }
  };

  const handleCreateNewNote = () => {
    setSelectedNote(null);
    setTitle("New Note");
    setContent("");
    setFlashcards([]);
    setActiveQuiz(null);
    setIsMobileViewingEditor(true);
    setIsFlipped(false);
    setActiveCardIndex(0);
    setActiveTab("flashcards");
  };

  // Helper to convert file to base64 safely
  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processNoteImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      alert("The image must be smaller than 6 MB.");
      return;
    }
    if (uploading || analyzing) return;

    setUploading(true);
    try {
      const base64Data = await getBase64(file);
      let archivedFileUrl: string | null = null;
      const formData = new FormData();
      formData.append("file", file);

      // R2 is optional archival storage. OCR must still work when it is absent.
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          archivedFileUrl = uploadData.url || null;
        }
      } catch {
        // Continue with direct Vision AI analysis.
      }

      setUploading(false);
      setAnalyzing(true);

      const analyzeRes = await fetch("/api/notes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: archivedFileUrl,
          contentType: file.type,
          base64Data,
          language: lang,
        }),
      });

      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok || analyzeData.error) {
        alert(analyzeData.error || "Image analysis failed.");
      } else if (analyzeData.note) {
        setNotes((currentNotes) => [analyzeData.note, ...currentNotes]);
        handleSelectNote(analyzeData.note);
        setEditMode("preview");
        if (analyzeData.visual) setStudyVisual(analyzeData.visual);
      }
    } catch (error) {
      alert(
        "Error processing note file: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await processNoteImage(file);
    event.target.value = "";
  };

  const handleEditorPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/")
    );
    const imageFile = imageItem?.getAsFile();
    if (!imageFile) return;
    event.preventDefault();
    void processNoteImage(imageFile);
  };

  const handleSaveNote = async () => {
    if (!title.trim()) return;
    setSavingNote(true);

    const notePayload = {
      user_id: profile.id,
      title: title.trim(),
      content: content,
      file_url: selectedNote?.file_url || null
    };

    if (selectedNote) {
      const { error } = await supabase
        .from("notes")
        .update(notePayload)
        .eq("id", selectedNote.id);
      
      if (!error) {
        setNotes(notes.map(n => n.id === selectedNote.id ? { ...n, title: title.trim(), content } : n));
      }
    } else {
      const { data, error } = await supabase
        .from("notes")
        .insert([notePayload])
        .select("*")
        .single();
      
      if (!error && data) {
        setNotes([data, ...notes]);
        setSelectedNote(data);
      }
    }
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    setNotes(notes.filter(n => n.id !== noteId));
    await supabase.from("notes").delete().eq("id", noteId);
    
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setTitle("");
      setContent("");
      setFlashcards([]);
      setActiveQuiz(null);
      setIsMobileViewingEditor(false);
    }
  };

  const filteredNotes = notes.filter((note) => {
    const query = noteSearch.trim().toLowerCase();
    return !query || `${note.title || ""} ${note.content || ""}`.toLowerCase().includes(query);
  });

  const handleGenerateCards = async () => {
    if (!selectedNote || !content.trim()) return;
    setGeneratingCards(true);

    try {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_id: selectedNote.id,
          title: selectedNote.title,
          content: selectedNote.content,
          count: Number(practiceCount),
          language: lang,
        })
      });

      const data = await response.json();

      if (data.flashcards) {
        setFlashcards(data.flashcards);
        setActiveCardIndex(0);
        setIsFlipped(false);
      } else {
        alert(data.error || "Card generation failed.");
      }
    } catch {
      alert("Network error.");
    }
    setGeneratingCards(false);
  };

  const handleGenerateQuiz = async () => {
    if (!selectedNote || !content.trim()) return;
    setGeneratingQuiz(true);

    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_id: selectedNote.id,
          title: selectedNote.title,
          content: selectedNote.content,
          count: Number(practiceCount),
          language: lang,
        })
      });

      const data = await response.json();

      if (data.quiz) {
        setActiveQuiz(data.quiz);
        setIsQuizFinished(false);
        setQuizScore(0);
        setCurrentQuestionIdx(0);
        setSelectedOptionIdx(null);
        setIsQuestionAnswered(false);
      } else {
        alert(data.error || "Quiz generation failed.");
      }
    } catch {
      alert("Network error.");
    }
    setGeneratingQuiz(false);
  };

  const handleSelectOption = (idx: number) => {
    if (isQuestionAnswered) return;
    setSelectedOptionIdx(idx);
    setIsQuestionAnswered(true);

    const isCorrect = idx === activeQuiz.questions[currentQuestionIdx].correct_idx;
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = async () => {
    const nextIdx = currentQuestionIdx + 1;
    if (nextIdx < activeQuiz.questions.length) {
      setCurrentQuestionIdx(nextIdx);
      setSelectedOptionIdx(null);
      setIsQuestionAnswered(false);
    } else {
      const finalScore = quizScore;
      setIsQuizFinished(true);

      await supabase
        .from("quizzes")
        .update({ score: finalScore })
        .eq("id", activeQuiz.id);
    }
  };

  const handleRetakeQuiz = () => {
    setIsQuizFinished(false);
    setQuizScore(0);
    setCurrentQuestionIdx(0);
    setSelectedOptionIdx(null);
    setIsQuestionAnswered(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
          <p className="text-sm font-semibold text-gray-500">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  const currentQuestion = activeQuiz?.questions?.[currentQuestionIdx];

  return (
    <main className="flex-1 flex h-screen min-w-0 flex-col overflow-hidden bg-[#F8F9FC] md:flex-row">
      
      {/* 1. Left Sidebar: Notebook list */}
      <aside className={`w-full md:w-72 xl:w-80 border-r border-gray-150 bg-white p-5 flex flex-col justify-between shrink-0 overflow-y-auto ${
        isMobileViewingEditor ? "hidden md:flex" : "flex"
      }`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <BookMarked className="text-brand" size={20} /> {t.notes.title}
            </h1>
            <div className="flex items-center gap-1.5">
              <label
                className="p-2 hover:bg-brand-light hover:text-brand text-gray-500 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Upload Study Note Image"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading || analyzing}
                />
                <Upload size={18} />
              </label>
              <button
                onClick={handleCreateNewNote}
                className="p-2 hover:bg-brand-light hover:text-brand text-gray-500 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title={t.notes.createNote}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={noteSearch}
                onChange={(event) => setNoteSearch(event.target.value)}
                placeholder={lang === "tr" ? "Notlarda ara..." : lang === "es" ? "Buscar notas..." : lang === "zh" ? "搜索笔记..." : "Search notes..."}
                className="w-full rounded-xl border border-gray-150 bg-gray-50 py-2.5 pl-9 pr-3 text-xs text-surface-dark outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
            </div>
            {uploading && (
              <div className="p-3.5 rounded-2xl border border-dashed border-brand/20 bg-brand-light/10 text-brand text-xs font-semibold flex items-center gap-2">
                <Loader2 className="animate-spin h-4 w-4" />
                <span>Uploading to R2...</span>
              </div>
            )}
            {analyzing && (
              <div className="p-3.5 rounded-2xl border border-dashed border-brand/20 bg-brand-light/10 text-brand text-xs font-semibold flex items-center gap-2 animate-pulse">
                <Sparkles className="animate-bounce h-4 w-4 text-brand" />
                <span>AI extracting & summarizing...</span>
              </div>
            )}
            {notes.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                {lang === "zh" ? "您的笔记本是空的。点击 + 添加学习笔记。" : lang === "es" ? "Tu cuaderno está vacío. Haz clic en + para agregar notas de estudio." : "Your notebook is empty. Click + to add study notes."}
              </p>
            ) : filteredNotes.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">{lang === "tr" ? "Aramanızla eşleşen not yok." : "No notes match your search."}</p>
            ) : (
              filteredNotes.map((n) => {
                const isActive = selectedNote?.id === n.id;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleSelectNote(n)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left group relative ${
                      isActive
                        ? "bg-brand/5 border-brand/20 text-brand font-semibold shadow-sm"
                        : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 text-gray-700"
                    }`}
                  >
                    <h3 className="font-semibold text-sm truncate pr-6">{n.title || t.notes.untitled}</h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{n.content || t.notes.emptyContent}</p>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(n.id);
                      }}
                      className="absolute right-3 top-3.5 opacity-0 group-hover:opacity-100 hover:text-red-500 text-gray-400 transition-all p-1 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* 2. Center Column: Sleek Note Editor */}
      <section className={`min-w-0 flex-1 flex flex-col bg-white border-r border-gray-100 overflow-y-auto p-5 sm:p-6 lg:p-7 ${
        isMobileViewingEditor ? "flex" : "hidden md:flex"
      }`}>
      
        {/* Editor controls header */}
        <div className="mb-6 flex shrink-0 flex-col gap-3 border-b border-gray-100 pb-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex min-w-0 items-center gap-3 w-full max-w-xl">
            <button
              onClick={() => setIsMobileViewingEditor(false)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-xl text-gray-500 cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.notes.enterTitle}
              className="text-xl font-bold text-surface-dark outline-none bg-transparent placeholder-gray-300 w-full"
            />
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 2xl:shrink-0 2xl:justify-end">
            <div className="flex p-0.5 bg-gray-100 rounded-xl border border-gray-200">
              <button
                onClick={() => setEditMode("write")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  editMode === "write" ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Write
              </button>
              <button
                onClick={() => setEditMode("preview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  editMode === "preview" ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Preview
              </button>
            </div>

            <button
              onClick={handleEnhanceNoteWithAI}
              disabled={enhancingAI || !content.trim()}
              className="px-3.5 py-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
              title="Enhance & structure note with AI"
            >
              {enhancingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles size={14} className="text-purple-600 animate-pulse" />}
              {lang === "tr" ? "✨ AI ile İyileştir" : "✨ Enhance with AI"}
            </button>

            <button
              onClick={handleGenerateStudyVisual}
              disabled={generatingVisual || !content.trim()}
              className="rounded-xl border border-brand/20 bg-brand/5 px-3.5 py-2.5 text-xs font-bold text-brand transition-all hover:bg-brand/10 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
              title="Generate a structured visual study aid"
            >
              {generatingVisual ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit size={14} />}
              <span>{lang === "tr" ? "Görsel şema" : lang === "es" ? "Esquema visual" : lang === "zh" ? "学习图示" : "Visual diagram"}</span>
            </button>

            <button
              onClick={handleSaveNote}
              disabled={savingNote}
              className="px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
              {savingNote ? t.common.saving : t.notes.saveNote}
            </button>
          </div>
        </div>

        {/* Text editor body */}
        <div className="flex-1 flex flex-col shrink-0 min-h-[300px]">
          {selectedNote?.file_url && (
            <div className="mb-6 p-4 bg-brand-light/10 rounded-2xl border border-brand/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 bg-brand-light rounded-xl flex items-center justify-center text-brand shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">Attached Study File</span>
                  <a
                    href={selectedNote.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-gray-700 hover:text-brand hover:underline truncate max-w-xs sm:max-w-md flex items-center gap-1 mt-0.5"
                  >
                    View Original Upload <Eye size={12} />
                  </a>
                </div>
              </div>
              {selectedNote.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) && (
                <img
                  src={selectedNote.file_url}
                  alt="Attachment Preview"
                  className="h-16 w-16 object-cover rounded-xl border border-gray-200/60 shadow-sm"
                />
              )}
            </div>
          )}
          {editMode === "write" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handleEditorPaste}
              placeholder={t.notes.placeholderText}
              className="w-full flex-1 outline-none text-sm text-surface-dark bg-transparent resize-none leading-relaxed placeholder-gray-400 font-medium font-sans"
            />
          ) : (
            <div className="flex-1 overflow-y-auto min-h-[300px]">
              <MarkdownPreview content={content} />
            </div>
          )}
        </div>
      </section>

      {/* 3. Right Column: Premium AI Practice Hub */}
      {selectedNote && (
        <aside className="w-full md:w-[360px] 2xl:w-[420px] bg-[#F8F9FC] p-5 sm:p-6 flex flex-col shrink-0 overflow-y-auto border-l border-gray-100">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                <BrainCircuit size={18} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-surface-dark">AI Study Center</h2>
                <p className="text-[10px] text-gray-400 font-medium">Practice concepts from this notebook</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-gray-100/60 rounded-xl">
              <button
                onClick={() => setActiveTab("flashcards")}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "flashcards"
                    ? "bg-white text-brand shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.notes.tabs.flashcards}
              </button>
              <button
                onClick={() => setActiveTab("quiz")}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "quiz"
                    ? "bg-white text-brand shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.notes.tabs.quiz}
              </button>
            </div>

            {/* AI Flashcards Cabinet */}
            {activeTab === "flashcards" && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-surface-dark flex items-center gap-1.5">
                        <Sparkles className="text-brand" size={14} /> Flashcard Set
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Quiz yourself to check retention.</p>
                    </div>

                    <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] text-gray-500">
                      <span className="hidden sm:inline">{lang === "tr" ? "Adet" : "Count"}</span>
                      <select value={practiceCount} onChange={(event) => setPracticeCount(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-[10px] text-surface-dark">
                        {[3, 6, 10, 15, 20].map((count) => <option key={count} value={count}>{count}</option>)}
                      </select>
                    </label>
                    <button
                      onClick={handleGenerateCards}
                      disabled={generatingCards || content.trim().length < 20}
                      className="px-3 py-2 rounded-xl bg-brand text-white text-[10px] font-bold hover:bg-brand-hover transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    >
                      {generatingCards ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles size={11} />}
                      {t.notes.flashcards.generate}
                    </button>
                    </div>
                  </div>

                  {flashcards.length > 0 ? (
                    <div className="flex flex-col items-center gap-5 pt-2">
                      <div 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="h-44 w-full bg-transparent cursor-pointer [perspective:1000px] select-none"
                      >
                        <div className={`relative h-full w-full rounded-2xl border border-gray-150 transition-all duration-500 [transform-style:preserve-3d] ${
                          isFlipped ? "[transform:rotateY(180deg)] border-brand/20 shadow-md" : "shadow-sm"
                        }`}>
                          
                          {/* Front: Question */}
                          <div className="absolute inset-0 bg-white rounded-2xl p-5 flex flex-col justify-between items-center text-center [backface-visibility:hidden]">
                            <span className="text-[9px] font-extrabold tracking-widest text-brand uppercase">{t.notes.flashcards.question}</span>
                            <p className="text-xs font-bold text-surface-dark leading-relaxed my-auto px-2">
                              {flashcards[activeCardIndex]?.question}
                            </p>
                            <span className="text-[9px] text-gray-400 font-medium">{t.notes.flashcards.flipPrompt}</span>
                          </div>

                          {/* Back: Answer */}
                          <div className="absolute inset-0 bg-brand-light rounded-2xl p-5 flex flex-col justify-between items-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] border border-brand/10">
                            <span className="text-[9px] font-extrabold tracking-widest text-brand uppercase">{t.notes.flashcards.answer}</span>
                            <p className="text-xs font-bold text-surface-dark leading-relaxed my-auto px-2">
                              {flashcards[activeCardIndex]?.answer}
                            </p>
                            <span className="text-[9px] text-gray-400 font-medium">{t.notes.flashcards.flipBackPrompt}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex items-center justify-between w-full border-t border-gray-100 pt-3">
                        <button
                          disabled={activeCardIndex === 0}
                          onClick={() => {
                            setActiveCardIndex(activeCardIndex - 1);
                            setIsFlipped(false);
                          }}
                          className="p-1.5 border border-gray-200 rounded-lg hover:bg-white active:scale-95 transition-all disabled:opacity-30 cursor-pointer text-gray-500 flex items-center gap-1"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-semibold text-gray-500">
                          {lang === "zh" ? `卡片 ${activeCardIndex + 1} / ${flashcards.length}` : lang === "es" ? `Tarjeta ${activeCardIndex + 1} de ${flashcards.length}` : `Card ${activeCardIndex + 1} of ${flashcards.length}`}
                        </span>
                        <button
                          disabled={activeCardIndex === flashcards.length - 1}
                          onClick={() => {
                            setActiveCardIndex(activeCardIndex + 1);
                            setIsFlipped(false);
                          }}
                          className="p-1.5 border border-gray-200 rounded-lg hover:bg-white active:scale-95 transition-all disabled:opacity-30 cursor-pointer text-gray-500 flex items-center gap-1"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-200 rounded-2xl p-6 text-center text-xs text-gray-400">
                      {t.notes.flashcards.empty}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Practice Quiz Cabinet */}
            {activeTab === "quiz" && (
              <div className="space-y-4">
                
                {/* Generation Block */}
                {!activeQuiz && (
                  <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-extrabold text-surface-dark flex items-center gap-1.5">
                          <HelpCircle className="text-brand" size={14} /> Practice Quiz
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">Generate a quiz from these notes.</p>
                      </div>

                      <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span className="hidden sm:inline">{lang === "tr" ? "Adet" : "Count"}</span>
                        <select value={practiceCount} onChange={(event) => setPracticeCount(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-[10px] text-surface-dark">
                          {[3, 6, 10, 15, 20].map((count) => <option key={count} value={count}>{count}</option>)}
                        </select>
                      </label>
                      <button
                        onClick={handleGenerateQuiz}
                        disabled={generatingQuiz || content.trim().length < 20}
                        className="px-3 py-2 rounded-xl bg-brand text-white text-[10px] font-bold hover:bg-brand-hover transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        {generatingQuiz ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles size={11} />}
                        {t.notes.quiz.generate}
                      </button>
                      </div>
                    </div>

                    <div className="border border-dashed border-gray-200 rounded-2xl p-6 text-center text-xs text-gray-400">
                      {t.notes.quiz.empty}
                    </div>
                  </div>
                )}

                {/* Active Quiz Layout */}
                {activeQuiz && !isQuizFinished && currentQuestion && (
                  <div className="bg-white border border-gray-150 p-5 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">
                      <span>{lang === "zh" ? `问题 ${currentQuestionIdx + 1} / ${activeQuiz.questions.length}` : lang === "es" ? `Pregunta ${currentQuestionIdx + 1} de ${activeQuiz.questions.length}` : `Question ${currentQuestionIdx + 1} of ${activeQuiz.questions.length}`}</span>
                      <span className="text-brand">{t.notes.quiz.score}: {quizScore}</span>
                    </div>

                    <h4 className="text-xs font-bold text-surface-dark leading-relaxed">
                      {currentQuestion.question}
                    </h4>

                    <div className="space-y-2 pt-2">
                      {currentQuestion.options.map((option: string, idx: number) => {
                        const isSelected = selectedOptionIdx === idx;
                        const isCorrectOption = idx === currentQuestion.correct_idx;
                        
                        let borderStyle = "border-gray-200 hover:border-brand/40 text-gray-700 bg-white hover:bg-gray-50/30";
                        if (isQuestionAnswered) {
                          if (isCorrectOption) {
                            borderStyle = "bg-green-50 border-green-500 text-green-700 font-bold";
                          } else if (isSelected) {
                            borderStyle = "bg-red-50 border-red-500 text-red-700 font-bold";
                          } else {
                            borderStyle = "bg-gray-50 border-gray-250 text-gray-400 opacity-60";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            disabled={isQuestionAnswered}
                            onClick={() => handleSelectOption(idx)}
                            className={`w-full p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${borderStyle}`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {/* Reveal Explanation */}
                    {isQuestionAnswered && (
                      <div className="p-3 bg-brand-light/30 border border-brand/10 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center gap-1 font-bold text-brand uppercase text-[10px] tracking-wide">
                          <BrainCircuit size={12} /> {t.notes.quiz.explanation}
                        </div>
                        <p className="text-gray-600 font-medium leading-relaxed">{currentQuestion.explanation}</p>
                        
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={handleNextQuestion}
                            className="px-4 py-2 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer text-[10px]"
                          >
                            {currentQuestionIdx === activeQuiz.questions.length - 1 ? (lang === "zh" ? "完成测验" : lang === "es" ? "Terminar Cuestionario" : "Finish Quiz") : (lang === "zh" ? "下一题" : lang === "es" ? "Siguiente Pregunta" : "Next Question")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Finished Quiz Layout */}
                {activeQuiz && isQuizFinished && (
                  <div className="bg-white border border-gray-150 p-6 rounded-2xl text-center space-y-4 shadow-sm">
                    <div className="h-12 w-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto text-xl font-bold animate-bounce">
                      <Trophy size={22} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-surface-dark">{t.notes.quiz.completed}</h4>
                      <p className="text-xs text-gray-500 mt-1">{t.notes.quiz.correctCount.replace("{score}", String(quizScore)).replace("{total}", String(activeQuiz.questions.length))}</p>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={handleRetakeQuiz}
                        className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                      >
                        {t.notes.quiz.retake}
                      </button>
                      <button
                        onClick={handleGenerateQuiz}
                        disabled={generatingQuiz}
                        className="flex-1 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover cursor-pointer"
                      >
                        {generatingQuiz ? <Loader2 className="h-3 w-3 animate-spin" /> : t.notes.quiz.newQuiz}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </aside>
      )}

      {studyVisual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-surface-dark">{lang === "tr" ? "Görsel çalışma özeti" : "Visual study aid"}</p>
                <p className="mt-0.5 text-xs text-gray-400">{title}</p>
              </div>
              <button onClick={() => setStudyVisual(null)} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200">{t.common.close}</button>
            </div>
            <StudyVisual visual={studyVisual} />
          </div>
        </div>
      )}

      {/* Modal: AI Enhanced Comparison View */}
      {enhancedResult && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="text-purple-600 animate-pulse" size={20} />
                <h3 className="text-base font-bold text-surface-dark">
                  {lang === "tr" ? "AI ile İyileştirilmiş Not Karşılaştırması" : "AI-Enhanced Note Comparison"}
                </h3>
              </div>
              <button
                onClick={() => setEnhancedResult(null)}
                className="text-gray-400 hover:text-gray-600 p-1 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto py-4">
              {/* Original Note */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 space-y-2 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {lang === "tr" ? "Orijinal Notunuz" : "Original Note"}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-surface-dark">{title || "Untitled"}</h4>
                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-sans">
                  {content}
                </div>
              </div>

              {/* AI Enhanced Version */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-2 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={12} /> {lang === "tr" ? "AI Tarafından İyileştirilmiş Versiyon" : "AI Enhanced Version"}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-purple-950">{enhancedResult.title || title}</h4>
                <div className="text-xs text-gray-700 leading-relaxed font-sans">
                  <MarkdownPreview content={enhancedResult.enhancedContent} />
                </div>
                {enhancedResult.visual && (
                  <div className="pt-3">
                    <StudyVisual visual={enhancedResult.visual} />
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-3 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setEnhancedResult(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                {lang === "tr" ? "Orijinali Koru (Kapat)" : "Keep Original"}
              </button>
              <button
                onClick={() => {
                  if (enhancedResult.title) setTitle(enhancedResult.title);
                  setContent(enhancedResult.enhancedContent);
                  if (enhancedResult.visual) setStudyVisual(enhancedResult.visual);
                  setEditMode("preview");
                  setEnhancedResult(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Check size={16} /> {lang === "tr" ? "AI Versiyonunu Uygula" : "Apply AI Version"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <div className="text-surface-dark leading-relaxed space-y-4 font-sans max-w-none">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // 1. Headings
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-2xl font-extrabold text-surface-dark border-b border-gray-100 pb-2 mt-6 mb-3">
              {parseFormatting(trimmed.slice(2))}
            </h1>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-xl font-bold text-surface-dark mt-5 mb-2">
              {parseFormatting(trimmed.slice(3))}
            </h2>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-base font-bold text-surface-dark mt-4 mb-2">
              {parseFormatting(trimmed.slice(4))}
            </h3>
          );
        }

        // 2. List Items
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-4">
              <span className="text-brand font-bold text-sm mt-0.5">•</span>
              <p className="text-sm text-gray-700 leading-relaxed">
                {parseFormatting(trimmed.slice(2))}
              </p>
            </div>
          );
        }

        // 3. Spacers
        if (!trimmed) {
          return <div key={idx} className="h-3" />;
        }

        // 4. Paragraph
        return (
          <p key={idx} className="text-sm text-gray-600 leading-relaxed">
            {parseFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

function parseFormatting(text: string) {
  const parts = [];
  const formatRegex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3/g;
  let match;
  let lastIndex = 0;

  while ((match = formatRegex.exec(text)) !== null) {
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    if (match[1]) {
      // Bold
      parts.push(
        <strong key={matchIndex} className="font-extrabold text-surface-dark">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Italic
      parts.push(
        <em key={matchIndex} className="italic text-gray-750">
          {match[4]}
        </em>
      );
    }

    lastIndex = formatRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
