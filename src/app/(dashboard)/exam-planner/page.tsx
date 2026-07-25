"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, CheckCircle2, ChevronRight, Clock3, Plus, Sparkles, Target, Trash2 } from "lucide-react";

type Exam = { id: string; title: string; exam_date: string; target_score?: string | null; color?: string | null };
type Topic = { id: string; exam_id: string; title: string; importance: number; estimated_minutes: number; mastery_status: "not_started" | "learning" | "review_needed" | "confident" };

const statusLabels: Record<Topic["mastery_status"], Record<string, string>> = {
  not_started: { tr: "Başlanmadı", en: "Not started" },
  learning: { tr: "Çalışılıyor", en: "Learning" },
  review_needed: { tr: "Tekrar gerekli", en: "Needs review" },
  confident: { tr: "Güçlü", en: "Confident" },
};

export default function ExamPlannerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState("tr");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [showExamForm, setShowExamForm] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetScore, setTargetScore] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiTopics, setAiTopics] = useState<Array<{ title: string; importance: number; estimated_minutes: number }>>([]);
  const [generatingAiDraft, setGeneratingAiDraft] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);

  const isTurkish = language === "tr";
  const text = isTurkish ? {
    title: "Sınav Yol Haritası", subtitle: "Sınavına kalan süreyi, konularını ve tekrar ihtiyacını tek yerde yönet.",
    addExam: "Sınav ekle", noExams: "Henüz bir sınav eklemedin.", examName: "Sınav adı", examDate: "Sınav tarihi", target: "Hedef puan (isteğe bağlı)", save: "Sınavı oluştur", cancel: "Vazgeç", aiPrompt: "AI için sınavı veya müfredatı kısaca anlat", aiDraft: "AI ile konu taslağı oluştur", aiWorking: "Taslak hazırlanıyor…", aiTopics: "AI tarafından önerilen konular",
    days: "gün kaldı", today: "bugün", passed: "geçti", topics: "Konular", addTopic: "Konu ekle", topicPlaceholder: "Örn. Türev uygulamaları", noTopics: "Bu sınav için henüz konu eklenmedi.",
    mastery: "Konu durumu", progress: "hazır", minutes: "dk tahmini çalışma", setup: "Önce sınavını ekle", delete: "Sil", estimated: "Tahmini süre", importance: "Önem", error: "Sınav yol haritası yüklenemedi. Önce veritabanı güncellemesini uyguladığından emin ol.",
  } : {
    title: "Exam Roadmap", subtitle: "Manage your countdown, topics, and review needs in one place.",
    addExam: "Add exam", noExams: "You have not added an exam yet.", examName: "Exam name", examDate: "Exam date", target: "Target score (optional)", save: "Create exam", cancel: "Cancel", aiPrompt: "Briefly describe the exam or syllabus for AI", aiDraft: "Create AI topic draft", aiWorking: "Creating draft…", aiTopics: "Topics suggested by AI",
    days: "days left", today: "today", passed: "passed", topics: "Topics", addTopic: "Add topic", topicPlaceholder: "e.g. Applications of derivatives", noTopics: "No topics have been added for this exam yet.",
    mastery: "Topic status", progress: "ready", minutes: "min estimated study", setup: "Add an exam first", delete: "Delete", estimated: "Estimated time", importance: "Importance", error: "The exam roadmap could not load. Confirm that the database migration has been applied first.",
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/login"); return; }
    setUserId(auth.user.id);
    const [{ data: profile }, { data: examRows, error: examsError }] = await Promise.all([
      supabase.from("profiles").select("language").eq("id", auth.user.id).maybeSingle(),
      supabase.from("exam_roadmaps").select("id, title, exam_date, target_score, color").eq("user_id", auth.user.id).order("exam_date", { ascending: true }),
    ]);
    setLanguage(profile?.language || "en");
    if (examsError) { setError(text.error); setLoading(false); return; }
    const loadedExams = (examRows || []) as Exam[];
    setExams(loadedExams);
    const activeId = selectedExamId || loadedExams[0]?.id || "";
    setSelectedExamId(activeId);
    if (activeId) {
      const { data: topicRows, error: topicsError } = await supabase.from("exam_topics").select("*").eq("exam_id", activeId).order("created_at", { ascending: true });
      if (topicsError) setError(text.error);
      setTopics((topicRows || []) as Topic[]);
    } else setTopics([]);
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const selectedExam = exams.find((exam) => exam.id === selectedExamId);
  const dayDelta = selectedExam ? Math.ceil((new Date(`${selectedExam.exam_date}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000) : 0;
  const confidentTopics = topics.filter((topic) => topic.mastery_status === "confident").length;
  const readiness = topics.length ? Math.round((confidentTopics / topics.length) * 100) : 0;
  const estimatedMinutes = topics.reduce((total, topic) => total + Number(topic.estimated_minutes || 0), 0);

  const generateAiDraft = async () => {
    if (!aiDescription.trim() || !examDate) return;
    setGeneratingAiDraft(true);
    setError(null);
    try {
      const response = await fetch("/api/exam-planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiDescription.trim(), examDate, language }),
      });
      const draft = await response.json();
      if (!response.ok) throw new Error(draft.error || text.error);
      setExamTitle(draft.title || examTitle);
      setAiTopics(Array.isArray(draft.topics) ? draft.topics : []);
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : text.error);
    } finally {
      setGeneratingAiDraft(false);
    }
  };

  const createExam = async (event: FormEvent) => {
    event.preventDefault();
    if (!userId || !examTitle.trim() || !examDate) return;
    setSavingExam(true);
    const { data, error: insertError } = await supabase.from("exam_roadmaps").insert({ user_id: userId, title: examTitle.trim(), exam_date: examDate, target_score: targetScore.trim() || null }).select("id, title, exam_date, target_score, color").single();
    if (insertError || !data) { setError(insertError?.message || text.error); setSavingExam(false); return; }
    if (aiTopics.length > 0) {
      const { data: createdTopics, error: topicsError } = await supabase.from("exam_topics").insert(aiTopics.map((topic) => ({
        exam_id: data.id,
        title: topic.title,
        importance: topic.importance,
        estimated_minutes: topic.estimated_minutes,
      }))).select("*");
      if (topicsError) setError(topicsError.message);
      else setTopics((createdTopics || []) as Topic[]);
    }
    setExams((current) => [...current, data as Exam].sort((first, second) => first.exam_date.localeCompare(second.exam_date)));
    setSelectedExamId(data.id);
    setTopics([]);
    setExamTitle(""); setExamDate(""); setTargetScore(""); setAiDescription(""); setAiTopics([]); setShowExamForm(false); setSavingExam(false);
  };

  const addTopic = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedExamId || !topicTitle.trim()) return;
    setAddingTopic(true);
    const { data, error: insertError } = await supabase.from("exam_topics").insert({ exam_id: selectedExamId, title: topicTitle.trim() }).select("*").single();
    if (insertError || !data) setError(insertError?.message || text.error);
    else { setTopics((current) => [...current, data as Topic]); setTopicTitle(""); }
    setAddingTopic(false);
  };

  const updateTopicStatus = async (topic: Topic, masteryStatus: Topic["mastery_status"]) => {
    setTopics((current) => current.map((item) => item.id === topic.id ? { ...item, mastery_status: masteryStatus } : item));
    const { error: updateError } = await supabase.from("exam_topics").update({ mastery_status: masteryStatus }).eq("id", topic.id);
    if (updateError) { setError(updateError.message); void loadData(); }
  };

  const deleteTopic = async (topicId: string) => {
    setTopics((current) => current.filter((topic) => topic.id !== topicId));
    const { error: deleteError } = await supabase.from("exam_topics").delete().eq("id", topicId);
    if (deleteError) { setError(deleteError.message); void loadData(); }
  };

  if (loading) return <div className="flex flex-1 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" /></div>;

  return <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10"><div className="mx-auto max-w-6xl space-y-7">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand"><Target size={14} /> {text.title}</div><h1 className="text-3xl font-extrabold tracking-tight text-surface-dark">{text.title}</h1><p className="mt-1 text-sm text-gray-500">{text.subtitle}</p></div><button type="button" onClick={() => setShowExamForm((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-hover"><Plus size={17} /> {text.addExam}</button></header>

    {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}
    {showExamForm && <form onSubmit={createExam} className="space-y-4 rounded-3xl border border-brand/20 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input required value={examTitle} onChange={(event) => setExamTitle(event.target.value)} placeholder={text.examName} className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-500 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
        <input required type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
        <input value={targetScore} onChange={(event) => setTargetScore(event.target.value)} placeholder={text.target} className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-500 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
      </div>
      <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3">
        <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-purple-800"><Sparkles size={14} /> {text.aiPrompt}</label>
        <div className="flex flex-col gap-2 sm:flex-row"><input value={aiDescription} onChange={(event) => setAiDescription(event.target.value)} placeholder={isTurkish ? "Örn. TYT matematik; problemler ve geometri konularım eksik." : "e.g. AP Biology; I need help with genetics and ecology."} className="min-w-0 flex-1 rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-500 outline-none focus:border-purple-500" /><button type="button" disabled={generatingAiDraft || !aiDescription.trim() || !examDate} onClick={generateAiDraft} className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">{generatingAiDraft ? text.aiWorking : text.aiDraft}</button></div>
        {!examDate && <p className="mt-2 text-[11px] font-medium text-purple-700">{isTurkish ? "AI taslağı için önce sınav tarihini seç." : "Choose an exam date before generating a draft."}</p>}
        {aiTopics.length > 0 && <div className="mt-3"><p className="mb-2 text-xs font-bold text-purple-800">{text.aiTopics}</p><div className="flex flex-wrap gap-1.5">{aiTopics.map((topic, index) => <span key={`${topic.title}-${index}`} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-purple-700 ring-1 ring-purple-100">{topic.title}</span>)}</div></div>}
      </div>
      <div className="flex justify-end gap-2"><button disabled={savingExam} className="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{savingExam ? "…" : text.save}</button><button type="button" onClick={() => setShowExamForm(false)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700">{text.cancel}</button></div>
    </form>}

    {exams.length === 0 ? <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center"><CalendarDays className="mx-auto mb-3 text-brand" size={32} /><p className="font-bold text-surface-dark">{text.noExams}</p><p className="mt-1 text-sm text-gray-500">{text.setup}</p></div> : <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_1fr]">
      <aside className="space-y-2 rounded-3xl border border-gray-100 bg-white p-3 shadow-sm">{exams.map((exam) => <button key={exam.id} type="button" onClick={() => { setSelectedExamId(exam.id); setTopics([]); void loadData(); }} className={`w-full rounded-2xl border p-4 text-left transition-colors ${exam.id === selectedExamId ? "border-brand bg-brand/5" : "border-transparent hover:bg-gray-50"}`}><p className="truncate text-sm font-bold text-surface-dark">{exam.title}</p><p className="mt-1 text-xs text-gray-400">{new Date(`${exam.exam_date}T00:00:00`).toLocaleDateString(isTurkish ? "tr-TR" : "en-US")}</p></button>)}</aside>
      <section className="space-y-5"><div className="rounded-3xl bg-gradient-to-br from-brand to-indigo-700 p-6 text-white shadow-lg"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-white/70">{selectedExam?.target_score ? `${text.target}: ${selectedExam.target_score}` : text.title}</p><h2 className="mt-1 text-2xl font-extrabold">{selectedExam?.title}</h2></div><CalendarDays className="text-white/80" /></div><div className="mt-7 flex flex-wrap gap-6"><div><p className="text-4xl font-extrabold">{Math.abs(dayDelta)}</p><p className="text-sm text-white/75">{dayDelta > 0 ? text.days : dayDelta === 0 ? text.today : text.passed}</p></div><div><p className="text-4xl font-extrabold">{readiness}%</p><p className="text-sm text-white/75">{text.progress}</p></div><div><p className="text-4xl font-extrabold">{estimatedMinutes}</p><p className="text-sm text-white/75">{text.minutes}</p></div></div></div>
      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="font-extrabold text-surface-dark">{text.topics}</h3><p className="mt-0.5 text-xs text-gray-400">{topics.length} {isTurkish ? "konu" : "topics"}</p></div><Sparkles className="text-brand" size={18} /></div><form onSubmit={addTopic} className="mt-5 flex gap-2"><input value={topicTitle} onChange={(event) => setTopicTitle(event.target.value)} placeholder={text.topicPlaceholder} className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" /><button disabled={addingTopic} className="rounded-xl bg-brand px-4 text-xs font-bold text-white disabled:opacity-60">{addingTopic ? "…" : text.addTopic}</button></form><div className="mt-4 space-y-2">{topics.length === 0 ? <p className="rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-400">{text.noTopics}</p> : topics.map((topic) => <div key={topic.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-surface-dark">{topic.title}</p><p className="mt-1 flex items-center gap-1 text-xs text-gray-400"><Clock3 size={12} /> {topic.estimated_minutes} {text.minutes}</p></div><select value={topic.mastery_status} onChange={(event) => updateTopicStatus(topic, event.target.value as Topic["mastery_status"])} className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-surface-dark outline-none">{Object.keys(statusLabels).map((status) => <option key={status} value={status}>{statusLabels[status as Topic["mastery_status"]][isTurkish ? "tr" : "en"]}</option>)}</select><button type="button" onClick={() => deleteTopic(topic.id)} className="rounded-xl p-2 text-gray-300 hover:bg-red-50 hover:text-red-500" aria-label={text.delete}><Trash2 size={16} /></button></div>)}</div></div></section>
    </div>}
  </div></main>;
}
