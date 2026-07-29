"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Send,
  Loader2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { getTranslations } from "@/lib/translations";
import StudyPartnerProfileForm from "@/components/dashboard/StudyPartnerProfileForm";
import { localeForLanguage, localized } from "@/lib/i18n";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<Array<{ name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Social Sharing Hub states
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [sharingPost, setSharingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);
  const copy = localized(lang, {
    en: {
      title: "Profile & Social Hub",
      subtitle: "Manage one matching profile and share study progress with the academy.",
      socialTitle: "OnPace Social Academy",
      socialSubtitle: "Share study goals and strategies. Posts are screened by AI moderation.",
      postPlaceholder: "Share what you are studying, a useful tip, or an exam goal…",
      checking: "Checking…",
      share: "Share",
      maxCharacters: "Maximum 400 characters",
      emptyPosts: "No academy posts yet. Be the first to share a study goal.",
      anonymous: "Anonymous peer",
      postRejected: "The post could not be shared.",
      connectionError: "Connection error. Please try again.",
    },
    tr: {
      title: "Profil ve Sosyal Alan",
      subtitle: "Tek bir eşleştirme profilini yönet ve çalışma ilerlemeni akademiyle paylaş.",
      socialTitle: "OnPace Sosyal Akademisi",
      socialSubtitle: "Çalışma hedeflerini ve yöntemlerini paylaş. Gönderiler AI moderasyonuyla kontrol edilir.",
      postPlaceholder: "Çalıştığın konuyu, faydalı bir ipucunu veya sınav hedefini paylaş…",
      checking: "Kontrol ediliyor…",
      share: "Paylaş",
      maxCharacters: "En fazla 400 karakter",
      emptyPosts: "Henüz akademi gönderisi yok. İlk çalışma hedefini sen paylaş.",
      anonymous: "Anonim öğrenci",
      postRejected: "Gönderi paylaşılamadı.",
      connectionError: "Bağlantı hatası. Lütfen tekrar dene.",
    },
    es: {
      title: "Perfil y Espacio Social",
      subtitle: "Gestiona un único perfil de emparejamiento y comparte tu progreso con la academia.",
      socialTitle: "Academia Social OnPace",
      socialSubtitle: "Comparte objetivos y estrategias. Las publicaciones pasan por moderación de IA.",
      postPlaceholder: "Comparte lo que estudias, un consejo útil o una meta de examen…",
      checking: "Comprobando…",
      share: "Compartir",
      maxCharacters: "Máximo 400 caracteres",
      emptyPosts: "Todavía no hay publicaciones. Comparte el primer objetivo de estudio.",
      anonymous: "Compañero anónimo",
      postRejected: "No se pudo compartir la publicación.",
      connectionError: "Error de conexión. Inténtalo de nuevo.",
    },
    zh: {
      title: "个人资料与社交空间",
      subtitle: "在一个资料中管理匹配偏好，并与学习社区分享进度。",
      socialTitle: "OnPace 学习社区",
      socialSubtitle: "分享学习目标与方法，帖子会经过 AI 审核。",
      postPlaceholder: "分享你正在学习的内容、实用技巧或考试目标…",
      checking: "正在检查…",
      share: "发布",
      maxCharacters: "最多 400 个字符",
      emptyPosts: "社区中还没有帖子，分享第一个学习目标吧。",
      anonymous: "匿名同学",
      postRejected: "无法发布帖子。",
      connectionError: "连接失败，请重试。",
    },
  });

  useEffect(() => {
    async function loadProfileAndPosts() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const [{ data: profileData }, { data: courseRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("courses").select("name").eq("user_id", user.id).order("name"),
      ]);

      if (profileData) {
        setProfile(profileData);
      }
      setCourses(courseRows || []);

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
        setPostError(data.error || copy.postRejected);
      }
    } catch {
      setPostError(copy.connectionError);
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
          <User className="text-brand" /> {copy.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <StudyPartnerProfileForm
            profile={profile}
            courses={courses}
            compact
            onSaved={setProfile}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-surface-dark flex items-center gap-1.5">
                <BookOpen className="text-brand" size={18} />
                {copy.socialTitle}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{copy.socialSubtitle}</p>
            </div>

            {/* Post Creation Form */}
            <form onSubmit={handleSharePost} className="space-y-3">
              <textarea
                required
                rows={3}
                maxLength={400}
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder={copy.postPlaceholder}
                className="w-full px-4 py-3 border border-gray-150 bg-gray-50/50 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-brand text-surface-dark resize-none placeholder-gray-400"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-semibold">{copy.maxCharacters}</span>
                <button
                  type="submit"
                  disabled={sharingPost}
                  className="px-5 py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  {sharingPost ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {copy.checking}
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      {copy.share}
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
                  {copy.emptyPosts}
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
                          <p className="text-xs font-bold text-surface-dark">{post.profiles?.full_name || copy.anonymous}</p>
                          <span className="text-[9px] text-gray-400 font-semibold">
                            {new Date(post.created_at).toLocaleDateString(localeForLanguage(lang), { hour: "2-digit", minute: "2-digit" })}
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
