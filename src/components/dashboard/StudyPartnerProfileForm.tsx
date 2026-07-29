"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Clock3, Loader2, Sparkles, UserRoundSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { localized, normalizeLanguage } from "@/lib/i18n";

type Availability = {
  days: string[];
  startTime: string;
  endTime: string;
};

export type StudyPartnerProfile = {
  id: string;
  language?: string | null;
  full_name?: string | null;
  gender?: string | null;
  preferred_gender?: string | null;
  learning_styles?: string[] | null;
  match_subjects?: string[] | null;
  match_goals?: string | null;
  match_timezone?: string | null;
  match_availability?: unknown;
  match_profile_completed?: boolean | null;
  customization_settings?: unknown;
  [key: string]: unknown;
};

type StudyPartnerProfileFormProps = {
  profile: StudyPartnerProfile;
  courses?: Array<{ name: string }>;
  compact?: boolean;
  onCancel?: () => void;
  onSaved?: (profile: StudyPartnerProfile) => void;
};

const learningStyleOptions = [
  {
    value: "visual",
    labels: { en: "Visual", tr: "Görsel", es: "Visual", zh: "视觉" },
  },
  {
    value: "auditory",
    labels: { en: "Auditory", tr: "İşitsel", es: "Auditivo", zh: "听觉" },
  },
  {
    value: "reading",
    labels: { en: "Reading & writing", tr: "Okuma ve yazma", es: "Lectura y escritura", zh: "读写" },
  },
  {
    value: "kinesthetic",
    labels: { en: "Hands-on", tr: "Uygulamalı", es: "Práctico", zh: "实践" },
  },
] as const;

const dayOptions = [
  { value: "mon", labels: { en: "Mon", tr: "Pzt", es: "Lun", zh: "周一" } },
  { value: "tue", labels: { en: "Tue", tr: "Sal", es: "Mar", zh: "周二" } },
  { value: "wed", labels: { en: "Wed", tr: "Çar", es: "Mié", zh: "周三" } },
  { value: "thu", labels: { en: "Thu", tr: "Per", es: "Jue", zh: "周四" } },
  { value: "fri", labels: { en: "Fri", tr: "Cum", es: "Vie", zh: "周五" } },
  { value: "sat", labels: { en: "Sat", tr: "Cmt", es: "Sáb", zh: "周六" } },
  { value: "sun", labels: { en: "Sun", tr: "Paz", es: "Dom", zh: "周日" } },
] as const;

function readAvailability(value: unknown): Availability {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { days: [], startTime: "18:00", endTime: "20:00" };
  }
  const availability = value as Partial<Availability>;
  return {
    days: Array.isArray(availability.days)
      ? availability.days.filter((day): day is string => typeof day === "string")
      : [],
    startTime: typeof availability.startTime === "string" ? availability.startTime : "18:00",
    endTime: typeof availability.endTime === "string" ? availability.endTime : "20:00",
  };
}

function readMatchingFallback(profile: StudyPartnerProfile) {
  const settings =
    profile.customization_settings &&
    typeof profile.customization_settings === "object" &&
    !Array.isArray(profile.customization_settings)
      ? (profile.customization_settings as Record<string, unknown>)
      : {};
  const matchingProfile =
    settings.study_partner_profile &&
    typeof settings.study_partner_profile === "object" &&
    !Array.isArray(settings.study_partner_profile)
      ? (settings.study_partner_profile as Record<string, unknown>)
      : {};
  return { settings, matchingProfile };
}

function isMissingMatchingColumn(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST204" ||
    /schema cache|could not find.+column|column.+does not exist/i.test(
      error.message || ""
    )
  );
}

export default function StudyPartnerProfileForm({
  profile,
  courses = [],
  compact = false,
  onCancel,
  onSaved,
}: StudyPartnerProfileFormProps) {
  const supabase = createClient();
  const language = normalizeLanguage(profile?.language);
  const copy = localized(language, {
    en: {
      title: "Study Partner Profile",
      subtitle: "Give the matchmaker enough context to recommend compatible, available study partners.",
      fullName: "Full name",
      gender: "My gender",
      genderPreference: "Partner preference",
      anyGender: "No preference",
      male: "Male",
      female: "Female",
      nonBinary: "Non-binary",
      other: "Other",
      preferNot: "Prefer not to say",
      learningStyles: "How do you learn best?",
      subjects: "Subjects to study together",
      noCourses: "Add courses first so partners can be matched by subject.",
      goals: "Study goals",
      goalsPlaceholder: "e.g. Prepare for AP Biology and complete two practice exams each week.",
      availability: "Weekly availability",
      timezone: "Time zone",
      timeWindow: "Preferred time",
      save: "Save matching profile",
      saving: "Saving…",
      saved: "Matching profile saved.",
      incomplete: "Choose at least one learning style, subject, available day, and enter a study goal.",
      error: "Your matching profile could not be saved.",
      cancel: "Not now",
    },
    tr: {
      title: "Çalışma Partneri Profili",
      subtitle: "Eşleştiricinin uyumlu ve müsait çalışma arkadaşları önerebilmesi için tercihlerini tamamla.",
      fullName: "Ad soyad",
      gender: "Cinsiyetim",
      genderPreference: "Partner tercihi",
      anyGender: "Tercihim yok",
      male: "Erkek",
      female: "Kadın",
      nonBinary: "İkili olmayan",
      other: "Diğer",
      preferNot: "Belirtmek istemiyorum",
      learningStyles: "En iyi nasıl öğrenirsin?",
      subjects: "Birlikte çalışılacak dersler",
      noCourses: "Derse göre eşleşebilmek için önce ders ekle.",
      goals: "Çalışma hedefleri",
      goalsPlaceholder: "Örn. AP Biyolojiye hazırlanmak ve haftada iki deneme çözmek.",
      availability: "Haftalık uygunluk",
      timezone: "Saat dilimi",
      timeWindow: "Tercih edilen saat",
      save: "Eşleştirme profilini kaydet",
      saving: "Kaydediliyor…",
      saved: "Eşleştirme profili kaydedildi.",
      incomplete: "En az bir öğrenme stili, ders ve uygun gün seçip çalışma hedefini yaz.",
      error: "Eşleştirme profilin kaydedilemedi.",
      cancel: "Şimdi değil",
    },
    es: {
      title: "Perfil de Compañero de Estudio",
      subtitle: "Completa tus preferencias para que el buscador recomiende compañeros compatibles y disponibles.",
      fullName: "Nombre completo",
      gender: "Mi género",
      genderPreference: "Preferencia de compañero",
      anyGender: "Sin preferencia",
      male: "Hombre",
      female: "Mujer",
      nonBinary: "No binario",
      other: "Otro",
      preferNot: "Prefiero no decirlo",
      learningStyles: "¿Cómo aprendes mejor?",
      subjects: "Materias para estudiar juntos",
      noCourses: "Añade cursos primero para encontrar compañeros por materia.",
      goals: "Objetivos de estudio",
      goalsPlaceholder: "p. ej. Preparar Biología AP y completar dos simulacros por semana.",
      availability: "Disponibilidad semanal",
      timezone: "Zona horaria",
      timeWindow: "Horario preferido",
      save: "Guardar perfil de emparejamiento",
      saving: "Guardando…",
      saved: "Perfil de emparejamiento guardado.",
      incomplete: "Elige al menos un estilo, una materia, un día disponible y escribe un objetivo.",
      error: "No se pudo guardar tu perfil de emparejamiento.",
      cancel: "Ahora no",
    },
    zh: {
      title: "学习伙伴资料",
      subtitle: "完善偏好后，匹配器才能推荐时间合适、学习方式相容的伙伴。",
      fullName: "姓名",
      gender: "我的性别",
      genderPreference: "伙伴性别偏好",
      anyGender: "不限",
      male: "男",
      female: "女",
      nonBinary: "非二元性别",
      other: "其他",
      preferNot: "不愿透露",
      learningStyles: "你最适合怎样学习？",
      subjects: "希望一起学习的科目",
      noCourses: "请先添加课程，以便按科目匹配伙伴。",
      goals: "学习目标",
      goalsPlaceholder: "例如：准备 AP 生物，每周完成两套模拟题。",
      availability: "每周可用时间",
      timezone: "时区",
      timeWindow: "偏好时段",
      save: "保存匹配资料",
      saving: "正在保存…",
      saved: "匹配资料已保存。",
      incomplete: "请至少选择一种学习方式、一门科目和一个可用日期，并填写学习目标。",
      error: "无法保存匹配资料。",
      cancel: "稍后再说",
    },
  });
  const { settings, matchingProfile } = readMatchingFallback(profile);

  const [fullName, setFullName] = useState(profile.full_name || "");
  const [gender, setGender] = useState(
    profile.gender ||
      (typeof matchingProfile.gender === "string" ? matchingProfile.gender : "") ||
      "prefer_not_to_say"
  );
  const [preferredGender, setPreferredGender] = useState(
    profile.preferred_gender ||
      (typeof matchingProfile.preferred_gender === "string"
        ? matchingProfile.preferred_gender
        : "") ||
      "any"
  );
  const [learningStyles, setLearningStyles] = useState<string[]>(
    Array.isArray(profile.learning_styles)
      ? profile.learning_styles
      : Array.isArray(matchingProfile.learning_styles)
        ? matchingProfile.learning_styles.filter(
            (value): value is string => typeof value === "string"
          )
        : []
  );
  const [subjects, setSubjects] = useState<string[]>(
    Array.isArray(profile.match_subjects)
      ? profile.match_subjects
      : Array.isArray(matchingProfile.match_subjects)
        ? matchingProfile.match_subjects.filter(
            (value): value is string => typeof value === "string"
          )
        : []
  );
  const [goals, setGoals] = useState(
    profile.match_goals ||
      (typeof matchingProfile.match_goals === "string"
        ? matchingProfile.match_goals
        : "")
  );
  const [timeZone, setTimeZone] = useState(
    profile.match_timezone ||
      (typeof matchingProfile.match_timezone === "string"
        ? matchingProfile.match_timezone
        : "") ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC"
  );
  const [availability, setAvailability] = useState<Availability>(() =>
    readAvailability(
      profile.match_availability ?? matchingProfile.match_availability
    )
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const courseNames = useMemo(
    () =>
      Array.from(
        new Set(
          courses
            .map((course) => course.name?.trim())
            .filter((name): name is string => Boolean(name))
        )
      ),
    [courses]
  );

  const toggleValue = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const completed =
      fullName.trim().length >= 2 &&
      learningStyles.length > 0 &&
      subjects.length > 0 &&
      availability.days.length > 0 &&
      goals.trim().length >= 5;

    if (!completed) {
      setMessage({ type: "error", text: copy.incomplete });
      return;
    }

    setSaving(true);
    const updates = {
      full_name: fullName.trim(),
      gender,
      preferred_gender: preferredGender,
      learning_styles: learningStyles,
      match_subjects: subjects,
      match_goals: goals.trim(),
      match_timezone: timeZone.trim() || "UTC",
      match_availability: availability,
      match_profile_completed: true,
    };
    let { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    let savedSettings = profile.customization_settings;
    if (error && isMissingMatchingColumn(error)) {
      savedSettings = {
        ...settings,
        study_partner_profile: {
          ...matchingProfile,
          ...updates,
        },
      };
      const fallbackResult = await supabase
        .from("profiles")
        .update({
          full_name: updates.full_name,
          learning_styles: updates.learning_styles,
          customization_settings: savedSettings,
        })
        .eq("id", profile.id);
      error = fallbackResult.error;
    }

    if (error) {
      setMessage({ type: "error", text: `${copy.error} ${error.message}` });
    } else {
      const nextProfile = {
        ...profile,
        ...updates,
        customization_settings: savedSettings,
      };
      setMessage({ type: "success", text: copy.saved });
      onSaved?.(nextProfile);
    }
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-5 rounded-3xl border border-gray-100 bg-white shadow-sm ${
        compact ? "p-5" : "p-6 sm:p-7"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <UserRoundSearch size={21} />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-surface-dark">{copy.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{copy.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs font-bold text-gray-500">
          <span className="uppercase tracking-wide">{copy.fullName}</span>
          <input
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-surface-dark outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </label>
        <label className="space-y-1.5 text-xs font-bold text-gray-500">
          <span className="uppercase tracking-wide">{copy.timezone}</span>
          <input
            required
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-surface-dark outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </label>
        <label className="space-y-1.5 text-xs font-bold text-gray-500">
          <span className="uppercase tracking-wide">{copy.gender}</span>
          <select
            value={gender}
            onChange={(event) => setGender(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-surface-dark outline-none focus:border-brand"
          >
            <option value="male">{copy.male}</option>
            <option value="female">{copy.female}</option>
            <option value="non_binary">{copy.nonBinary}</option>
            <option value="other">{copy.other}</option>
            <option value="prefer_not_to_say">{copy.preferNot}</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-bold text-gray-500">
          <span className="uppercase tracking-wide">{copy.genderPreference}</span>
          <select
            value={preferredGender}
            onChange={(event) => setPreferredGender(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-surface-dark outline-none focus:border-brand"
          >
            <option value="any">{copy.anyGender}</option>
            <option value="male">{copy.male}</option>
            <option value="female">{copy.female}</option>
            <option value="non_binary">{copy.nonBinary}</option>
          </select>
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {copy.learningStyles}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {learningStyleOptions.map((option) => {
            const selected = learningStyles.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleValue(option.value, setLearningStyles)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                  selected
                    ? "border-brand bg-brand text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-brand/40"
                }`}
              >
                {selected && <Check size={13} />}
                {option.labels[language]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {copy.subjects}
        </legend>
        {courseNames.length === 0 ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            {copy.noCourses}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {courseNames.map((courseName) => {
              const selected = subjects.includes(courseName);
              return (
                <button
                  key={courseName}
                  type="button"
                  onClick={() => toggleValue(courseName, setSubjects)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    selected
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-gray-200 text-gray-600 hover:border-brand/40"
                  }`}
                >
                  {selected ? "✓ " : ""}
                  {courseName}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <label className="block space-y-1.5 text-xs font-bold text-gray-500">
        <span className="uppercase tracking-wide">{copy.goals}</span>
        <textarea
          required
          minLength={5}
          maxLength={500}
          rows={3}
          value={goals}
          onChange={(event) => setGoals(event.target.value)}
          placeholder={copy.goalsPlaceholder}
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-surface-dark outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {copy.availability}
        </legend>
        <div className="flex flex-wrap gap-2">
          {dayOptions.map((day) => {
            const selected = availability.days.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() =>
                  setAvailability((current) => ({
                    ...current,
                    days: current.days.includes(day.value)
                      ? current.days.filter((item) => item !== day.value)
                      : [...current.days, day.value],
                  }))
                }
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  selected
                    ? "border-brand bg-brand text-white"
                    : "border-gray-200 text-gray-600 hover:border-brand/40"
                }`}
              >
                {day.labels[language]}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500">
          <Clock3 size={14} className="text-brand" />
          <span>{copy.timeWindow}</span>
          <input
            type="time"
            value={availability.startTime}
            onChange={(event) =>
              setAvailability((current) => ({ ...current, startTime: event.target.value }))
            }
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-surface-dark"
          />
          <span>–</span>
          <input
            type="time"
            value={availability.endTime}
            onChange={(event) =>
              setAvailability((current) => ({ ...current, endTime: event.target.value }))
            }
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-surface-dark"
          />
        </div>
      </fieldset>

      {message && (
        <p
          role="status"
          className={`rounded-xl border px-3 py-2 text-xs font-bold ${
            message.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            {copy.cancel}
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {saving ? copy.saving : copy.save}
        </button>
      </div>
    </form>
  );
}
