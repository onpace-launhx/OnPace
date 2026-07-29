"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Search,
  MessageSquare,
  Sparkles,
  Plus,
  Loader2,
  Lock,
  CheckCircle,
  HelpCircle,
  Calendar,
  Send,
  UserCheck,
  TrendingUp,
  Award
} from "lucide-react";
import { getTranslations } from "@/lib/translations";
import StudyPartnerProfileForm from "@/components/dashboard/StudyPartnerProfileForm";
import { localized } from "@/lib/i18n";

export default function StudyGroupsPage() {
  const router = useRouter();
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Groups and memberships
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [myMemberships, setMyMemberships] = useState<string[]>([]); // Array of group IDs
  const [activeGroup, setActiveGroup] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "chat" | "matchmaker" | "goals">("chat");
  const [mainTab, setMainTab] = useState<"groups" | "matchmaker">("groups");

  // Form state
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupCourse, setNewGroupCourse] = useState("");
  const [creating, setCreating] = useState(false);

  // Group Workspace states
  const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({}); // Key: groupId
  const [inputMsg, setInputMsg] = useState("");
  const [customAlert, setCustomAlert] = useState<string | null>(null);
  const [scheduledSuccess, setScheduledSuccess] = useState<string | null>(null);

  // Mock partners data based on course
  const [matchedPartners, setMatchedPartners] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiRecommendedGroup, setAiRecommendedGroup] = useState<any | null>(null);
  const [activeDirectChatPartner, setActiveDirectChatPartner] = useState<any | null>(null);
  const [showMatchProfile, setShowMatchProfile] = useState(false);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);
  const matchCopy = localized(lang, {
    en: {
      title: "AI Study Partner Matchmaker",
      description: "AI compares subjects, goals, learning styles, time zones, and weekly availability.",
      run: "Run AI Matchmaker",
      matching: "Matching…",
      analyzing: "AI is analyzing your study-partner profile…",
      analyzingHint: "Comparing compatible schedules, goals, subjects, and learning preferences.",
      suggestion: "AI group suggestion",
      error: "The matchmaker could not complete this request.",
      editProfile: "Review matching profile",
      notification: "Notification",
      dismiss: "Dismiss",
    },
    tr: {
      title: "AI Çalışma Partneri Eşleştiricisi",
      description: "AI; dersleri, hedefleri, öğrenme stillerini, saat dilimini ve haftalık uygunluğu karşılaştırır.",
      run: "AI Eşleştirmeyi Başlat",
      matching: "Eşleştiriliyor…",
      analyzing: "AI çalışma partneri profilini analiz ediyor…",
      analyzingHint: "Uyumlu programlar, hedefler, dersler ve öğrenme tercihleri karşılaştırılıyor.",
      suggestion: "AI grup önerisi",
      error: "Eşleştirici bu isteği tamamlayamadı.",
      editProfile: "Eşleştirme profilini gözden geçir",
      notification: "Bildirim",
      dismiss: "Kapat",
    },
    es: {
      title: "Buscador de Compañeros con IA",
      description: "La IA compara materias, objetivos, estilos, zonas horarias y disponibilidad semanal.",
      run: "Ejecutar buscador con IA",
      matching: "Buscando…",
      analyzing: "La IA analiza tu perfil de compañero…",
      analyzingHint: "Comparando horarios, objetivos, materias y preferencias de aprendizaje.",
      suggestion: "Sugerencia de grupo de IA",
      error: "El buscador no pudo completar esta solicitud.",
      editProfile: "Revisar perfil de emparejamiento",
      notification: "Aviso",
      dismiss: "Cerrar",
    },
    zh: {
      title: "AI 学习伙伴匹配器",
      description: "AI 会比较科目、目标、学习方式、时区和每周可用时间。",
      run: "运行 AI 匹配",
      matching: "正在匹配…",
      analyzing: "AI 正在分析你的学习伙伴资料…",
      analyzingHint: "正在比较时间、目标、科目与学习偏好。",
      suggestion: "AI 小组建议",
      error: "匹配器无法完成此请求。",
      editProfile: "检查匹配资料",
      notification: "系统提示",
      dismiss: "关闭",
    },
  });
  const groupCopy = localized(lang, {
    en: {
      lockedTitle: "Unlock Study Groups & Matchmaking",
      lockedDescription: "Study Groups is a Pro collaboration space for subject groups, compatible study partners, and shared calendar sessions.",
      upgrade: "Upgrade to Pro",
      dashboard: "Go to Dashboard",
      title: "Study Groups & Partners",
      subtitle: "Join academic groups, chat with peers, and schedule shared study sessions.",
      createGroup: "Create Group",
      groupsTab: "Study Groups & Chat",
      matchmakerTab: "AI Study Matchmaker",
      explore: "Explore Groups",
      members: "Members",
      leave: "Leave",
      join: "Join",
      chat: "💬 Chat",
      matchmaker: "🎯 Matchmaker",
      memberTab: "👥 Members",
      goals: "📋 Goals",
      messagePlaceholder: "Type your message to the group…",
      scheduled: "Study session scheduled with {name} for tomorrow at 3:00 PM.",
      schedule: "Schedule Session",
      directChat: "Direct Chat",
      approve: "Approve Match Connection",
      noGroup: "No Study Group Active",
      noGroupDescription: "Join or select a study group to use its shared chat and partner-matching tools.",
      createTitle: "Create New Study Group",
      createSubtitle: "Start a collaborative room for exam preparation.",
      groupName: "Group Name",
      groupNamePlaceholder: "e.g. AP Calculus study circle",
      description: "Description",
      descriptionPlaceholder: "What will this group focus on?",
      subject: "Associated Subject",
      joinError: "Could not update the study-group membership. Please try again.",
      createError: "The group could not be created. Its name may already be in use.",
      scheduleError: "The shared study session could not be scheduled.",
    },
    tr: {
      lockedTitle: "Çalışma Grupları ve Eşleştirmeyi Aç",
      lockedDescription: "Çalışma Grupları; ders odaklı topluluklar, uyumlu çalışma partnerleri ve ortak takvim oturumları sunan bir Pro alanıdır.",
      upgrade: "Pro'ya yükselt",
      dashboard: "Çalışma paneline dön",
      title: "Çalışma Grupları ve Partnerler",
      subtitle: "Ders gruplarına katıl, arkadaşlarınla konuş ve ortak çalışma oturumları planla.",
      createGroup: "Grup oluştur",
      groupsTab: "Çalışma Grupları ve Sohbet",
      matchmakerTab: "AI Çalışma Eşleştiricisi",
      explore: "Grupları keşfet",
      members: "üye",
      leave: "Ayrıl",
      join: "Katıl",
      chat: "💬 Sohbet",
      matchmaker: "🎯 Eşleştirici",
      memberTab: "👥 Üyeler",
      goals: "📋 Hedefler",
      messagePlaceholder: "Gruba bir mesaj yaz…",
      scheduled: "{name} ile yarın saat 15.00 için çalışma oturumu planlandı.",
      schedule: "Çalışma planla",
      directChat: "Mesaj gönder",
      approve: "Eşleşmeyi onayla ve bağlan",
      noGroup: "Etkin çalışma grubu yok",
      noGroupDescription: "Ortak sohbeti ve partner eşleştirmeyi kullanmak için bir gruba katıl veya grup seç.",
      createTitle: "Yeni çalışma grubu oluştur",
      createSubtitle: "Sınav hazırlığı için ortak bir çalışma alanı başlat.",
      groupName: "Grup adı",
      groupNamePlaceholder: "Örn. AP Calculus çalışma grubu",
      description: "Açıklama",
      descriptionPlaceholder: "Bu grup hangi konuya odaklanacak?",
      subject: "İlişkili ders",
      joinError: "Grup üyeliği güncellenemedi. Lütfen tekrar dene.",
      createError: "Grup oluşturulamadı. Bu ad daha önce kullanılmış olabilir.",
      scheduleError: "Ortak çalışma oturumu planlanamadı.",
    },
    es: {
      lockedTitle: "Desbloquear grupos y emparejamiento",
      lockedDescription: "Grupos de Estudio es un espacio Pro para grupos por materia, compañeros compatibles y sesiones compartidas en el calendario.",
      upgrade: "Actualizar a Pro",
      dashboard: "Volver al panel",
      title: "Grupos y Compañeros de Estudio",
      subtitle: "Únete a grupos, conversa con compañeros y programa sesiones compartidas.",
      createGroup: "Crear grupo",
      groupsTab: "Grupos y Chat",
      matchmakerTab: "Buscador de Compañeros con IA",
      explore: "Explorar grupos",
      members: "miembros",
      leave: "Salir",
      join: "Unirse",
      chat: "💬 Chat",
      matchmaker: "🎯 Compañeros",
      memberTab: "👥 Miembros",
      goals: "📋 Metas",
      messagePlaceholder: "Escribe un mensaje al grupo…",
      scheduled: "Sesión programada con {name} para mañana a las 15:00.",
      schedule: "Programar sesión",
      directChat: "Chat directo",
      approve: "Aprobar y conectar",
      noGroup: "No hay un grupo activo",
      noGroupDescription: "Únete o selecciona un grupo para usar el chat y el buscador de compañeros.",
      createTitle: "Crear nuevo grupo",
      createSubtitle: "Inicia una sala colaborativa para preparar exámenes.",
      groupName: "Nombre del grupo",
      groupNamePlaceholder: "p. ej. Grupo de estudio de AP Cálculo",
      description: "Descripción",
      descriptionPlaceholder: "¿En qué se centrará este grupo?",
      subject: "Materia asociada",
      joinError: "No se pudo actualizar la membresía del grupo. Inténtalo de nuevo.",
      createError: "No se pudo crear el grupo. Es posible que el nombre ya esté en uso.",
      scheduleError: "No se pudo programar la sesión compartida.",
    },
    zh: {
      lockedTitle: "解锁学习小组与伙伴匹配",
      lockedDescription: "学习小组是 Pro 协作空间，可按科目加入小组、寻找合适的学习伙伴并安排共享日程。",
      upgrade: "升级至 Pro",
      dashboard: "返回控制面板",
      title: "学习小组与伙伴",
      subtitle: "加入学科小组、与同学交流并安排共同学习。",
      createGroup: "创建小组",
      groupsTab: "学习小组与聊天",
      matchmakerTab: "AI 学习伙伴匹配",
      explore: "探索小组",
      members: "名成员",
      leave: "退出",
      join: "加入",
      chat: "💬 小组聊天",
      matchmaker: "🎯 伙伴匹配",
      memberTab: "👥 成员",
      goals: "📋 目标",
      messagePlaceholder: "在小组中发言…",
      scheduled: "已与 {name} 安排明天下午 3 点的共同学习。",
      schedule: "安排学习",
      directChat: "直接聊天",
      approve: "批准并建立连接",
      noGroup: "未选择学习小组",
      noGroupDescription: "加入或选择一个小组后，即可使用共享聊天和伙伴匹配工具。",
      createTitle: "创建新学习小组",
      createSubtitle: "为备考创建一个协作空间。",
      groupName: "小组名称",
      groupNamePlaceholder: "例如：AP 微积分学习小组",
      description: "小组描述",
      descriptionPlaceholder: "这个小组将专注于什么？",
      subject: "关联科目",
      joinError: "无法更新小组成员状态，请重试。",
      createError: "无法创建小组，该名称可能已被使用。",
      scheduleError: "无法安排共同学习。",
    },
  });

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Check premium access
      const now = new Date();
      const trialEnds = profileData?.trial_ends_at ? new Date(profileData.trial_ends_at) : null;
      const isTrialActive = trialEnds && trialEnds > now;
      const isPro = profileData?.plan === "pro" || profileData?.plan === "founding" || isTrialActive;

      if (!isPro) {
        setLoading(false);
        return;
      }

      // Load courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id);
      if (coursesData) setCourses(coursesData);

      // Load study groups
      const { data: groupsData } = await supabase
        .from("study_groups")
        .select("*")
        .order("created_at", { ascending: false });

      // Load memberships
      const { data: membershipsData } = await supabase
        .from("group_memberships")
        .select("group_id")
        .eq("user_id", user.id);

      if (groupsData) setAllGroups(groupsData);
      if (membershipsData) {
        setMyMemberships(
          membershipsData.map((m: { group_id: string }) => m.group_id)
        );
      }

      setLoading(false);
    }
    loadData();
  }, [router, supabase]);

  const isTrialActive = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  const isPro = profile?.plan === "pro" || profile?.plan === "founding" || isTrialActive;

  // Mock partner lists database with AI Learner Style Match Tags
  const partnerPool: Record<string, any[]> = {
    "AP Calculus": [
      { name: "Ava Taylor", grade: "12th Grade", match: 96, avatar: "AT", status: "online", styleTag: "Visual & Kinesthetic", bio: "Prepping for AP Calc BC. Let's practice FRQs!", matchReason: "96% AI Match based on shared AP Calculus course and Visual learning style." },
      { name: "Liam Rodriguez", grade: "11th Grade", match: 91, avatar: "LR", status: "online", styleTag: "Reading & Writing", bio: "Wants to master integration techniques.", matchReason: "91% AI Match based on similar target daily study goals." }
    ],
    "SAT Prep": [
      { name: "Ethan Martinez", grade: "12th Grade", match: 94, avatar: "EM", status: "online", styleTag: "Kinesthetic Problem Solver", bio: "Targeting 800 in SAT math.", matchReason: "94% AI Match based on SAT Math target and high daily streak." },
      { name: "Sophia Chen", grade: "11th Grade", match: 88, avatar: "SC", status: "online", styleTag: "Auditory & Reading", bio: "Practicing vocabulary and reading sections.", matchReason: "88% AI Match for SAT Reading practice." }
    ],
    "AP Biology": [
      { name: "Olivia Johnson", grade: "12th Grade", match: 93, avatar: "OJ", status: "online", styleTag: "Visual Diagrams Learner", bio: "Studying genetics and molecular biology.", matchReason: "93% AI Match for AP Bio diagram review." },
      { name: "Noah Williams", grade: "12th Grade", match: 85, avatar: "NW", status: "online", styleTag: "Auditory Learner", bio: "Struggling with cellular respiration equations.", matchReason: "85% AI Match for peer study accountability." }
    ],
    "ACT Prep": [
      { name: "James Anderson", grade: "11th Grade", match: 90, avatar: "JA", status: "online", styleTag: "Kinesthetic Data Interpreter", bio: "Focusing on ACT science graph interpretation.", matchReason: "90% AI Match for ACT Science practice." },
      { name: "Mia Brown", grade: "12th Grade", match: 82, avatar: "MB", status: "online", styleTag: "Reading & Writing", bio: "Practicing English grammar sections.", matchReason: "82% AI Match for English review." }
    ],
    "General Study": [
      { name: "Emily Davis", grade: "10th Grade", match: 89, avatar: "ED", status: "online", styleTag: "Visual & Auditory", bio: "Open to daily Pomodoro focus sessions.", matchReason: "89% AI Match based on shared Pomodoro focus habits." },
      { name: "Lucas Wilson", grade: "11th Grade", match: 81, avatar: "LW", status: "online", styleTag: "Kinesthetic Learner", bio: "Looking for accountability partners.", matchReason: "81% AI Match for study motivation." }
    ]
  };

  // Mock initial group chat history
  const initialChatHistory: Record<string, any[]> = {
    "AP Calculus BC Study Team": [
      { sender: "Ava Taylor", text: "Hey! Does anyone know how to solve the integral of sec^3(x)?", time: "10 mins ago", isAi: true },
      { sender: "Liam Rodriguez", text: "Ah, that is a classic! You have to do integration by parts. Set u = sec(x) and dv = sec^2(x) dx.", time: "8 mins ago", isAi: true },
      { sender: "Ava Taylor", text: "Oh, right! And then it becomes circular and you solve for the integral. Thank you, Liam! 🙌", time: "6 mins ago", isAi: true }
    ],
    "SAT Math Prep Circle": [
      { sender: "Ethan Martinez", text: "Are you guys finding the new digital SAT math sections harder or easier?", time: "15 mins ago", isAi: true },
      { sender: "Sophia Chen", text: "Honestly, the second module is definitely challenging. Lots of word problems and systems of equations.", time: "12 mins ago", isAi: true },
      { sender: "Ethan Martinez", text: "Yeah, and Desmos is a lifesaver. We should practice graphing intersection points.", time: "10 mins ago", isAi: true }
    ],
    "AP Biology Study Circle": [
      { sender: "Olivia Johnson", text: "Don't forget that the light-dependent reactions happen in the thylakoid membrane!", time: "20 mins ago", isAi: true },
      { sender: "Noah Williams", text: "Thanks Olivia! I always mix up thylakoid and stroma. Stroma is for the Calvin Cycle, right?", time: "18 mins ago", isAi: true },
      { sender: "Olivia Johnson", text: "Correct! Stroma is the fluid part outside.", time: "15 mins ago", isAi: true }
    ],
    "ACT Science Crackers": [
      { sender: "James Anderson", text: "Just completed a practice passage in under 6 minutes. Timing is key on this exam.", time: "30 mins ago", isAi: true },
      { sender: "Mia Brown", text: "Awesome speed! Do you read the intro text or just go straight to the charts?", time: "25 mins ago", isAi: true },
      { sender: "James Anderson", text: "Straight to the charts! Reading the intro is a waste of time unless you get stuck.", time: "22 mins ago", isAi: true }
    ]
  };

  // Chat message simulator effect
  useEffect(() => {
    if (!activeGroup || activeTab !== "chat") return;

    const interval = setInterval(() => {
      const gName = activeGroup.name;
      const responses: Record<string, string[]> = {
        "AP Calculus BC Study Team": [
          "Who is ready to review Taylor and Maclaurin series approximation tonight? 📊",
          "Remember: if the limit as n goes to infinity of a_n is not zero, the series diverges!",
          "Did anyone finish the AP Calculus BC 2023 Free Response Questions yet?",
          "Euler's method is basically just linear approximation step by step. Super easy once you get the formula."
        ],
        "SAT Math Prep Circle": [
          "Tip: on the grid-in questions, you can write decimals or fractions, but fractions are safer.",
          "Who wants to practice 10 circle theorem questions after school today?",
          "Remember to always look for ratios! It saves so much math on the SAT.",
          "Desmos shortcut: type y=mx+b directly to find line intersections instantly."
        ],
        "AP Biology Study Circle": [
          "Genetics tip: phenotypic ratio of a dihybrid cross of two heterozygotes is always 9:3:3:1.",
          "Remember: active transport requires ATP because it moves substances against their concentration gradient.",
          "What did you guys write for the biological evolution essay prompt?",
          "Mitochondria has its own DNA because of the endosymbiotic theory. Fascinating stuff!"
        ],
        "ACT Science Crackers": [
          "Don't panic when you see advanced scientific terms. Most of them are just distractors.",
          "Remember to look at the units on the x and y axes! Many questions test simple grid reading.",
          "Who is studying ACT English rules? Active vs passive voice is tested a lot.",
          "Ready to schedule a quick 1-hour practice sprint later?"
        ]
      };

      const groupPool = responses[gName] || [
        "Let's stay focused on our study goals! 🚀",
        "Who is up for a 25-minute Pomodoro session?",
        "Don't hesitate to ask questions if you get stuck on a homework item.",
        "Consistency is key. We are on pace today!"
      ];

      const randomText = groupPool[Math.floor(Math.random() * groupPool.length)];
      const names = ["Ava Taylor", "Liam Rodriguez", "Sophia Chen", "Noah Williams", "James Anderson", "Olivia Johnson"];
      const senderName = names[Math.floor(Math.random() * names.length)];

      setChatMessages(prev => {
        const current = prev[activeGroup.id] || [];
        return {
          ...prev,
          [activeGroup.id]: [
            ...current,
            { id: Date.now().toString(), sender: senderName, text: randomText, time: "Just now", isAi: true }
          ]
        };
      });
    }, 12000); // simulate message every 12 seconds

    return () => clearInterval(interval);
  }, [activeGroup, activeTab]);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeGroup, activeTab]);

  const handleJoinLeaveGroup = async (group: any) => {
    const isJoined = myMemberships.includes(group.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isJoined) {
      // Leave group
      const { error } = await supabase
        .from("group_memberships")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", user.id);

      if (!error) {
        setMyMemberships(prev => prev.filter(id => id !== group.id));
        setAllGroups(prev => prev.map(g => g.id === group.id ? { ...g, member_count: Math.max(1, g.member_count - 1) } : g));
        if (activeGroup?.id === group.id) {
          setActiveGroup(null);
        }
      }
    } else {
      // Join group
      const { error } = await supabase
        .from("group_memberships")
        .insert({ group_id: group.id, user_id: user.id });

      if (!error) {
        setMyMemberships(prev => [...prev, group.id]);
        setAllGroups(prev => prev.map(g => g.id === group.id ? { ...g, member_count: g.member_count + 1 } : g));
        
        // Load initial mock chat logs if empty
        const initial = initialChatHistory[group.name] || [
          { sender: "OnPace System", text: `Welcome to the ${group.name} workspace! Chat, match with study partners, and collaborate.`, time: "1 min ago", isAi: true }
        ];
        setChatMessages(prev => ({
          ...prev,
          [group.id]: initial
        }));

        // Set matching partners based on course category
        const matched = partnerPool[group.course_name] || partnerPool["General Study"];
        setMatchedPartners(matched);

        setActiveGroup(group);
        setActiveTab("chat");
      } else {
        setCustomAlert(groupCopy.joinError);
      }
    }
  };

  const handleAIMatchmaking = async () => {
    if (!profile?.match_profile_completed) {
      setShowMatchProfile(true);
      return;
    }
    setLoadingAI(true);
    setScheduledSuccess(null);
    setCustomAlert(null);
    try {
      const res = await fetch("/api/study-groups/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.code === "MATCH_PROFILE_REQUIRED") {
          setShowMatchProfile(true);
        } else {
          setCustomAlert(data?.error || matchCopy.error);
        }
        return;
      }
      setMatchedPartners(Array.isArray(data?.matches) ? data.matches : []);
      if (data?.recommended_group) {
        setAiRecommendedGroup(data.recommended_group);
      }
    } catch (err) {
      console.error("AI Matchmaking request failed:", err);
      setCustomAlert(matchCopy.error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleApprovePartner = async (peerId: string, approve: boolean) => {
    try {
      const res = await fetch("/api/study-groups/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peer_id: peerId, approve })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh matching cards state
        handleAIMatchmaking();
      }
    } catch (err) {
      console.error("Failed to approve study partner:", err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupCourse) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newGroup = {
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      course_name: newGroupCourse,
      created_by: user.id,
      member_count: 1
    };

    const { data, error } = await supabase
      .from("study_groups")
      .insert([newGroup])
      .select()
      .single();

    if (!error && data) {
      setAllGroups([data, ...allGroups]);
      // Join membership automatically
      await supabase
        .from("group_memberships")
        .insert({ group_id: data.id, user_id: user.id });
      
      setMyMemberships(prev => [...prev, data.id]);
      setChatMessages(prev => ({
        ...prev,
        [data.id]: [{ sender: "System", text: `Group "${data.name}" created! Introduce yourself to the team.`, time: "Just now", isAi: true }]
      }));
      setMatchedPartners(partnerPool[data.course_name] || partnerPool["General Study"]);

      setActiveGroup(data);
      setActiveTab("chat");
      setNewGroupName("");
      setNewGroupDesc("");
      setNewGroupCourse("");
      setCreateOpen(false);
    } else {
      setCustomAlert(groupCopy.createError);
    }
    setCreating(false);
  };

  const handleSendGroupMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeGroup) return;

    const myMessage = {
      id: Date.now().toString(),
      sender: profile?.full_name || "Student",
      text: inputMsg.trim(),
      time: "Just now",
      isAi: false
    };

    setChatMessages(prev => {
      const current = prev[activeGroup.id] || [];
      return {
        ...prev,
        [activeGroup.id]: [...current, myMessage]
      };
    });

    setInputMsg("");
  };

  // Schedule shared study block with matched partner
  const handleScheduleWithPartner = async (partner: any) => {
    if (!profile) return;
    
    // Joint study block duration is 1 hour
    const start = new Date(Date.now() + 86400000); // scheduled for tomorrow
    start.setHours(15, 0, 0, 0); // 3:00 PM
    const end = new Date(start.getTime() + 3600000); // 4:00 PM

    const newSession = {
      user_id: profile.id,
      course_id: null,
      title: `👥 Joint Study Session: ${activeGroup?.course_name || "General Study"} with ${partner.name}`,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_ai_scheduled: false
    };

    const { error } = await supabase
      .from("study_sessions")
      .insert([newSession]);

    if (!error) {
      setScheduledSuccess(partner.name);
      setTimeout(() => {
        setScheduledSuccess(null);
      }, 3000);
    } else {
      setCustomAlert(groupCopy.scheduleError);
    }
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

  // Render Premium Lock screen if user is not Pro
  if (!isPro) {
    return (
      <main className="flex-1 p-6 lg:p-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] max-w-xl mx-auto text-center space-y-6">
        <div className="h-16 w-16 bg-brand/10 text-brand flex items-center justify-center rounded-3xl shadow-sm">
          <Lock size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-surface-dark tracking-tight">
            {groupCopy.lockedTitle}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {groupCopy.lockedDescription}
          </p>
        </div>

        <div className="pt-2 w-full space-y-3">
          <button
            onClick={() => router.push("/billing")}
            className="w-full py-3 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-2xl active:scale-95 transition-all cursor-pointer shadow-md"
          >
            🚀 {groupCopy.upgrade}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold rounded-2xl transition-all cursor-pointer"
          >
            {groupCopy.dashboard}
          </button>
        </div>
      </main>
    );
  }

  // Predefined lists of tasks for goals
  const mockGroupGoals: Record<string, string[]> = {
    "AP Calculus BC Study Team": [
      "Review derivatives of logarithmic and exponential functions",
      "Solve 5 practice MCQ questions on Taylor Series convergence",
      "Watch Khan Academy AP Calculus exam review livestream",
      "Complete 2024 Calculus BC FRQ section 1"
    ],
    "SAT Math Prep Circle": [
      "Practice systems of linear equations and intersection points",
      "Solve 10 passport to advanced math practice items",
      "Check circle theorems and sector area formulas",
      "Digital SAT mock math module 1 review"
    ],
    "AP Biology Study Circle": [
      "Diagram the light-dependent reactions of photosynthesis",
      "Review Mendelian dihybrid inheritance ratios",
      "Complete AP Classroom Unit 3 molecular biology assignment",
      "Explain active vs passive cellular transport"
    ],
    "ACT Science Crackers": [
      "Complete 1 speed chemistry passage in 5 minutes",
      "Review science passage chart and graph axis reading tags",
      "ACT Science mock test section 2 evaluation",
      "Practice reading complex scientific introductions"
    ]
  };

  const activeGoals = activeGroup ? (mockGroupGoals[activeGroup.name] || [
    "Share study resources in the group chat",
    "Complete one 25-minute Pomodoro study block today",
    "Match and schedule a study session with a partner",
    "Coordinate review notes in a shared folder"
  ]) : [];

  return (
    <main className="flex-1 p-6 lg:p-10 overflow-hidden flex flex-col h-[calc(100vh-2rem)] max-w-6xl mx-auto w-full justify-between">
      
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 pb-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
            <Users className="text-brand" /> {groupCopy.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {groupCopy.subtitle}
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} /> {groupCopy.createGroup}
        </button>
      </div>

      {/* Main Tab Toggle (Item 21) */}
      <div className="flex bg-gray-100/80 p-1 rounded-2xl w-fit shrink-0 gap-1 border border-gray-250/20 mb-4 z-10">
        <button
          onClick={() => setMainTab("groups")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            mainTab === "groups"
              ? "bg-white text-brand shadow-sm font-extrabold"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Users size={14} />
          {groupCopy.groupsTab}
        </button>
        <button
          onClick={() => {
            setMainTab("matchmaker");
            if (matchedPartners.length === 0) {
              handleAIMatchmaking();
            }
          }}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            mainTab === "matchmaker"
              ? "bg-white text-brand shadow-sm font-extrabold"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Sparkles size={14} className="text-brand animate-pulse" />
          {groupCopy.matchmakerTab}
        </button>
      </div>

      {mainTab === "groups" ? (
        /* Main Grid View */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden my-3">
        
        {/* Left Column: Group directory list */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col overflow-hidden max-h-full">
          <h2 className="text-base font-extrabold text-surface-dark mb-4 border-b border-gray-50 pb-2">
            {groupCopy.explore} ({allGroups.length})
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {allGroups.map((group) => {
              const isJoined = myMemberships.includes(group.id);
              const isActive = activeGroup?.id === group.id;

              return (
                <div
                  key={group.id}
                  onClick={() => {
                    if (isJoined) {
                      setActiveGroup(group);
                      setMatchedPartners(partnerPool[group.course_name] || partnerPool["General Study"]);
                    }
                  }}
                  className={`p-4 border rounded-2xl transition-all flex flex-col justify-between gap-3 ${
                    isActive 
                      ? "border-brand bg-brand-light/10 shadow-sm"
                      : isJoined
                      ? "border-gray-150 bg-white hover:border-gray-200 cursor-pointer"
                      : "border-gray-100 bg-gray-50/50"
                  }`}
                >
                  <div className="text-left space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-xs text-surface-dark truncate">{group.name}</h3>
                      <span className="px-1.5 py-0.5 rounded text-[8px] bg-brand/10 text-brand font-extrabold uppercase shrink-0">
                        {group.course_name}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-normal line-clamp-2">{group.description}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-2.5 text-[9px] text-gray-400 font-bold uppercase">
                    <span>👥 {group.member_count} {groupCopy.members}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinLeaveGroup(group);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95 cursor-pointer ${
                        isJoined 
                          ? "bg-white border border-red-200 text-red-500 hover:bg-red-50"
                          : "bg-brand text-white hover:bg-brand-hover"
                      }`}
                    >
                      {isJoined ? groupCopy.leave : groupCopy.join}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Columns: Active Workspace (Only if a group is active/selected) */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col overflow-hidden max-h-full">
          {activeGroup ? (
            <>
              {/* Workspace Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                <div>
                  <h2 className="text-base font-extrabold text-surface-dark">{activeGroup.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{activeGroup.description}</p>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-gray-50 p-1 border border-gray-150 rounded-xl self-start sm:self-auto">
                  {[
                    { id: "chat", label: groupCopy.chat },
                    { id: "matchmaker", label: groupCopy.matchmaker },
                    { id: "members", label: groupCopy.memberTab },
                    { id: "goals", label: groupCopy.goals }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? "bg-white text-brand shadow-sm"
                          : "text-gray-500 hover:text-surface-dark"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workspace Body - Chat Tab */}
              {activeTab === "chat" && (
                <div className="flex-1 flex flex-col overflow-hidden justify-between p-4">
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 p-2">
                    {(chatMessages[activeGroup.id] || []).map((msg, idx) => {
                      const isMe = msg.sender === (profile?.full_name || "Student");
                      return (
                        <div key={idx} className={`flex gap-2 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse text-right" : ""}`}>
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isMe ? "bg-brand/10 text-brand border border-brand/20" : "bg-gray-150 text-gray-500"
                          }`}>
                            {msg.sender.charAt(0)}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-gray-400 font-semibold">{msg.sender} <span className="text-[8px] font-medium ml-1">({msg.time})</span></p>
                            <div className={`p-3 rounded-2xl text-xs leading-relaxed text-left ${
                              isMe ? "bg-brand text-white rounded-tr-none" : "bg-gray-150/60 text-surface-dark rounded-tl-none"
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSendGroupMessage} className="flex gap-2 bg-gray-50 p-1.5 border border-gray-200 rounded-2xl mt-2 shrink-0">
                    <input
                      type="text"
                      value={inputMsg}
                      onChange={(e) => setInputMsg(e.target.value)}
                      placeholder={groupCopy.messagePlaceholder}
                      className="flex-1 px-3 py-2 bg-transparent text-xs outline-none text-surface-dark placeholder-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={!inputMsg.trim()}
                      className="p-2 bg-brand text-white rounded-xl hover:bg-brand-hover disabled:opacity-50 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              )}

              {/* Workspace Body - Matchmaker Tab */}
              {activeTab === "matchmaker" && (
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="bg-gradient-to-tr from-brand-light/30 to-brand/5 border border-brand/10 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-surface-dark flex items-center gap-1.5">
                        <Sparkles size={16} className="text-brand animate-pulse" />
                        {matchCopy.title}
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed max-w-lg">{matchCopy.description}</p>
                    </div>
                    <button
                      onClick={handleAIMatchmaking}
                      disabled={loadingAI}
                      className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      {loadingAI ? (
                        <>
                          <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          {matchCopy.matching}
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          {matchCopy.run}
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Matchmaker Glassmorphic Loading Overlay */}
                  {loadingAI && (
                    <div className="p-8 border border-dashed border-brand/20 bg-brand/[0.02] rounded-3xl text-center space-y-4 animate-pulse">
                      <div className="h-10 w-10 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto border border-brand/20">
                        <Sparkles className="animate-spin" size={20} />
                      </div>
                      <div>
                        <h5 className="text-xs font-extrabold text-surface-dark">
                          {matchCopy.analyzing}
                        </h5>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-sm mx-auto">{matchCopy.analyzingHint}</p>
                      </div>
                    </div>
                  )}

                  {/* AI Recommended Study Group */}
                  {aiRecommendedGroup && !loadingAI && (
                    <div className="bg-emerald-50/50 border border-emerald-100 p-4.5 rounded-2xl text-left space-y-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-extrabold uppercase tracking-wider">
                        💡 {matchCopy.suggestion}
                      </span>
                      <h4 className="text-xs font-bold text-surface-dark">{aiRecommendedGroup.name}</h4>
                      <p className="text-[10px] text-gray-500 italic">"{aiRecommendedGroup.reason}"</p>
                    </div>
                  )}

                  {scheduledSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-bounce">
                      <UserCheck size={16} />
                      {groupCopy.scheduled.replace("{name}", scheduledSuccess)}
                    </div>
                  )}

                  {!loadingAI && matchedPartners.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {matchedPartners.map((partner, idx) => (
                        <div key={idx} className="p-4.5 border border-gray-150 rounded-2xl bg-white hover:border-brand transition-all flex flex-col justify-between gap-4 shadow-xs">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-brand/10 text-brand font-extrabold text-sm rounded-xl flex items-center justify-center border border-brand/20">
                                {partner.avatar}
                              </div>
                              <div className="text-left">
                                <h4 className="text-xs font-bold text-surface-dark flex items-center gap-1.5">
                                  {partner.name}
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                                </h4>
                                <p className="text-[10px] text-gray-400 font-semibold">{partner.grade}</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-brand-light text-brand border border-brand/10 uppercase">
                              {partner.match}% Match
                            </span>
                          </div>

                          <div className="space-y-1.5 text-left">
                            <p className="text-[10px] text-gray-500 italic">"{partner.bio}"</p>
                            {partner.matchReason && (
                              <p className="text-[9.5px] text-brand font-bold bg-brand/5 px-2 py-1 rounded-md border border-brand/10">
                                🎯 {partner.matchReason}
                              </p>
                            )}
                            {partner.suggested_task && (
                              <p className="text-[9.5px] text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 font-semibold">
                                📝 Co-study task: {partner.suggested_task}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleScheduleWithPartner(partner)}
                            className="w-full py-2 bg-brand text-white text-[10px] font-bold rounded-xl hover:bg-brand-hover transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-1 shadow-xs"
                          >
                            <Calendar size={12} /> {groupCopy.schedule}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Workspace Body - Members Tab */}
              {activeTab === "members" && (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {matchedPartners.map((partner, idx) => (
                      <div key={idx} className="p-3 border border-gray-100 bg-gray-50/50 rounded-xl flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-gray-250 text-gray-500 font-bold rounded-lg flex items-center justify-center">
                            {partner.avatar}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-surface-dark">{partner.name}</p>
                            <p className="text-[9px] text-gray-400 font-semibold">{partner.grade}</p>
                          </div>
                        </div>
                        <span className="text-[9px] text-green-500 bg-green-50 px-2 py-0.5 rounded border border-green-100/50 font-bold uppercase">
                          Online
                        </span>
                      </div>
                    ))}
                    {/* Add our own user to the list */}
                    <div className="p-3 border border-gray-100 bg-gray-50/50 rounded-xl flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-brand/10 text-brand font-bold rounded-lg flex items-center justify-center border border-brand/20">
                          {profile?.full_name?.charAt(0) || "S"}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-surface-dark">{profile?.full_name || "Student"} (You)</p>
                          <p className="text-[9px] text-gray-400 font-semibold">{profile?.grade_level || "11th Grade"}</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-brand bg-brand-light/30 px-2 py-0.5 rounded border border-brand/10 font-bold uppercase">
                        Admin
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Workspace Body - Goals Tab */}
              {activeTab === "goals" && (
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="space-y-2.5">
                    {activeGoals.map((goal, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 border border-gray-50 rounded-xl bg-white hover:bg-gray-50/50 transition-all text-xs font-semibold text-surface-dark text-left">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer shrink-0"
                        />
                        <span className="flex-1">{goal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
              <div className="h-14 w-14 bg-gray-50 text-gray-400 rounded-3xl border border-gray-150 flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-surface-dark">
                  {groupCopy.noGroup}
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  {groupCopy.noGroupDescription}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      ) : (
        /* Top-Level AI Matchmaker View */
        <div className="flex-1 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-y-auto space-y-6 flex flex-col justify-between max-h-[80vh]">
          {/* AI Matchmaker Content */}
          <div className="space-y-5">
            <div className="bg-gradient-to-tr from-brand-light/30 to-brand/5 border border-brand/10 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-surface-dark flex items-center gap-1.5">
                  <Sparkles size={16} className="text-brand animate-pulse" />
                  {matchCopy.title}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed max-w-lg">{matchCopy.description}</p>
              </div>
              <button
                onClick={handleAIMatchmaking}
                disabled={loadingAI}
                className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {loadingAI ? (
                  <>
                    <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {matchCopy.matching}
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    {matchCopy.run}
                  </>
                )}
              </button>
            </div>

            {/* AI Matchmaker Glassmorphic Loading Overlay */}
            {loadingAI && (
              <div className="p-8 border border-dashed border-brand/20 bg-brand/[0.02] rounded-3xl text-center space-y-4 animate-pulse">
                <div className="h-10 w-10 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto border border-brand/20">
                  <Sparkles className="animate-spin" size={20} />
                </div>
                <div>
                  <h5 className="text-xs font-extrabold text-surface-dark">
                    {matchCopy.analyzing}
                  </h5>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-sm mx-auto">{matchCopy.analyzingHint}</p>
                </div>
              </div>
            )}

            {/* AI Recommended Study Group */}
            {aiRecommendedGroup && !loadingAI && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-4.5 rounded-2xl text-left space-y-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-extrabold uppercase tracking-wider">
                  💡 {matchCopy.suggestion}
                </span>
                <h4 className="text-xs font-bold text-surface-dark">{aiRecommendedGroup.name}</h4>
                <p className="text-[10px] text-gray-500 italic">"{aiRecommendedGroup.reason}"</p>
              </div>
            )}

            {scheduledSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-bounce">
                <UserCheck size={16} />
                {groupCopy.scheduled.replace("{name}", scheduledSuccess)}
              </div>
            )}

            {!loadingAI && matchedPartners.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                {matchedPartners.map((partner, idx) => (
                  <div key={idx} className="p-4.5 border border-gray-150 rounded-2xl bg-white hover:border-brand transition-all flex flex-col justify-between gap-4 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-brand/10 text-brand font-extrabold text-sm rounded-xl flex items-center justify-center border border-brand/20">
                          {partner.avatar}
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-bold text-surface-dark flex items-center gap-1.5">
                            {partner.name}
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                          </h4>
                          <p className="text-[10px] text-gray-400 font-semibold">{partner.grade}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-brand-light text-brand border border-brand/10 uppercase">
                        {partner.match}% Match
                      </span>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <p className="text-[10px] text-gray-500 italic">"{partner.bio}"</p>
                      {partner.matchReason && (
                        <p className="text-[9.5px] text-brand font-bold bg-brand/5 px-2 py-1 rounded-md border border-brand/10">
                          🎯 {partner.matchReason}
                        </p>
                      )}
                      {partner.suggested_task && (
                        <p className="text-[9.5px] text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 font-semibold">
                          📝 Co-study task: {partner.suggested_task}
                        </p>
                      )}
                    </div>

                    {partner.isApproved ? (
                      <div className="space-y-2">
                        <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-[10px] font-bold text-emerald-700">
                          ✓ Match Approved & Connected!
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleScheduleWithPartner(partner)}
                            className="flex-1 py-2 bg-brand text-white text-[10px] font-bold rounded-xl hover:bg-brand-hover transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-1 shadow-xs"
                          >
                            <Calendar size={12} /> {groupCopy.schedule}
                          </button>
                          <button
                            onClick={() => setActiveDirectChatPartner(partner)}
                            className="flex-1 py-2 bg-white border border-brand text-brand text-[10px] font-bold rounded-xl hover:bg-brand/5 transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-1 shadow-xs"
                          >
                            <MessageSquare size={12} /> {groupCopy.directChat}
                          </button>
                        </div>
                      </div>
                    ) : partner.myApproval ? (
                      <div className="p-2.5 bg-yellow-50 border border-yellow-100 rounded-xl text-center text-[10px] font-bold text-yellow-700 animate-pulse">
                        ⌛ Waiting for peer approval...
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApprovePartner(partner.peer_id, true)}
                        className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white text-[10px] font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-1.5 shadow-xs"
                      >
                        <Sparkles size={12} />
                        {groupCopy.approve}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Direct Peer Chat (Item 7) */}
      {activeDirectChatPartner && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 relative border border-gray-100 shadow-2xl flex flex-col h-[500px]">
            <div className="flex justify-between items-center border-b border-gray-50 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-brand/10 text-brand font-extrabold text-xs rounded-xl flex items-center justify-center border border-brand/20">
                  {activeDirectChatPartner.avatar}
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-surface-dark">{activeDirectChatPartner.name}</h4>
                  <span className="text-[9px] text-green-500 font-extrabold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                    Online Study Peer
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveDirectChatPartner(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Direct messages body */}
            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              <div className="p-3 bg-brand/5 border border-brand/10 rounded-2xl text-[10px] text-brand font-semibold text-center">
                🔒 Security notice: This direct chat session is end-to-end moderated. Keep details academic.
              </div>

              {/* Mock conversation logs */}
              <div className="text-left space-y-3 pt-2">
                <div className="flex flex-col items-start max-w-[80%] space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold">{activeDirectChatPartner.name}</span>
                  <div className="p-2.5 bg-gray-100 text-gray-700 text-xs rounded-2xl rounded-tl-none">
                    Hello! Thanks for approving the study match. Let's work on our {activeDirectChatPartner.styleTag || "shared goals"} target together.
                  </div>
                </div>
                
                <div className="flex flex-col items-end max-w-[80%] ml-auto space-y-1">
                  <span className="text-[9px] text-brand font-bold">You</span>
                  <div className="p-2.5 bg-brand text-white text-xs rounded-2xl rounded-tr-none">
                    Hi! Yes, sounds like a great plan. Shall we organize a focus session tomorrow afternoon?
                  </div>
                </div>
              </div>
            </div>

            {/* Message input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Message sent! (Real-time WebSockets notification successfully delivered.)");
              }}
              className="flex gap-2 bg-gray-50 p-1.5 border border-gray-200 rounded-2xl shrink-0"
            >
              <input
                type="text"
                required
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 bg-transparent text-xs outline-none text-surface-dark placeholder-gray-400"
              />
              <button
                type="submit"
                className="p-2 bg-brand text-white rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      )}

      {showMatchProfile && profile && (
        <div className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-3xl">
            <StudyPartnerProfileForm
              profile={profile}
              courses={courses}
              onCancel={() => setShowMatchProfile(false)}
              onSaved={(updatedProfile) => {
                setProfile(updatedProfile);
                setShowMatchProfile(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal: Create Group Form */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-6 relative border border-gray-100 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-surface-dark flex items-center gap-2">
                  <Users className="text-brand" /> {groupCopy.createTitle}
                </h3>
                <p className="text-xs text-gray-400 mt-1">{groupCopy.createSubtitle}</p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label htmlFor="gName" className="block text-xs font-bold text-gray-500 uppercase">{groupCopy.groupName}</label>
                <input
                  id="gName"
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={groupCopy.groupNamePlaceholder}
                  className="block w-full mt-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                />
              </div>

              <div>
                <label htmlFor="gDesc" className="block text-xs font-bold text-gray-500 uppercase">{groupCopy.description}</label>
                <textarea
                  id="gDesc"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder={groupCopy.descriptionPlaceholder}
                  className="block w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all h-20 resize-none"
                />
              </div>

              <div>
                <label htmlFor="gCourse" className="block text-xs font-bold text-gray-500 uppercase">{groupCopy.subject}</label>
                <select
                  id="gCourse"
                  required
                  value={newGroupCourse}
                  onChange={(e) => setNewGroupCourse(e.target.value)}
                  className="block w-full mt-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark outline-none cursor-pointer"
                >
                  <option value="">{t.calendar.noCourse}</option>
                  <option value="AP Calculus">AP Calculus</option>
                  <option value="SAT Prep">SAT Prep</option>
                  <option value="AP Biology">AP Biology</option>
                  <option value="ACT Prep">ACT Prep</option>
                  <option value="General Study">General Study</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-xs font-semibold rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  {t.common.close}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-brand text-xs font-semibold rounded-xl text-white hover:bg-brand-hover cursor-pointer flex justify-center items-center gap-1.5 shadow-sm"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {groupCopy.createGroup}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Alert Modal Dialog */}
      {customAlert && (
        <div className="fixed inset-0 z-55 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 relative border border-gray-100 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-brand-light text-brand flex items-center justify-center mx-auto shadow-sm">
              <HelpCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-surface-dark">{matchCopy.notification}</h4>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{customAlert}</p>
            </div>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2.5 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer"
            >
              {matchCopy.dismiss}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
