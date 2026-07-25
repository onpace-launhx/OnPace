import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";

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
        user_one:profiles!peer_matches_user_one_id_fkey(id, full_name, learning_styles, gender),
        user_two:profiles!peer_matches_user_two_id_fkey(id, full_name, learning_styles, gender)
      `)
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(matches || []);
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

    // 3. Plan limit enforcement
    const plan = profile.plan || "free";
    const matchesUsed = profile.matches_used_this_month || 0;
    let maxMatches = 0; // free plan: 0
    if (plan === "plus") maxMatches = 1;
    if (plan === "pro") maxMatches = 3;
    if (plan === "founding" || profile.role === "admin" || profile.role === "super_admin") {
      maxMatches = 999; // unlimited matches for admins/founding
    }

    if (matchesUsed >= maxMatches) {
      return NextResponse.json(
        { error: `Aylık eşleştirme kullanım sınırınıza ulaştınız! Plan: ${plan.toUpperCase()} (Max: ${maxMatches} eşleştirme/ay). Yeni bir promocode girerek veya planınızı güncelleyerek eşleştiriciyi kullanabilirsiniz.` },
        { status: 400 }
      );
    }

    // 4. Fetch all other real users in the system (Real-user focused!)
    const { data: allPeers, error: peersError } = await supabase
      .from("profiles")
      .select("id, full_name, learning_styles, gender, preferred_gender, daily_study_goal_minutes, has_onboarded")
      .neq("id", user.id)
      .eq("has_onboarded", true);

    if (peersError) {
      return NextResponse.json({ error: peersError.message }, { status: 400 });
    }

    if (!allPeers || allPeers.length === 0) {
      return NextResponse.json(
        { 
          matches: [], 
          recommended_group: { name: "General Study Circle", reason: "No other active students registered in the system yet. Invite your friends to start matching!" }
        }
      );
    }

    // 5. Filter by Gender preferences
    // Match compatibility logic:
    // - User A preferred gender matches User B gender
    // - User B preferred gender matches User A gender
    const userGender = profile.gender || "other";
    const userPref = profile.preferred_gender || "any";

    const filteredPeers = allPeers.filter(peer => {
      const peerGender = peer.gender || "other";
      const peerPref = peer.preferred_gender || "any";

      // Check User A (current user) preference compatibility
      if (userPref !== "any" && userPref !== peerGender) return false;

      // Check User B (candidate peer) preference compatibility
      if (peerPref !== "any" && peerPref !== userGender) return false;

      return true;
    });

    if (filteredPeers.length === 0) {
      return NextResponse.json(
        { 
          matches: [], 
          recommended_group: { name: "General Study Circle", reason: "No registered students match your gender compatibility settings." }
        }
      );
    }

    // Get user's course list
    const { data: userCourses } = await supabase
      .from("courses")
      .select("name")
      .eq("user_id", user.id);

    const coursesList = userCourses?.map(c => c.name) || ["General Study"];
    const learningStyles = profile.learning_styles || ["visual"];
    const lang = profile.language || "en";

    // 6. Call AI Model to find best matches among filtered candidates
    const prompt = `You are the OnPace Study Matchmaker AI. Your job is to match the current student with the best study partners and recommended study groups.

Current Student Profile:
- ID: ${profile.id}
- Learning Styles: ${JSON.stringify(learningStyles)}
- Courses Studying: ${JSON.stringify(coursesList)}
- Daily Target Goal: ${profile.daily_study_goal_minutes || 60} mins/day

Candidate Peers (Filtered by gender criteria):
${JSON.stringify(filteredPeers)}

Analyze and select the top matched study partners (up to 3) from the Candidate list. Provide a match percentage (0-100), styleTag description, matchReason (in language: ${lang}), and a suggested shared study task.

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
      const maskedMatches = parsed.matches.map((m: any) => {
        const peer = filteredPeers.find(p => p.id === m.peer_id);
        const isApproved = approvedPeerIds.includes(m.peer_id);
        
        // Find existing match record status
        const matchRecord = myMatches?.find(r => r.user_one_id === m.peer_id || r.user_two_id === m.peer_id);
        const myApproval = matchRecord ? (matchRecord.user_one_id === user.id ? matchRecord.user_one_approved : matchRecord.user_two_approved) : false;
        const peerApproval = matchRecord ? (matchRecord.user_one_id === m.peer_id ? matchRecord.user_one_approved : matchRecord.user_two_approved) : false;

        return {
          peer_id: m.peer_id,
          name: isApproved ? (peer?.full_name || "Study Peer") : "Anonymous Peer",
          avatar: isApproved ? (peer?.full_name?.charAt(0) || "S") : "AP",
          grade: isApproved ? "OnPace Student" : "Study Peer",
          bio: isApproved ? `Learning style: ${peer?.learning_styles?.join(", ")}` : "Click approve to request connection and reveal name.",
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
      await supabase
        .from("profiles")
        .update({ matches_used_this_month: matchesUsed + 1 })
        .eq("id", user.id);

      return NextResponse.json({
        matches: maskedMatches,
        recommended_group: parsed.recommended_group
      });

    } catch (err: any) {
      console.error("AI Matcher JSON Exception:", err, "Raw output:", aiOutput);
      return NextResponse.json({ error: "AI matching output invalid." }, { status: 500 });
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
