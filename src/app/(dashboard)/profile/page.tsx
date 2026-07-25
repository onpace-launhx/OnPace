"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Shield,
  Sparkles,
  Send,
  Loader2,
  Calendar,
  AlertCircle,
  BookOpen,
  Eye,
  Trash2,
  Heart,
  MessageSquare
} from "lucide-react";
import { getTranslations } from "@/lib/translations";

const learnerStyleLabels: Record<string, Record<string, string>> = {
  visual: { en: "Visual learner", tr: "Görsel öğrenen", es: "Aprendiz visual", zh: "视觉学习者" },
  auditory: { en: "Auditory learner", tr: "İşitsel öğrenen", es: "Aprendiz auditivo", zh: "听觉学习者" },
  reading: { en: "Reading & writing", tr: "Okuma ve yazma", es: "Lectura y escritura", zh: "读写学习者" },
  kinesthetic: { en: "Hands-on learner", tr: "Uygulamalı öğrenen", es: "Aprendiz práctico", zh: "动手实践学习者" },
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile forms
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [prefGender, setPrefGender] = useState("");
  const [learningStyles, setLearningStyles] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Social Sharing Hub states
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [sharingPost, setSharingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  useEffect(() => {
    async function loadProfileAndPosts() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setGender(profileData.gender || "other");
        setPrefGender(profileData.preferred_gender || "any");
        setLearningStyles(Array.isArray(profileData.learning_styles) ? profileData.learning_styles : []);
      }

      // 2. Fetch social feed
      try {
        const res = await fetch("/api/posts");
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (err) {
        console.error("Failed to load posts:", err);
      }

      setLoading(false);
    }
    loadProfileAndPosts();
  }, [router, supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        gender: gender,
        preferred_gender: prefGender,
        learning_styles: learningStyles,
      })
      .eq("id", profile.id);

    if (!error) {
      setProfileMsg(lang === "tr" ? "Hesap özelleştirmeleriniz başarıyla güncellendi!" : "Account customizations successfully updated!");
      setProfile((prev: any) => ({
        ...prev,
        full_name: fullName.trim(),
        gender: gender,
        preferred_gender: prefGender,
        learning_styles: learningStyles,
      }));
    } else {
      setProfileMsg(error.message);
    }
    setSavingProfile(false);
  };

  const handleSharePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    setSharingPost(true);
    setPostError(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostText.trim() })
      });
      const data = await res.json();

      if (res.ok && data.post) {
        setPosts(prev => [data.post, ...prev]);
        setNewPostText("");
      } else {
        setPostError(data.error || "Post sharing rejected.");
      }
    } catch {
      setPostError("Connection error. Try again.");
    } finally {
      setSharingPost(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-medium text-gray-500">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-10 overflow-y-auto space-y-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
          <User className="text-brand" /> {lang === "tr" ? "Gelişmiş Profil & Sosyal Alan" : "Advanced Profile & Social Hub"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {lang === "tr" 
            ? "Hesabınızı kişiselleştirin, eşleşme kurallarınızı belirleyin ve sosyal akışta çalışma notlarınızı paylaşın." 
            : "Customize your study rules, match criteria, and share findings with peers in the secure academy stream."}
        </p>
      </div>

      <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-brand" />
          <h2 className="text-sm font-extrabold text-surface-dark">
            {lang === "tr" ? "Öğrenme stilin" : lang === "zh" ? "学习风格" : lang === "es" ? "Tu estilo de aprendizaje" : "Your learning style"}
          </h2>
        </div>
        {learningStyles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {learningStyles.map((style: string) => (
              <span key={style} className="rounded-full border border-brand/15 bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand">
                {learnerStyleLabels[style]?.[lang] || learnerStyleLabels[style]?.en || style}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            {lang === "tr" ? "Henüz bir öğrenme stili seçilmedi." : lang === "zh" ? "尚未选择学习风格。" : lang === "es" ? "Aún no has elegido un estilo." : "No learning style selected yet."}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(learnerStyleLabels).map(([style, labels]) => {
            const selected = learningStyles.includes(style);
            return (
              <button
                key={style}
                type="button"
                onClick={() => setLearningStyles((current) => selected ? current.filter((item) => item !== style) : [...current, style])}
                className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${selected ? "border-brand bg-brand text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:border-brand/40 hover:bg-brand/5"}`}
              >
                {labels[lang] || labels.en}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          {lang === "tr" ? "Bir veya birden fazla stil seçebilirsin; ardından aşağıdaki “Değişiklikleri Kaydet” düğmesine bas." : lang === "zh" ? "可选择一种或多种学习风格，然后点击下方保存。" : lang === "es" ? "Puedes elegir uno o varios estilos; luego guarda los cambios abajo." : "Choose one or more styles, then save your changes below."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Account Setup & Promocodes */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Customization Details Form */}
          <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-surface-dark border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Shield className="text-brand" size={16} />
              {lang === "tr" ? "Hesap & Eşleşme Ayarları" : "Match Customizations"}
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase">My Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark cursor-pointer outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase">Match Matching Gender</label>
                <select
                  value={prefGender}
                  onChange={(e) => setPrefGender(e.target.value)}
                  className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark cursor-pointer outline-none"
                >
                  <option value="any">No Preference (Match with all peers)</option>
                  <option value="male">Match only with Males</option>
                  <option value="female">Match only with Females</option>
                </select>
              </div>

              {profileMsg && (
                <p className="text-[10px] font-bold text-brand bg-brand/5 p-2 rounded border border-brand/10">
                  {profileMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer flex justify-center items-center gap-1 shadow-xs"
              >
                {savingProfile && <Loader2 className="h-3 w-3 animate-spin" />}
                {lang === "tr" ? "Değişiklikleri Kaydet" : "Save Changes"}
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Social Sharing Feed */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-surface-dark flex items-center gap-1.5">
                <BookOpen className="text-brand" size={18} />
                {lang === "tr" ? "OnPace Sosyal Akademi Panosu" : "Social Academy Stream"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {lang === "tr" 
                  ? "Çalışma hedeflerinizi paylaşın. Paylaşımlar AI moderasyonu tarafından taranır."
                  : "Post your daily achievements or syllabus strategies. Auto-moderated to ensure educational focus."}
              </p>
            </div>

            {/* Post Creation Form */}
            <form onSubmit={handleSharePost} className="space-y-3">
              <textarea
                required
                rows={3}
                maxLength={400}
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder={lang === "tr" ? "Çalışma ipuçlarını, motivasyonunu veya hazırlık sorularını paylaş..." : "Share what you're working on today, exam targets, or subject reviews..."}
                className="w-full px-4 py-3 border border-gray-150 bg-gray-50/50 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-brand text-surface-dark resize-none placeholder-gray-400"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-semibold">Max 400 characters</span>
                <button
                  type="submit"
                  disabled={sharingPost}
                  className="px-5 py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  {sharingPost ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {lang === "tr" ? "Taranıyor..." : "Checking..."}
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      {lang === "tr" ? "Paylaş" : "Share Forum"}
                    </>
                  )}
                </button>
              </div>
              {postError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-500 text-[11px] font-bold rounded-xl flex items-center gap-2 animate-bounce">
                  <AlertCircle size={14} /> {postError}
                </div>
              )}
            </form>

            {/* Social Posts List */}
            <div className="space-y-4 pt-4 border-t border-gray-50">
              {posts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No shares on the forum yet. Be the first to share your goals!
                </div>
              ) : (
                posts.map(post => (
                  <div key={post.id} className="p-4 border border-gray-100 rounded-2xl space-y-2 hover:border-gray-200 transition-all text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-brand/10 text-brand font-bold text-[10px] flex items-center justify-center border border-brand/20 uppercase">
                          {post.profiles?.full_name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-surface-dark">{post.profiles?.full_name || "Anonymous Peer"}</p>
                          <span className="text-[9px] text-gray-400 font-semibold">
                            {new Date(post.created_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {post.profiles?.learning_styles?.map((style: string) => (
                          <span key={style} className="px-2 py-0.5 rounded text-[8px] bg-brand-light/30 text-brand border border-brand/10 uppercase font-extrabold">
                            {style}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600 leading-relaxed font-semibold pl-9">
                      {post.content}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
