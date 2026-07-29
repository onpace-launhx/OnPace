import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";
import { languageName, localized, normalizeLanguage } from "@/lib/i18n";

type MatchCandidate = {
  id: string;
  full_name: string | null;
  learning_styles: string[] | null;
  gender: string | null;
  preferred_gender: string | null;
  daily_study_goal_minutes: number | null;
  match_timezone: string | null;
  match_availability: unknown;
  match_goals: string | null;
  match_subjects: string[] | null;
  match_profile_completed?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readMatchingProfile(profile: Record<string, unknown>) {
  const settings = asRecord(profile.customization_settings);
  const fallback = asRecord(settings.study_partner_profile);
  const value = (key: string) => profile[key] ?? fallback[key];

  return {
    settings,
    fallback,
    gender:
      typeof value("gender") === "string"
        ? String(value("gender"))
        : "prefer_not_to_say",
    preferredGender:
      typeof value("preferred_gender") === "string"
        ? String(value("preferred_gender"))
        : "any",
    learningStyles: asStringArray(value("learning_styles")),
    subjects: asStringArray(value("match_subjects")),
    goals:
      typeof value("match_goals") === "string"
        ? String(value("match_goals"))
        : "",
    timezone:
      typeof value("match_timezone") === "string"
        ? String(value("match_timezone"))
        : "UTC",
    availability: value("match_availability") ?? {},
    completed: value("match_profile_completed") === true,
    matchesUsed: Math.max(
      0,
      Number(value("matches_used_this_month")) || 0
    ),
  };
}

function normalizeCandidate(profile: Record<string, unknown>): MatchCandidate {
  const matching = readMatchingProfile(profile);
  return {
    id: String(profile.id || ""),
    full_name:
      typeof profile.full_name === "string" ? profile.full_name : null,
    learning_styles: matching.learningStyles,
    gender: matching.gender,
    preferred_gender: matching.preferredGender,
    daily_study_goal_minutes:
      typeof profile.daily_study_goal_minutes === "number"
        ? profile.daily_study_goal_minutes
        : null,
    match_timezone: matching.timezone,
    match_availability: matching.availability,
    match_goals: matching.goals,
    match_subjects: matching.subjects,
    match_profile_completed: matching.completed,
  };
}

function isUnavailableMatchingSchema(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST202" ||
    error.code === "PGRST204" ||
    /schema cache|could not find.+function|could not find.+column|does not exist/i.test(
      error.message || ""
    )
  );
}

function matcherCopy(language: string) {
  return localized(language, {
    en: {
      completeProfile: "Complete your Study Partner Profile before running the matchmaker.",
      limit: "You have reached this month's study-partner matching limit.",
      noPeers: "No other students have completed a matching profile yet. Invite a friend or try again later.",
      noCompatible: "No students currently match your partner preferences and subjects.",
      invalid: "The AI matching result could not be validated. Please try again.",
      failed: "Study-partner matching failed. Please try again.",
      anonymous: "Anonymous peer",
      student: "OnPace student",
      hiddenBio: "Approve the connection to reveal this student's name.",
      learningStyle: "Learning style",
      generalGroup: "General Study Circle",
    },
    tr: {
      completeProfile: "Eşleştiriciyi çalıştırmadan önce Çalışma Partneri Profilini tamamla.",
      limit: "Bu ayki çalışma partneri eşleştirme sınırına ulaştın.",
      noPeers: "Henüz eşleştirme profilini tamamlayan başka öğrenci yok. Bir arkadaşını davet et veya daha sonra tekrar dene.",
      noCompatible: "Şu anda partner tercihlerin ve derslerinle uyumlu öğrenci bulunamadı.",
      invalid: "AI eşleştirme sonucu doğrulanamadı. Lütfen tekrar dene.",
      failed: "Çalışma partneri eşleştirmesi başarısız oldu. Lütfen tekrar dene.",
      anonymous: "Anonim öğrenci",
      student: "OnPace öğrencisi",
      hiddenBio: "Öğrencinin adını görmek için bağlantıyı onayla.",
      learningStyle: "Öğrenme stili",
      generalGroup: "Genel Çalışma Grubu",
    },
    es: {
      completeProfile: "Completa tu Perfil de Compañero de Estudio antes de ejecutar el buscador.",
      limit: "Has alcanzado el límite mensual de emparejamientos.",
      noPeers: "Aún no hay otros estudiantes con un perfil completo. Invita a un amigo o inténtalo más tarde.",
      noCompatible: "No hay estudiantes compatibles con tus preferencias y materias.",
      invalid: "No se pudo validar el resultado de IA. Inténtalo de nuevo.",
      failed: "Falló el emparejamiento de compañeros. Inténtalo de nuevo.",
      anonymous: "Compañero anónimo",
      student: "Estudiante de OnPace",
      hiddenBio: "Aprueba la conexión para revelar el nombre del estudiante.",
      learningStyle: "Estilo de aprendizaje",
      generalGroup: "Círculo de Estudio General",
    },
    zh: {
      completeProfile: "运行匹配器前，请先完成学习伙伴资料。",
      limit: "你已达到本月的学习伙伴匹配次数上限。",
      noPeers: "目前还没有其他学生完成匹配资料，请邀请朋友或稍后重试。",
      noCompatible: "暂时没有符合你的伙伴偏好与科目的学生。",
      invalid: "无法验证 AI 匹配结果，请重试。",
      failed: "学习伙伴匹配失败，请重试。",
      anonymous: "匿名同学",
      student: "OnPace 学生",
      hiddenBio: "批准连接后即可查看学生姓名。",
      learningStyle: "学习方式",
      generalGroup: "综合学习小组",
    },
  });
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all matches involving the user
    const { data: matches, error } = await supabase
      .from("peer_matches")
      .select(`
        *,
        user_one:profiles!peer_matches_user_one_id_fkey(id, full_name, learning_styles, customization_settings),
        user_two:profiles!peer_matches_user_two_id_fkey(id, full_name, learning_styles, customization_settings)
      `)
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const normalizedMatches = (matches || []).map((match) => {
      const userOne = asRecord(match.user_one);
      const userTwo = asRecord(match.user_two);
      return {
        ...match,
        user_one: {
          ...userOne,
          gender: readMatchingProfile(userOne).gender,
        },
        user_two: {
          ...userTwo,
          gender: readMatchingProfile(userTwo).gender,
        },
      };
    });

    return NextResponse.json(normalizedMatches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch current user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const lang = normalizeLanguage(profile.language);
    const copy = matcherCopy(lang);
    const matchingProfile = readMatchingProfile(profile);

    if (!matchingProfile.completed) {
      return NextResponse.json(
        { error: copy.completeProfile, code: "MATCH_PROFILE_REQUIRED" },
        { status: 422 }
      );
    }

    // 3. Plan limit enforcement
    const plan = profile.plan || "free";
    const matchesUsed = matchingProfile.matchesUsed;
    let maxMatches = 0; // free plan: 0
    if (plan === "plus") maxMatches = 1;
    if (plan === "pro") maxMatches = 3;
    const trialActive =
      profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
    if (trialActive) maxMatches = 3;
    if (plan === "founding" || profile.role === "admin" || profile.role === "super_admin") {
      maxMatches = 999; // unlimited matches for admins/founding
    }

    if (matchesUsed >= maxMatches) {
      return NextResponse.json(
        { error: copy.limit, code: "MATCH_LIMIT_REACHED" },
        { status: 429 }
      );
    }

    // 4. Fetch only the safe fields exposed by the matching RPC.
    let { data: allPeers, error: peersError } = await supabase
      .rpc("get_match_candidates");

    if (peersError && isUnavailableMatchingSchema(peersError)) {
      const fallbackResult = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .eq("has_onboarded", true);
      peersError = fallbackResult.error;
      allPeers = (fallbackResult.data || [])
        .map((peer) => normalizeCandidate(peer))
        .filter((peer) => peer.id && peer.match_profile_completed);
    }

    if (peersError) {
      return NextResponse.json(
        { error: copy.failed, details: peersError.message },
        { status: 500 }
      );
    }

    if (!allPeers || allPeers.length === 0) {
      return NextResponse.json(
        {
          matches: [],
          recommended_group: { name: copy.generalGroup, reason: copy.noPeers }
        }
      );
    }

    // 5. Filter by Gender preferences
    // Match compatibility logic:
    // - User A preferred gender matches User B gender
    // - User B preferred gender matches User A gender
    const userGender = matchingProfile.gender || "other";
    const userPref = matchingProfile.preferredGender || "any";

    const currentSubjects = matchingProfile.subjects;
    const filteredPeers = (allPeers as MatchCandidate[]).filter(peer => {
      const peerGender = peer.gender || "other";
      const peerPref = peer.preferred_gender || "any";

      // Check User A (current user) preference compatibility
      if (userPref !== "any" && userPref !== peerGender) return false;

      // Check User B (candidate peer) preference compatibility
      if (peerPref !== "any" && peerPref !== userGender) return false;

      const peerSubjects = Array.isArray(peer.match_subjects)
        ? peer.match_subjects
        : [];
      return (
        currentSubjects.length === 0 ||
        peerSubjects.length === 0 ||
        currentSubjects.some((subject: string) => peerSubjects.includes(subject))
      );
    });

    if (filteredPeers.length === 0) {
      return NextResponse.json(
        {
          matches: [],
          recommended_group: { name: copy.generalGroup, reason: copy.noCompatible }
        }
      );
    }

    // Get user's course list
    const { data: userCourses } = await supabase
      .from("courses")
      .select("name")
      .eq("user_id", user.id);

    const coursesList = userCourses?.map(c => c.name) || ["General Study"];
    const learningStyles =
      matchingProfile.learningStyles.length > 0
        ? matchingProfile.learningStyles
        : ["visual"];
    const responseLanguage = languageName(lang);

    // 6. Call AI Model to find best matches among filtered candidates
    const prompt = `You are the OnPace Study Matchmaker AI. Your job is to match the current student with the best study partners and recommended study groups.

Current Student Profile:
- ID: ${profile.id}
- Learning Styles: ${JSON.stringify(learningStyles)}
- Courses Studying: ${JSON.stringify(coursesList)}
- Preferred Match Subjects: ${JSON.stringify(matchingProfile.subjects)}
- Study Goals: ${matchingProfile.goals || "Not supplied"}
- Time Zone: ${matchingProfile.timezone}
- Weekly Availability: ${JSON.stringify(matchingProfile.availability)}
- Daily Target Goal: ${profile.daily_study_goal_minutes || 60} mins/day

Candidate Peers (Filtered by gender criteria):
${JSON.stringify(filteredPeers)}

Analyze subject overlap, learning-style compatibility, goals, time zone, and availability. Select up to 3 candidates only from the supplied list. Provide all human-readable text in ${responseLanguage}.

Return ONLY a raw valid JSON object with the following structure:
{
  "matches": [
    {
      "peer_id": "Matched Peer ID",
      "match": 95, 
      "styleTag": "Matched Learning Style (e.g. Visual & Auditory)",
      "matchReason": "Personalized reason why you matched them in ${lang}",
      "suggested_task": "Actionable task to do together"
    }
  ],
  "recommended_group": {
    "name": "General Study Circle",
    "reason": "Matching reason for study group in ${lang}"
  }
}
Do not output markdown code fences, do not output any surrounding text. Return raw JSON text only.`;

    const aiOutput = await generateAIText(supabase, {
      prompt,
      temperature: 0.3,
      json: true,
    });

    try {
      const parsed = parseAIJson<{
        matches: any[];
        recommended_group: { name: string; reason: string };
      }>(aiOutput);
      if (!Array.isArray(parsed.matches)) {
        throw new Error("Invalid match schema");
      }
      const candidateIds = new Set(filteredPeers.map((peer) => peer.id));
      const validatedMatches = parsed.matches
        .filter(
          (match: any) =>
            match &&
            typeof match.peer_id === "string" &&
            candidateIds.has(match.peer_id)
        )
        .slice(0, 3)
        .map((match: any) => ({
          ...match,
          match: Math.min(100, Math.max(0, Number(match.match) || 0)),
          styleTag: String(match.styleTag || "").slice(0, 120),
          matchReason: String(match.matchReason || "").slice(0, 500),
          suggested_task: String(match.suggested_task || "").slice(0, 300),
        }));

      // Fetch approved matches for this user to reveal names on double opt-in
      const { data: approvedMatches } = await supabase
        .from("peer_matches")
        .select("user_one_id, user_two_id")
        .eq("status", "approved")
        .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`);

      const approvedPeerIds = approvedMatches?.map(m => m.user_one_id === user.id ? m.user_two_id : m.user_one_id) || [];

      // Fetch user's own pending approvals
      const { data: myMatches } = await supabase
        .from("peer_matches")
        .select("*")
        .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`);

      // Mask identity details (Name & Avatar hidden until double opt-in!)
      const maskedMatches = validatedMatches.map((m: any) => {
        const peer = filteredPeers.find(p => p.id === m.peer_id);
        const isApproved = approvedPeerIds.includes(m.peer_id);
        
        // Find existing match record status
        const matchRecord = myMatches?.find(r => r.user_one_id === m.peer_id || r.user_two_id === m.peer_id);
        const myApproval = matchRecord ? (matchRecord.user_one_id === user.id ? matchRecord.user_one_approved : matchRecord.user_two_approved) : false;
        const peerApproval = matchRecord ? (matchRecord.user_one_id === m.peer_id ? matchRecord.user_one_approved : matchRecord.user_two_approved) : false;

        return {
          peer_id: m.peer_id,
          name: isApproved ? (peer?.full_name || copy.student) : copy.anonymous,
          avatar: isApproved ? (peer?.full_name?.charAt(0) || "S") : "AP",
          grade: copy.student,
          bio: isApproved
            ? `${copy.learningStyle}: ${peer?.learning_styles?.join(", ") || "—"}`
            : copy.hiddenBio,
          match: m.match,
          styleTag: m.styleTag,
          matchReason: m.matchReason,
          suggested_task: m.suggested_task,
          isApproved,
          myApproval,
          peerApproval
        };
      });

      // Increment matches used counter
      const counterResult = await supabase
        .from("profiles")
        .update({ matches_used_this_month: matchesUsed + 1 })
        .eq("id", user.id);
      if (
        counterResult.error &&
        isUnavailableMatchingSchema(counterResult.error)
      ) {
        await supabase
          .from("profiles")
          .update({
            customization_settings: {
              ...matchingProfile.settings,
              study_partner_profile: {
                ...matchingProfile.fallback,
                matches_used_this_month: matchesUsed + 1,
              },
            },
          })
          .eq("id", user.id);
      }

      return NextResponse.json({
        matches: maskedMatches,
        recommended_group: parsed.recommended_group
      });

    } catch (err: any) {
      console.error("AI Matcher JSON Exception:", err, "Raw output:", aiOutput);
      return NextResponse.json({ error: copy.invalid }, { status: 500 });
    }

  } catch (error: any) {
    console.error("AI Matcher Server Exception:", error);
    return NextResponse.json(
      { error: error.message || "AI matching failed." },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { peer_id, approve } = await request.json();

    if (!peer_id) {
      return NextResponse.json({ error: "Missing peer_id." }, { status: 400 });
    }

    // Find if a match record already exists between user and peer
    const { data: existing } = await supabase
      .from("peer_matches")
      .select("*")
      .or(`and(user_one_id.eq.${user.id},user_two_id.eq.${peer_id}),and(user_one_id.eq.${peer_id},user_two_id.eq.${user.id})`)
      .maybeSingle();

    let updatedRecord;
    if (existing) {
      const isUserOne = existing.user_one_id === user.id;
      const updates: any = {};
      if (isUserOne) {
        updates.user_one_approved = approve;
      } else {
        updates.user_two_approved = approve;
      }

      // Check if both approved
      const bothApproved = (isUserOne ? approve : existing.user_one_approved) && (isUserOne ? existing.user_two_approved : approve);
      updates.status = bothApproved ? "approved" : "pending";

      const { data, error } = await supabase
        .from("peer_matches")
        .update(updates)
        .eq("id", existing.id)
        .select("*")
        .single();
      
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      updatedRecord = data;
    } else {
      // Create new match request
      const { data, error } = await supabase
        .from("peer_matches")
        .insert({
          user_one_id: user.id,
          user_two_id: peer_id,
          user_one_approved: approve,
          user_two_approved: false,
          status: "pending"
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      updatedRecord = data;
    }

    return NextResponse.json({ success: true, match: updatedRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
