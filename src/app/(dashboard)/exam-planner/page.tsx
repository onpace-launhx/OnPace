"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { localeForLanguage, localized, normalizeLanguage } from "@/lib/i18n";

type Exam = {
  id: string;
  title: string;
  exam_date: string;
  target_score?: string | null;
  color?: string | null;
};

type Topic = {
  id: string;
  exam_id: string;
  title: string;
  importance: number;
  estimated_minutes: number;
  mastery_status: "not_started" | "learning" | "review_needed" | "confident";
};

const statusLabels: Record<Topic["mastery_status"], Record<"en" | "tr" | "es" | "zh", string>> = {
  not_started: { en: "Not started", tr: "Başlanmadı", es: "Sin empezar", zh: "未开始" },
  learning: { en: "Learning", tr: "Çalışılıyor", es: "Aprendiendo", zh: "学习中" },
  review_needed: { en: "Needs review", tr: "Tekrar gerekli", es: "Necesita repaso", zh: "需要复习" },
  confident: { en: "Confident", tr: "Güçlü", es: "Dominado", zh: "已掌握" },
};

const defaultExamColor = "#4F46E5";

export default function ExamPlannerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [savingExam, setSavingExam] = useState(false);
  const [deletingExam, setDeletingExam] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetScore, setTargetScore] = useState("");
  const [examColor, setExamColor] = useState(defaultExamColor);
  const [aiDescription, setAiDescription] = useState("");
  const [aiTopics, setAiTopics] = useState<
    Array<{ title: string; importance: number; estimated_minutes: number }>
  >([]);
  const [generatingAiDraft, setGeneratingAiDraft] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);

  const lang = normalizeLanguage(language);
  const text = localized(lang, {
    en: {
      title: "Exam Roadmap",
      subtitle: "Manage countdowns, topics, and review needs in one place.",
      addExam: "Add exam",
      editExam: "Edit exam",
      deleteExam: "Delete exam",
      deleteConfirm: "Delete this exam and all of its topics and plan blocks? This cannot be undone.",
      noExams: "You have not added an exam yet.",
      examName: "Exam name",
      examDate: "Exam date",
      target: "Target score (optional)",
      color: "Roadmap color",
      create: "Create exam",
      update: "Save exam changes",
      cancel: "Cancel",
      aiPrompt: "Briefly describe the exam or syllabus for AI",
      aiPlaceholder: "e.g. AP Biology; I need help with genetics and ecology.",
      aiDraft: "Create AI topic draft",
      aiWorking: "Creating draft…",
      aiTopics: "Topics suggested by AI",
      aiDateHint: "Choose an exam date before generating a draft.",
      days: "days left",
      today: "today",
      passed: "passed",
      topics: "Topics",
      topicCount: "topics",
      addTopic: "Add topic",
      topicPlaceholder: "e.g. Applications of derivatives",
      noTopics: "No topics have been added for this exam yet.",
      progress: "ready",
      minutes: "min estimated study",
      setup: "Add an exam first",
      delete: "Delete",
      loadError: "The exam roadmap could not load. Confirm that its database migration has been applied.",
      saveError: "The exam could not be saved.",
      deleteError: "The exam could not be deleted.",
    },
    tr: {
      title: "Sınav Yol Haritası",
      subtitle: "Sınava kalan süreyi, konuları ve tekrar ihtiyacını tek yerde yönet.",
      addExam: "Sınav ekle",
      editExam: "Sınavı düzenle",
      deleteExam: "Sınavı sil",
      deleteConfirm: "Bu sınav ve bağlı tüm konu ve plan blokları silinsin mi? Bu işlem geri alınamaz.",
      noExams: "Henüz bir sınav eklemedin.",
      examName: "Sınav adı",
      examDate: "Sınav tarihi",
      target: "Hedef puan (isteğe bağlı)",
      color: "Yol haritası rengi",
      create: "Sınavı oluştur",
      update: "Sınav değişikliklerini kaydet",
      cancel: "Vazgeç",
      aiPrompt: "AI için sınavı veya müfredatı kısaca anlat",
      aiPlaceholder: "Örn. TYT matematik; problemler ve geometri konularım eksik.",
      aiDraft: "AI ile konu taslağı oluştur",
      aiWorking: "Taslak hazırlanıyor…",
      aiTopics: "AI tarafından önerilen konular",
      aiDateHint: "AI taslağı için önce sınav tarihini seç.",
      days: "gün kaldı",
      today: "bugün",
      passed: "geçti",
      topics: "Konular",
      topicCount: "konu",
      addTopic: "Konu ekle",
      topicPlaceholder: "Örn. Türev uygulamaları",
      noTopics: "Bu sınav için henüz konu eklenmedi.",
      progress: "hazır",
      minutes: "dk tahmini çalışma",
      setup: "Önce sınavını ekle",
      delete: "Sil",
      loadError: "Sınav yol haritası yüklenemedi. Veritabanı güncellemesinin uygulandığını doğrula.",
      saveError: "Sınav kaydedilemedi.",
      deleteError: "Sınav silinemedi.",
    },
    es: {
      title: "Ruta de Exámenes",
      subtitle: "Gestiona la cuenta atrás, los temas y los repasos en un solo lugar.",
      addExam: "Añadir examen",
      editExam: "Editar examen",
      deleteExam: "Eliminar examen",
      deleteConfirm: "¿Eliminar este examen y todos sus temas y bloques de planificación? No se puede deshacer.",
      noExams: "Todavía no has añadido un examen.",
      examName: "Nombre del examen",
      examDate: "Fecha del examen",
      target: "Puntuación objetivo (opcional)",
      color: "Color de la ruta",
      create: "Crear examen",
      update: "Guardar cambios",
      cancel: "Cancelar",
      aiPrompt: "Describe brevemente el examen o temario para la IA",
      aiPlaceholder: "p. ej. Biología AP; necesito ayuda con genética y ecología.",
      aiDraft: "Crear borrador de temas con IA",
      aiWorking: "Creando borrador…",
      aiTopics: "Temas sugeridos por la IA",
      aiDateHint: "Elige una fecha antes de generar el borrador.",
      days: "días restantes",
      today: "hoy",
      passed: "pasado",
      topics: "Temas",
      topicCount: "temas",
      addTopic: "Añadir tema",
      topicPlaceholder: "p. ej. Aplicaciones de derivadas",
      noTopics: "Todavía no hay temas para este examen.",
      progress: "preparado",
      minutes: "min de estudio estimado",
      setup: "Añade primero un examen",
      delete: "Eliminar",
      loadError: "No se pudo cargar la ruta. Comprueba que la actualización de base de datos esté aplicada.",
      saveError: "No se pudo guardar el examen.",
      deleteError: "No se pudo eliminar el examen.",
    },
    zh: {
      title: "考试路线图",
      subtitle: "集中管理考试倒计时、知识点与复习需求。",
      addExam: "添加考试",
      editExam: "编辑考试",
      deleteExam: "删除考试",
      deleteConfirm: "要删除此考试以及全部知识点和计划吗？此操作无法撤销。",
      noExams: "你还没有添加考试。",
      examName: "考试名称",
      examDate: "考试日期",
      target: "目标分数（可选）",
      color: "路线图颜色",
      create: "创建考试",
      update: "保存考试更改",
      cancel: "取消",
      aiPrompt: "向 AI 简要说明考试或大纲",
      aiPlaceholder: "例如：AP 生物，需要加强遗传学和生态学。",
      aiDraft: "使用 AI 生成知识点草稿",
      aiWorking: "正在生成草稿…",
      aiTopics: "AI 建议的知识点",
      aiDateHint: "请先选择考试日期再生成草稿。",
      days: "天后考试",
      today: "今天",
      passed: "已结束",
      topics: "知识点",
      topicCount: "个知识点",
      addTopic: "添加知识点",
      topicPlaceholder: "例如：导数的应用",
      noTopics: "此考试还没有知识点。",
      progress: "已准备",
      minutes: "分钟预计学习",
      setup: "请先添加考试",
      delete: "删除",
      loadError: "无法加载考试路线图，请确认数据库更新已应用。",
      saveError: "无法保存考试。",
      deleteError: "无法删除考试。",
    },
  });

  const loadTopics = async (examId: string) => {
    if (!examId) {
      setTopics([]);
      return;
    }
    const { data, error: topicsError } = await supabase
      .from("exam_topics")
      .select("*")
      .eq("exam_id", examId)
      .order("created_at", { ascending: true });
    if (topicsError) setError(topicsError.message || text.loadError);
    setTopics((data || []) as Topic[]);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);
    const [{ data: profile }, { data: examRows, error: examsError }] =
      await Promise.all([
        supabase.from("profiles").select("language").eq("id", user.id).maybeSingle(),
        supabase
          .from("exam_roadmaps")
          .select("id, title, exam_date, target_score, color")
          .eq("user_id", user.id)
          .order("exam_date", { ascending: true }),
      ]);
    setLanguage(profile?.language || "en");
    if (examsError) {
      setError(text.loadError);
      setLoading(false);
      return;
    }
    const loadedExams = (examRows || []) as Exam[];
    const activeId =
      loadedExams.find((exam) => exam.id === selectedExamId)?.id ||
      loadedExams[0]?.id ||
      "";
    setExams(loadedExams);
    setSelectedExamId(activeId);
    await loadTopics(activeId);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // The Supabase client is a browser singleton; this initial load runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedExam = exams.find((exam) => exam.id === selectedExamId);
  const dayDelta = selectedExam
    ? Math.ceil(
        (new Date(`${selectedExam.exam_date}T00:00:00`).getTime() -
          new Date(new Date().toDateString()).getTime()) /
          86_400_000
      )
    : 0;
  const confidentTopics = topics.filter(
    (topic) => topic.mastery_status === "confident"
  ).length;
  const readiness = topics.length
    ? Math.round((confidentTopics / topics.length) * 100)
    : 0;
  const estimatedMinutes = topics.reduce(
    (total, topic) => total + Number(topic.estimated_minutes || 0),
    0
  );

  const sortedExams = useMemo(
    () => [...exams].sort((first, second) => first.exam_date.localeCompare(second.exam_date)),
    [exams]
  );

  const resetExamForm = () => {
    setEditingExamId(null);
    setExamTitle("");
    setExamDate("");
    setTargetScore("");
    setExamColor(defaultExamColor);
    setAiDescription("");
    setAiTopics([]);
  };

  const openCreateExam = () => {
    resetExamForm();
    setShowExamForm(true);
  };

  const openEditExam = () => {
    if (!selectedExam) return;
    setEditingExamId(selectedExam.id);
    setExamTitle(selectedExam.title);
    setExamDate(selectedExam.exam_date);
    setTargetScore(selectedExam.target_score || "");
    setExamColor(selectedExam.color || defaultExamColor);
    setAiDescription("");
    setAiTopics([]);
    setShowExamForm(true);
  };

  const generateAiDraft = async () => {
    if (!aiDescription.trim() || !examDate) return;
    setGeneratingAiDraft(true);
    setError(null);
    try {
      const response = await fetch("/api/exam-planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: aiDescription.trim(),
          examDate,
          language: lang,
        }),
      });
      const draft = await response.json().catch(() => null);
      if (!response.ok) throw new Error(draft?.error || text.loadError);
      setExamTitle(draft?.title || examTitle);
      setAiTopics(Array.isArray(draft?.topics) ? draft.topics : []);
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : text.loadError);
    } finally {
      setGeneratingAiDraft(false);
    }
  };

  const saveExam = async (event: FormEvent) => {
    event.preventDefault();
    if (!userId || !examTitle.trim() || !examDate) return;
    setSavingExam(true);
    setError(null);
    const values = {
      title: examTitle.trim(),
      exam_date: examDate,
      target_score: targetScore.trim() || null,
      color: examColor,
      updated_at: new Date().toISOString(),
    };

    if (editingExamId) {
      const { data, error: updateError } = await supabase
        .from("exam_roadmaps")
        .update(values)
        .eq("id", editingExamId)
        .eq("user_id", userId)
        .select("id, title, exam_date, target_score, color")
        .single();
      if (updateError || !data) {
        setError(updateError?.message || text.saveError);
      } else {
        setExams((current) =>
          current.map((exam) => (exam.id === editingExamId ? (data as Exam) : exam))
        );
        setShowExamForm(false);
        resetExamForm();
      }
      setSavingExam(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("exam_roadmaps")
      .insert({ user_id: userId, ...values })
      .select("id, title, exam_date, target_score, color")
      .single();
    if (insertError || !data) {
      setError(insertError?.message || text.saveError);
      setSavingExam(false);
      return;
    }

    let createdTopics: Topic[] = [];
    if (aiTopics.length > 0) {
      const { data: topicRows, error: topicsError } = await supabase
        .from("exam_topics")
        .insert(
          aiTopics.map((topic) => ({
            exam_id: data.id,
            title: topic.title,
            importance: topic.importance,
            estimated_minutes: topic.estimated_minutes,
          }))
        )
        .select("*");
      if (topicsError) setError(topicsError.message);
      createdTopics = (topicRows || []) as Topic[];
    }
    setExams((current) => [...current, data as Exam]);
    setSelectedExamId(data.id);
    setTopics(createdTopics);
    setShowExamForm(false);
    resetExamForm();
    setSavingExam(false);
  };

  const deleteExam = async () => {
    if (!selectedExam || !window.confirm(text.deleteConfirm)) return;
    setDeletingExam(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from("exam_roadmaps")
      .delete()
      .eq("id", selectedExam.id);
    if (deleteError) {
      setError(deleteError.message || text.deleteError);
      setDeletingExam(false);
      return;
    }
    const remaining = exams.filter((exam) => exam.id !== selectedExam.id);
    const nextId = remaining[0]?.id || "";
    setExams(remaining);
    setSelectedExamId(nextId);
    await loadTopics(nextId);
    setDeletingExam(false);
  };

  const addTopic = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedExamId || !topicTitle.trim()) return;
    setAddingTopic(true);
    const { data, error: insertError } = await supabase
      .from("exam_topics")
      .insert({ exam_id: selectedExamId, title: topicTitle.trim() })
      .select("*")
      .single();
    if (insertError || !data) {
      setError(insertError?.message || text.loadError);
    } else {
      setTopics((current) => [...current, data as Topic]);
      setTopicTitle("");
    }
    setAddingTopic(false);
  };

  const updateTopicStatus = async (
    topic: Topic,
    masteryStatus: Topic["mastery_status"]
  ) => {
    const previousTopics = topics;
    setTopics((current) =>
      current.map((item) =>
        item.id === topic.id ? { ...item, mastery_status: masteryStatus } : item
      )
    );
    const { error: updateError } = await supabase
      .from("exam_topics")
      .update({ mastery_status: masteryStatus, updated_at: new Date().toISOString() })
      .eq("id", topic.id);
    if (updateError) {
      setError(updateError.message);
      setTopics(previousTopics);
    }
  };

  const deleteTopic = async (topicId: string) => {
    const previousTopics = topics;
    setTopics((current) => current.filter((topic) => topic.id !== topicId));
    const { error: deleteError } = await supabase
      .from("exam_topics")
      .delete()
      .eq("id", topicId);
    if (deleteError) {
      setError(deleteError.message);
      setTopics(previousTopics);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
              <Target size={14} /> {text.title}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-surface-dark">{text.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{text.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={openCreateExam}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-hover"
          >
            <Plus size={17} /> {text.addExam}
          </button>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {showExamForm && (
          <form
            onSubmit={saveExam}
            className="space-y-4 rounded-3xl border border-brand/20 bg-white p-5 shadow-sm"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_12rem_1fr_7rem]">
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-gray-500">{text.examName}</span>
                <input
                  required
                  maxLength={160}
                  value={examTitle}
                  onChange={(event) => setExamTitle(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-900 outline-none focus:border-brand"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-gray-500">{text.examDate}</span>
                <input
                  required
                  type="date"
                  value={examDate}
                  onChange={(event) => setExamDate(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-900 outline-none focus:border-brand"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-gray-500">{text.target}</span>
                <input
                  value={targetScore}
                  maxLength={100}
                  onChange={(event) => setTargetScore(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-900 outline-none focus:border-brand"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-gray-500">{text.color}</span>
                <input
                  type="color"
                  value={examColor}
                  onChange={(event) => setExamColor(event.target.value)}
                  className="h-[46px] w-full rounded-xl border border-gray-300 bg-white p-1.5"
                />
              </label>
            </div>

            {!editingExamId && (
              <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3">
                <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-purple-800">
                  <Sparkles size={14} /> {text.aiPrompt}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={aiDescription}
                    onChange={(event) => setAiDescription(event.target.value)}
                    placeholder={text.aiPlaceholder}
                    className="min-w-0 flex-1 rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    disabled={generatingAiDraft || !aiDescription.trim() || !examDate}
                    onClick={generateAiDraft}
                    className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {generatingAiDraft ? text.aiWorking : text.aiDraft}
                  </button>
                </div>
                {!examDate && (
                  <p className="mt-2 text-[11px] font-medium text-purple-700">{text.aiDateHint}</p>
                )}
                {aiTopics.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-bold text-purple-800">{text.aiTopics}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiTopics.map((topic, index) => (
                        <span
                          key={`${topic.title}-${index}`}
                          className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-purple-700 ring-1 ring-purple-100"
                        >
                          {topic.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowExamForm(false);
                  resetExamForm();
                }}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700"
              >
                {text.cancel}
              </button>
              <button
                disabled={savingExam}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {savingExam && <Loader2 size={14} className="animate-spin" />}
                {editingExamId ? text.update : text.create}
              </button>
            </div>
          </form>
        )}

        {exams.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
            <CalendarDays className="mx-auto mb-3 text-brand" size={32} />
            <p className="font-bold text-surface-dark">{text.noExams}</p>
            <p className="mt-1 text-sm text-gray-500">{text.setup}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_1fr]">
            <aside className="space-y-2 rounded-3xl border border-gray-100 bg-white p-3 shadow-sm">
              {sortedExams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => {
                    setSelectedExamId(exam.id);
                    void loadTopics(exam.id);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    exam.id === selectedExamId
                      ? "border-brand bg-brand/5"
                      : "border-transparent hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: exam.color || defaultExamColor }}
                    />
                    <p className="truncate text-sm font-bold text-surface-dark">{exam.title}</p>
                  </div>
                  <p className="mt-1 pl-4 text-xs text-gray-400">
                    {new Date(`${exam.exam_date}T00:00:00`).toLocaleDateString(
                      localeForLanguage(lang)
                    )}
                  </p>
                </button>
              ))}
            </aside>

            <section className="space-y-5">
              <div
                className="rounded-3xl p-6 text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${selectedExam?.color || defaultExamColor}, #312E81)`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                      {selectedExam?.target_score
                        ? `${text.target}: ${selectedExam.target_score}`
                        : text.title}
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold">{selectedExam?.title}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={openEditExam}
                      className="rounded-xl bg-white/15 p-2.5 text-white hover:bg-white/25"
                      aria-label={text.editExam}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={deletingExam}
                      onClick={() => void deleteExam()}
                      className="rounded-xl bg-white/15 p-2.5 text-white hover:bg-red-500/70 disabled:opacity-60"
                      aria-label={text.deleteExam}
                    >
                      {deletingExam ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-7 flex flex-wrap gap-6">
                  <div>
                    <p className="text-4xl font-extrabold">{Math.abs(dayDelta)}</p>
                    <p className="text-sm text-white/75">
                      {dayDelta > 0 ? text.days : dayDelta === 0 ? text.today : text.passed}
                    </p>
                  </div>
                  <div>
                    <p className="text-4xl font-extrabold">{readiness}%</p>
                    <p className="text-sm text-white/75">{text.progress}</p>
                  </div>
                  <div>
                    <p className="text-4xl font-extrabold">{estimatedMinutes}</p>
                    <p className="text-sm text-white/75">{text.minutes}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-surface-dark">{text.topics}</h3>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {topics.length} {text.topicCount}
                    </p>
                  </div>
                  <Sparkles className="text-brand" size={18} />
                </div>

                <form onSubmit={addTopic} className="mt-5 flex gap-2">
                  <input
                    value={topicTitle}
                    onChange={(event) => setTopicTitle(event.target.value)}
                    placeholder={text.topicPlaceholder}
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
                  />
                  <button
                    disabled={addingTopic}
                    className="rounded-xl bg-brand px-4 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {addingTopic ? "…" : text.addTopic}
                  </button>
                </form>

                <div className="mt-4 space-y-2">
                  {topics.length === 0 ? (
                    <p className="rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-400">
                      {text.noTopics}
                    </p>
                  ) : (
                    topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-surface-dark">{topic.title}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                            <Clock3 size={12} /> {topic.estimated_minutes} {text.minutes}
                          </p>
                        </div>
                        <select
                          value={topic.mastery_status}
                          onChange={(event) =>
                            void updateTopicStatus(
                              topic,
                              event.target.value as Topic["mastery_status"]
                            )
                          }
                          className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-surface-dark outline-none"
                        >
                          {Object.keys(statusLabels).map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status as Topic["mastery_status"]][lang]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void deleteTopic(topic.id)}
                          className="rounded-xl p-2 text-gray-300 hover:bg-red-50 hover:text-red-500"
                          aria-label={text.delete}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
