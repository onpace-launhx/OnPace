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
  Trophy
} from "lucide-react";
import { getTranslations } from "@/lib/translations";

export default function NotesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Split-screen navigation states (mobile-responsive)
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [isMobileViewingEditor, setIsMobileViewingEditor] = useState(false);

  // Editor inputs
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Bottom drawer active tab: "flashcards" | "quiz"
  const [activeTab, setActiveTab] = useState<"flashcards" | "quiz">("flashcards");

  // Flashcards states
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [generatingCards, setGeneratingCards] = useState(false);
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

  const handleSaveNote = async () => {
    if (!title.trim()) return;
    setSavingNote(true);

    const notePayload = {
      user_id: profile.id,
      title: title.trim(),
      content: content
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
          content: selectedNote.content
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
          content: selectedNote.content
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
      // Save score in database
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
      <div className="flex h-screen w-full items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  const currentQuestion = activeQuiz?.questions?.[currentQuestionIdx];

  return (
    <main className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden bg-surface-secondary">
      
      {/* Left Sidebar: Notebook list */}
      <aside className={`w-full md:w-80 border-r border-gray-200 bg-white p-5 flex flex-col justify-between shrink-0 overflow-y-auto ${
        isMobileViewingEditor ? "hidden md:flex" : "flex"
      }`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-surface-dark flex items-center gap-2">
              <BookMarked className="text-brand" /> {t.notes.title}
            </h1>
            <button
              onClick={handleCreateNewNote}
              className="p-1.5 hover:bg-brand-light hover:text-brand text-gray-500 rounded-lg transition-all cursor-pointer"
              title={t.notes.createNote}
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                {lang === "zh" ? "您的笔记本是空的。点击 + 添加学习笔记。" : lang === "es" ? "Tu cuaderno está vacío. Haz clic en + para agregar notas de estudio." : "Your notebook is empty. Click + to add study notes."}
              </p>
            ) : (
              notes.map((n) => {
                const isActive = selectedNote?.id === n.id;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleSelectNote(n)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left group relative ${
                      isActive
                        ? "bg-brand-light/30 border-brand/20 text-brand"
                        : "bg-white border-gray-100 hover:border-gray-200 text-gray-700"
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

      {/* Right Column: Note Editor & AI Tools Drawer */}
      <section className={`flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 lg:p-8 ${
        isMobileViewingEditor ? "flex" : "hidden md:flex"
      }`}>
      
        {/* Editor controls header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileViewingEditor(false)}
              className="md:hidden p-2 hover:bg-gray-150 rounded-xl text-gray-500 cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.notes.enterTitle}
              className="text-lg font-bold text-surface-dark outline-none bg-transparent placeholder-gray-300 w-full"
            />
          </div>

          <button
            onClick={handleSaveNote}
            disabled={savingNote}
            className="px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {savingNote ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Save size={14} />}
            {savingNote ? t.common.saving : t.notes.saveNote}
          </button>
        </div>

        {/* Text editor body */}
        <div className="flex-1 py-4 flex flex-col shrink-0 min-h-[220px]">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t.notes.placeholderText}
            className="w-full flex-1 outline-none text-sm text-surface-dark bg-transparent resize-none leading-relaxed placeholder-gray-400 font-medium"
          />
        </div>

        {/* Tab Controls Drawer */}
        {selectedNote && (
          <div className="border-t border-gray-150 pt-6 mt-6 shrink-0 space-y-4">
            
            {/* Tab Swappers */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <button
                onClick={() => setActiveTab("flashcards")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "flashcards"
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {t.notes.tabs.flashcards}
              </button>
              <button
                onClick={() => setActiveTab("quiz")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "quiz"
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {t.notes.tabs.quiz}
              </button>
            </div>

            {/* Flashcards Content Panel */}
            {activeTab === "flashcards" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-surface-dark flex items-center gap-1.5">
                      <Sparkles className="text-brand animate-pulse" size={16} /> {t.notes.flashcards.title}
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.notes.flashcards.desc}</p>
                  </div>

                  <button
                    onClick={handleGenerateCards}
                    disabled={generatingCards || content.trim().length < 20}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-tr from-brand to-brand-dark text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 self-start cursor-pointer disabled:opacity-50"
                  >
                    {generatingCards ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles size={14} />}
                    {t.notes.flashcards.generate}
                  </button>
                </div>

                {flashcards.length > 0 ? (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div 
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="h-36 max-w-md w-full bg-transparent cursor-pointer [perspective:1000px] select-none"
                    >
                      <div className={`relative h-full w-full rounded-2xl shadow-sm border border-gray-150 transition-all duration-500 [transform-style:preserve-3d] ${
                        isFlipped ? "[transform:rotateY(180deg)]" : ""
                      }`}>
                        <div className="absolute inset-0 bg-white rounded-2xl p-5 flex flex-col justify-between items-center text-center [backface-visibility:hidden]">
                          <span className="text-[9px] font-bold tracking-widest text-brand uppercase">{t.notes.flashcards.question}</span>
                          <p className="text-sm font-bold text-surface-dark leading-snug my-auto px-4">
                            {flashcards[activeCardIndex]?.question}
                          </p>
                          <span className="text-[9px] text-gray-400">{t.notes.flashcards.flipPrompt}</span>
                        </div>
                        <div className="absolute inset-0 bg-brand-light rounded-2xl p-5 flex flex-col justify-between items-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] border border-brand/10">
                          <span className="text-[9px] font-bold tracking-widest text-brand uppercase">{t.notes.flashcards.answer}</span>
                          <p className="text-sm font-semibold text-surface-dark leading-snug my-auto px-4">
                            {flashcards[activeCardIndex]?.answer}
                          </p>
                          <span className="text-[9px] text-gray-400">{t.notes.flashcards.flipBackPrompt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        disabled={activeCardIndex === 0}
                        onClick={() => {
                          setActiveCardIndex(activeCardIndex - 1);
                          setIsFlipped(false);
                        }}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-white active:scale-95 transition-all disabled:opacity-30 cursor-pointer text-gray-500"
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
                        className="p-2 border border-gray-200 rounded-lg hover:bg-white active:scale-95 transition-all disabled:opacity-30 cursor-pointer text-gray-500"
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
            )}

            {/* AI Practice Quiz Content Panel */}
            {activeTab === "quiz" && (
              <div className="space-y-4">
                
                {/* Generation Block */}
                {!activeQuiz && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-surface-dark flex items-center gap-1.5">
                        <HelpCircle className="text-brand animate-pulse" size={16} /> {t.notes.quiz.title}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">{t.notes.quiz.desc}</p>
                    </div>

                    <button
                      onClick={handleGenerateQuiz}
                      disabled={generatingQuiz || content.trim().length < 20}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-tr from-brand to-brand-dark text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 self-start cursor-pointer"
                    >
                      {generatingQuiz ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles size={14} />}
                      {t.notes.quiz.generate}
                    </button>
                  </div>
                )}

                {/* Active Quiz Layout */}
                {activeQuiz && !isQuizFinished && currentQuestion && (
                  <div className="bg-white border border-gray-150 p-5 rounded-2xl space-y-4 shadow-sm max-w-2xl mx-auto">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wide">
                      <span>{lang === "zh" ? `问题 ${currentQuestionIdx + 1} / ${activeQuiz.questions.length}` : lang === "es" ? `Pregunta ${currentQuestionIdx + 1} de ${activeQuiz.questions.length}` : `Question ${currentQuestionIdx + 1} of ${activeQuiz.questions.length}`}</span>
                      <span>{t.notes.quiz.score}: {quizScore}</span>
                    </div>

                    <h4 className="text-sm font-bold text-surface-dark leading-snug">
                      {currentQuestion.question}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {currentQuestion.options.map((option: string, idx: number) => {
                        const isSelected = selectedOptionIdx === idx;
                        const isCorrectOption = idx === currentQuestion.correct_idx;
                        
                        let borderStyle = "border-gray-200 hover:border-brand/40 text-gray-700 bg-white";
                        if (isQuestionAnswered) {
                          if (isCorrectOption) {
                            borderStyle = "bg-green-50 border-green-500 text-green-700 font-bold";
                          } else if (isSelected) {
                            borderStyle = "bg-red-50 border-red-500 text-red-700 font-bold";
                          } else {
                            borderStyle = "bg-gray-50 border-gray-200 text-gray-400 opacity-60";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            disabled={isQuestionAnswered}
                            onClick={() => handleSelectOption(idx)}
                            className={`w-full p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${borderStyle}`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {/* Reveal Explanation */}
                    {isQuestionAnswered && (
                      <div className="p-3 bg-brand-light/30 border border-brand/10 rounded-xl space-y-1 text-xs">
                        <p className="font-bold text-brand">{t.notes.quiz.explanation}:</p>
                        <p className="text-gray-600 font-semibold">{currentQuestion.explanation}</p>
                        
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={handleNextQuestion}
                            className="px-4 py-2 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover active:scale-95 transition-all cursor-pointer text-[10px]"
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
                  <div className="bg-white border border-gray-150 p-6 rounded-2xl text-center space-y-4 max-w-sm mx-auto shadow-sm">
                    <div className="h-12 w-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto text-xl font-bold animate-bounce">
                      <Trophy size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-surface-dark">{t.notes.quiz.completed}</h4>
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
        )}

      </section>
    </main>
  );
}
