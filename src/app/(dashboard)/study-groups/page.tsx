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

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

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
        setMyMemberships(membershipsData.map(m => m.group_id));
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
        setCustomAlert("Failed to join the study group. Please try again.");
      }
    }
  };

  const handleAIMatchmaking = async () => {
    setLoadingAI(true);
    setScheduledSuccess(null);
    try {
      const res = await fetch("/api/study-groups/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.matches) {
        setMatchedPartners(data.matches);
        if (data.recommended_group) {
          setAiRecommendedGroup(data.recommended_group);
        }
      }
    } catch (err) {
      console.error("AI Matchmaking request failed:", err);
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
      setCustomAlert("Failed to create study group. Group name might already be taken.");
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
      setCustomAlert("Failed to schedule joint study session.");
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
            {lang === "zh" ? "解锁学习小组与伙伴匹配" : lang === "es" ? "Desbloquear Grupos de Estudio" : "Unlock Study Groups & Matchmaking"}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {lang === "zh" ? "Study Groups 是 Pro 专属的高级社交协作工具。加入特定学科的讨论小组，与志同道合的同学配对，并直接在日历上安排共同学习时段。" : lang === "es" ? "Study Groups es una función Pro premium para colaboración académica. Únete a grupos de materias específicas, chatea con compañeros y programa sesiones conjuntas en tu calendario." : "Study Groups is a Pro premium feature designed for collaborative learning. Join subject-specific groups, chat with students prepping for similar exams, and instantly schedule joint study blocks."}
          </p>
        </div>

        <div className="pt-2 w-full space-y-3">
          <button
            onClick={() => router.push("/billing")}
            className="w-full py-3 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-2xl active:scale-95 transition-all cursor-pointer shadow-md"
          >
            🚀 {lang === "zh" ? "升级至 Pro" : lang === "es" ? "Actualizar a Pro" : "Upgrade to Pro Tier"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold rounded-2xl transition-all cursor-pointer"
          >
            {lang === "zh" ? "返回控制面板" : lang === "es" ? "Volver al Tablero" : "Go to Dashboard"}
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
            <Users className="text-brand" /> {lang === "zh" ? "学习小组 & 伙伴" : lang === "es" ? "Grupos de Estudio" : "Study Groups & Partners"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lang === "zh" ? "加入学科小组，匹配在线的学习同伴共同督促。" : lang === "es" ? "Únete a grupos de estudio, chatea con compañeros y programa sesiones." : "Join academic groups, chat with online study partners, and schedule joint slots."}
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} /> {lang === "zh" ? "创建小组" : lang === "es" ? "Crear Grupo" : "Create Group"}
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
          {lang === "tr" ? "Çalışma Grupları & Chat" : lang === "es" ? "Grupos & Chat" : "Study Groups & Chat"}
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
          {lang === "tr" ? "AI Eşleştirici (Matchmaker)" : lang === "es" ? "Echador AI" : "AI Study Matchmaker"}
        </button>
      </div>

      {mainTab === "groups" ? (
        /* Main Grid View */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden my-3">
        
        {/* Left Column: Group directory list */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col overflow-hidden max-h-full">
          <h2 className="text-base font-extrabold text-surface-dark mb-4 border-b border-gray-50 pb-2">
            {lang === "zh" ? "探索小组" : lang === "es" ? "Explorar Grupos" : "Explore Groups"} ({allGroups.length})
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
                    <span>👥 {group.member_count} {lang === "zh" ? "名成员" : lang === "es" ? "Miembros" : "Members"}</span>
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
                      {isJoined 
                        ? (lang === "zh" ? "退出" : lang === "es" ? "Salir" : "Leave")
                        : (lang === "zh" ? "加入" : lang === "es" ? "Unirse" : "Join")}
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
                    { id: "chat", label: lang === "zh" ? "💬 小组群聊" : lang === "es" ? "💬 Chat" : "💬 Chat" },
                    { id: "matchmaker", label: lang === "zh" ? "🎯 伙伴匹配" : lang === "es" ? "🎯 Socios" : "🎯 Matchmaker" },
                    { id: "members", label: lang === "zh" ? "👥 成员" : lang === "es" ? "👥 Miembros" : "👥 Members" },
                    { id: "goals", label: lang === "zh" ? "📋 目标" : lang === "es" ? "📋 Metas" : "📋 Goals" }
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
                      placeholder={lang === "zh" ? "在小组中发言..." : lang === "es" ? "Escribe un mensaje al grupo..." : "Type your message to the group..."}
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
                        {lang === "tr" ? "AI Destekli Eşleştirme Analizi" : lang === "zh" ? "AI 智能匹配分析" : lang === "es" ? "Análisis de Parejas de IA" : "AI study-partner Matchmaker Analysis"}
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed max-w-lg">
                        {lang === "tr"
                          ? "Yapay zeka, öğrenme stilinizi ve çalışma hedeflerinizi analiz ederek size en uygun çalışma arkadaşlarını bulur."
                          : lang === "zh"
                          ? "AI 会自动分析您的学习偏好和目标，为您匹配最契合的自习伙伴。"
                          : lang === "es"
                          ? "La IA analiza tus estilos de aprendizaje y metas académicas para encontrar los compañeros ideales."
                          : "AI analyzes your learner types, goals, and enrolled subjects to find the most compatible study peers."}
                      </p>
                    </div>
                    <button
                      onClick={handleAIMatchmaking}
                      disabled={loadingAI}
                      className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      {loadingAI ? (
                        <>
                          <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          {lang === "tr" ? "Eşleştiriliyor..." : "Matching..."}
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          {lang === "tr" ? "AI Eşleştirmeyi Başlat" : "Run AI Matchmaker"}
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
                          {lang === "tr" ? "AI Çalışma Profilinizi Analiz Ediyor..." : "AI is Analyzing Your Academic Profile..."}
                        </h5>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-sm mx-auto">
                          {lang === "tr"
                            ? "Eşleşen dersler, günlük hedefler ve öğrenme stilleri hizalanıyor."
                            : "Comparing compatible study schedules, daily goals, and visual/auditory preferences."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AI Recommended Study Group */}
                  {aiRecommendedGroup && !loadingAI && (
                    <div className="bg-emerald-50/50 border border-emerald-100 p-4.5 rounded-2xl text-left space-y-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-extrabold uppercase tracking-wider">
                        💡 AI Group Suggestion
                      </span>
                      <h4 className="text-xs font-bold text-surface-dark">{aiRecommendedGroup.name}</h4>
                      <p className="text-[10px] text-gray-500 italic">"{aiRecommendedGroup.reason}"</p>
                    </div>
                  )}

                  {scheduledSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-bounce">
                      <UserCheck size={16} />
                      {lang === "zh" ? `已成功与 ${scheduledSuccess} 预约明天下午 3 点的共同学习！` : lang === "es" ? `¡Sesión agendada con ${scheduledSuccess} para mañana 3:00 PM!` : `Study Session scheduled with ${scheduledSuccess} for tomorrow at 3:00 PM!`}
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
                            <Calendar size={12} /> {lang === "zh" ? "预约同伴自习" : lang === "es" ? "Agendar Sesión" : "Schedule Session"}
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
                  {lang === "zh" ? "未选择小组工作区" : lang === "es" ? "Ningún Grupo Seleccionado" : "No Study Group Active"}
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  {lang === "zh" ? "请在左侧列表加入或选择一个你的学习小组，以启动共享群聊及伙伴匹配。" : lang === "es" ? "Elige un grupo de la lista para ingresar al chat grupal y buscar compañeros." : "Join or select one of your study groups from the left panel to access group chat logs and study partner pairing tools."}
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
                  {lang === "tr" ? "AI Destekli Eşleştirme Analizi" : lang === "zh" ? "AI 智能匹配分析" : lang === "es" ? "Análisis de Parejas de IA" : "AI study-partner Matchmaker Analysis"}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed max-w-lg">
                  {lang === "tr"
                    ? "Yapay zeka, öğrenme stilinizi ve çalışma hedeflerinizi analiz ederek size en uygun çalışma arkadaşlarını bulur."
                    : lang === "zh"
                    ? "AI 会自动分析您的学习偏好和目标，为您匹配最契合的自习伙伴。"
                    : lang === "es"
                    ? "La IA analiza tus estilos de aprendizaje y metas académicas para encontrar los compañeros ideales."
                    : "AI analyzes your learner types, goals, and enrolled subjects to find the most compatible study peers."}
                </p>
              </div>
              <button
                onClick={handleAIMatchmaking}
                disabled={loadingAI}
                className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {loadingAI ? (
                  <>
                    <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {lang === "tr" ? "Eşleştiriliyor..." : "Matching..."}
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    {lang === "tr" ? "AI Eşleştirmeyi Başlat" : "Run AI Matchmaker"}
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
                    {lang === "tr" ? "AI Çalışma Profilinizi Analiz Ediyor..." : "AI is Analyzing Your Academic Profile..."}
                  </h5>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-sm mx-auto">
                    {lang === "tr"
                      ? "Eşleşen dersler, günlük hedefler ve öğrenme stilleri hizalanıyor."
                      : "Comparing compatible study schedules, daily goals, and visual/auditory preferences."}
                  </p>
                </div>
              </div>
            )}

            {/* AI Recommended Study Group */}
            {aiRecommendedGroup && !loadingAI && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-4.5 rounded-2xl text-left space-y-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-extrabold uppercase tracking-wider">
                  💡 AI Group Suggestion
                </span>
                <h4 className="text-xs font-bold text-surface-dark">{aiRecommendedGroup.name}</h4>
                <p className="text-[10px] text-gray-500 italic">"{aiRecommendedGroup.reason}"</p>
              </div>
            )}

            {scheduledSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-bounce">
                <UserCheck size={16} />
                {lang === "zh" ? `已成功与 ${scheduledSuccess} 预约明天下午 3 点的共同学习！` : lang === "es" ? `¡Sesión agendada con ${scheduledSuccess} para mañana 3:00 PM!` : `Study Session scheduled with ${scheduledSuccess} for tomorrow at 3:00 PM!`}
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
                            <Calendar size={12} /> {lang === "tr" ? "Çalışma Planla" : "Schedule Session"}
                          </button>
                          <button
                            onClick={() => setActiveDirectChatPartner(partner)}
                            className="flex-1 py-2 bg-white border border-brand text-brand text-[10px] font-bold rounded-xl hover:bg-brand/5 transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-1 shadow-xs"
                          >
                            <MessageSquare size={12} /> {lang === "tr" ? "Mesaj Gönder" : "Direct Chat"}
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
                        {lang === "tr" ? "Eşleşmeyi Onayla ve Bağlan" : "Approve Match Connection"}
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

      {/* Modal: Create Group Form */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-6 relative border border-gray-100 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-surface-dark flex items-center gap-2">
                  <Users className="text-brand" /> {lang === "zh" ? "创建新学习小组" : lang === "es" ? "Crear Nuevo Grupo" : "Create New Study Group"}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Start a collaborative room for exam preparation.</p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label htmlFor="gName" className="block text-xs font-bold text-gray-500 uppercase">{lang === "zh" ? "小组名称" : lang === "es" ? "Nombre de Grupo" : "Group Name"}</label>
                <input
                  id="gName"
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. AP Calculus Study circle"
                  className="block w-full mt-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                />
              </div>

              <div>
                <label htmlFor="gDesc" className="block text-xs font-bold text-gray-500 uppercase">{lang === "zh" ? "小组描述" : lang === "es" ? "Descripción" : "Description"}</label>
                <textarea
                  id="gDesc"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What is this group focusing on?"
                  className="block w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all h-20 resize-none"
                />
              </div>

              <div>
                <label htmlFor="gCourse" className="block text-xs font-bold text-gray-500 uppercase">{lang === "zh" ? "绑定科目" : lang === "es" ? "Categoría de Materia" : "Associated Subject"}</label>
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
                  {lang === "zh" ? "创建小组" : lang === "es" ? "Crear Grupo" : "Create Group"}
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
              <h4 className="text-sm font-bold text-surface-dark">{lang === "zh" ? "系统提示" : lang === "es" ? "Aviso" : "Notification"}</h4>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{customAlert}</p>
            </div>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2.5 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer"
            >
              {lang === "zh" ? "好的" : lang === "es" ? "Entendido" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
