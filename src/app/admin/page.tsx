"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  User,
  Shield,
  CreditCard,
  Loader2,
  Sparkles,
  CheckCircle2,
  UserCog,
  Key,
  Save,
  Clock,
  Unlock,
  AlertTriangle,
  Terminal,
  RefreshCw,
  PlusCircle,
  Tag,
  Trash2,
  Settings,
  CheckSquare,
  Square,
  Edit,
  Eye
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUserProfile, setCurrentUserProfile] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("users");
  
  // Database datasets
  const [profiles, setProfiles] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [promocodes, setPromocodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Moderation & Social feed states
  const [moderationPosts, setModerationPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Announcements & Feedbacks states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annResponses, setAnnResponses] = useState<any[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");
  const [newAnnType, setNewAnnType] = useState<"announcement" | "feedback">("announcement");
  const [newAnnDisplayType, setNewAnnDisplayType] = useState<"pin" | "popup">("pin");
  const [newAnnQuestionText, setNewAnnQuestionText] = useState("");
  const [newAnnQuestions, setNewAnnQuestions] = useState<any[]>([]);
  const [creatingAnn, setCreatingAnn] = useState(false);
  const [newAnnTargetAudience, setNewAnnTargetAudience] = useState("all");
  const [newAnnTargetFilter, setNewAnnTargetFilter] = useState("");
  // Edit announcement states
  const [editingAnn, setEditingAnn] = useState<any | null>(null);
  const [editAnnTitle, setEditAnnTitle] = useState("");
  const [editAnnContent, setEditAnnContent] = useState("");
  const [editAnnType, setEditAnnType] = useState<"announcement" | "feedback">("announcement");
  const [editAnnDisplayType, setEditAnnDisplayType] = useState<"pin" | "popup">("pin");
  const [editAnnTargetAudience, setEditAnnTargetAudience] = useState("all");
  const [editAnnTargetFilter, setEditAnnTargetFilter] = useState("");
  const [savingAnn, setSavingAnn] = useState(false);
  // Detail view state
  const [detailAnn, setDetailAnn] = useState<any | null>(null);

  // AI Config States
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [hasGemini, setHasGemini] = useState(false);
  const [hasOpenai, setHasOpenai] = useState(false);
  const [activeProvider, setActiveProvider] = useState("gemini");
  const [savingKey, setSavingKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // R2 Config States
  const [r2AccessKey, setR2AccessKey] = useState("");
  const [r2SecretKey, setR2SecretKey] = useState("");
  const [r2Endpoint, setR2Endpoint] = useState("");
  const [r2BucketName, setR2BucketName] = useState("");
  const [r2PublicUrl, setR2PublicUrl] = useState("");
  const [hasR2AccessKey, setHasR2AccessKey] = useState(false);
  const [hasR2SecretKey, setHasR2SecretKey] = useState(false);
  const [savingR2, setSavingR2] = useState(false);
  const [saveR2Success, setSaveR2Success] = useState(false);

  // Promocode Creation States
  const [newPromoCode, setNewPromoCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "free_trial" | "lifetime">("percentage");
  const [discountValue, setDiscountValue] = useState(20);
  const [maxUses, setMaxUses] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState(false);

  // Adjust Plan Modal States
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [trialDuration, setTrialDuration] = useState("7"); // "7", "30", "lifetime", "free", "custom"
  const [customTrialDays, setCustomTrialDays] = useState("14");
  const [adjustGraceDays, setAdjustGraceDays] = useState(0);
  const [adjustFailedAttempts, setAdjustFailedAttempts] = useState(0);
  const [adjustNextBilling, setAdjustNextBilling] = useState("");

  // Viewing User Billing Details States
  const [viewingBillingDetails, setViewingBillingDetails] = useState<any | null>(null);
  const [userPurchaseHistory, setUserPurchaseHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Global Billing Settings States
  const [maxFailedAttempts, setMaxFailedAttempts] = useState(3);
  const [globalGraceDays, setGlobalGraceDays] = useState(3);
  const [savingBillingRules, setSavingBillingRules] = useState(false);
  const [saveBillingRulesSuccess, setSaveBillingRulesSuccess] = useState(false);

  // Edit Roles & Permissions Modal States
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingUserRole, setEditingUserRole] = useState("student");
  const [editingUserPermissions, setEditingUserPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Edit Student Profile Modal States
  const [profileEditUser, setProfileEditUser] = useState<any | null>(null);
  const [profileEditName, setProfileEditName] = useState("");
  const [profileEditGrade, setProfileEditGrade] = useState("");
  const [profileEditEmail, setProfileEditEmail] = useState("");
  const [profileEditDiscount, setProfileEditDiscount] = useState(0);
  const [savingStudentProfile, setSavingStudentProfile] = useState(false);

  // Edit Promo Code Modal States
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [editingPromoCode, setEditingPromoCode] = useState("");
  const [editingPromoDiscountType, setEditingPromoDiscountType] = useState<"percentage" | "free_trial" | "lifetime">("percentage");
  const [editingPromoDiscountValue, setEditingPromoDiscountValue] = useState(0);
  const [editingPromoMaxUses, setEditingPromoMaxUses] = useState("");
  const [editingPromoStartDate, setEditingPromoStartDate] = useState("");
  const [editingPromoEndDate, setEditingPromoEndDate] = useState("");
  const [savingPromo, setSavingPromo] = useState(false);

  useEffect(() => {
    async function loadAdminData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Admin Page check error:", profileError);
        alert("Failed to load profile in Admin check: " + (profileError.message || JSON.stringify(profileError)));
        router.push("/dashboard");
        return;
      }

      if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
        console.warn("Unauthorized access attempt. Role:", profile?.role);
        alert("Unauthorized: Your role is '" + (profile?.role || "none") + "' which is not admin or super_admin.");
        router.push("/dashboard");
        return;
      }

      setCurrentUserProfile(profile);

      // Determine initial tab based on permissions
      const isSuperAdmin = profile.role === "super_admin";
      const perms = profile.permissions || [];
      if (isSuperAdmin || perms.includes("manage_users")) {
        setActiveTab("users");
      } else if (perms.includes("manage_promocodes")) {
        setActiveTab("promocodes");
      } else if (perms.includes("manage_settings")) {
        setActiveTab("config");
      } else if (perms.includes("view_logs")) {
        setActiveTab("logs");
      }

      // Fetch all required data based on roles/perms
      fetchProfiles();
      fetchSettings();
      fetchLogs();
      fetchPromocodes();
      fetchModerationPosts();
      fetchAnnouncementsData();
      
      setLoading(false);
    }
    loadAdminData();
  }, [router, supabase]);

  async function fetchModerationPosts() {
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setModerationPosts(data);
    }
    setLoadingPosts(false);
  }

  async function fetchAnnouncementsData() {
    const { data: annData, error: annErr } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (!annErr && annData) {
      setAnnouncements(annData);
    }

    const { data: respData, error: respErr } = await supabase
      .from("announcement_responses")
      .select("*, profiles(full_name), announcements(title)")
      .order("created_at", { ascending: false });
    if (!respErr && respData) {
      setAnnResponses(respData);
    }
  }

  async function fetchProfiles() {
    const { data, error } = await supabase
      .rpc("get_profiles_with_emails");
    
    if (!error && data) {
      setProfiles(data);
    } else {
      console.warn("RPC get_profiles_with_emails failed, falling back to profiles table select:", error);
      // Alert the exact error to the user so they can diagnose database function setup
      if (error && error.message) {
        alert("Email retrieval warning: " + error.message + " (Running profiles table fallback without emails)");
      }
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      
      if (!fallbackError && fallbackData) {
        setProfiles(fallbackData);
      }
    }
  }

  async function fetchSettings() {
    const { data: aiData, error: aiError } = await supabase.rpc("get_system_ai_settings");
    if (!aiError && aiData) {
      const settings = Array.isArray(aiData) ? aiData[0] : aiData;
      setHasGemini(settings?.has_gemini || false);
      setHasOpenai(settings?.has_openai || false);
      setActiveProvider(settings?.active_provider || "gemini");
    }

    const { data: r2Data, error: r2Error } = await supabase.rpc("get_system_r2_settings");
    if (!r2Error && r2Data) {
      const settings = Array.isArray(r2Data) ? r2Data[0] : r2Data;
      setHasR2AccessKey(settings?.has_access_key || false);
      setHasR2SecretKey(settings?.has_secret_key || false);
      setR2Endpoint(settings?.endpoint || "");
      setR2BucketName(settings?.bucket_name || "");
      setR2PublicUrl(settings?.public_url || "");
    }

    // Fetch global billing settings directly from public.system_settings
    const { data: billingData } = await supabase
      .from("system_settings")
      .select("max_failed_payment_attempts, global_grace_days")
      .eq("id", 1)
      .single();
    if (billingData) {
      setMaxFailedAttempts(billingData.max_failed_payment_attempts ?? 3);
      setGlobalGraceDays(billingData.global_grace_days ?? 3);
    }
  }

  async function fetchLogs() {
    const { data, error } = await supabase
      .from("system_logs")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (!error && data) {
      setLogs(data);
    }
  }

  async function fetchPromocodes() {
    const { data, error } = await supabase
      .from("promocodes")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPromocodes(data);
    }
  }

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setSaveSuccess(false);

    const { error } = await supabase.rpc("set_system_ai_settings", {
      gemini_val: geminiKey.trim() || null,
      openai_val: openaiKey.trim() || null,
      provider_val: activeProvider
    });

    if (!error) {
      setSaveSuccess(true);
      setGeminiKey("");
      setOpenaiKey("");
      fetchSettings();
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      console.error("Failed to save AI settings:", error);
    }
    setSavingKey(false);
  };

  const handleSaveR2Settings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingR2(true);
    setSaveR2Success(false);

    const { error } = await supabase.rpc("set_system_r2_settings", {
      access_key_val: r2AccessKey.trim() || null,
      secret_key_val: r2SecretKey.trim() || null,
      endpoint_val: r2Endpoint.trim() || null,
      bucket_val: r2BucketName.trim() || null,
      public_url_val: r2PublicUrl.trim() || null
    });

    if (!error) {
      setSaveR2Success(true);
      setR2AccessKey("");
      setR2SecretKey("");
      fetchSettings();
      setTimeout(() => setSaveR2Success(false), 3000);
    } else {
      console.error("Failed to save R2 settings:", error);
      alert(error.message || "Failed to save R2 settings.");
    }
    setSavingR2(false);
  };

  // Open Adjust Access Modal
  const handleOpenAdjustAccess = (user: any) => {
    setSelectedUser(user);
    setTrialDuration(user.plan === "free" ? "free" : (user.trial_ends_at ? "custom" : "lifetime"));
    setCustomTrialDays("14");
    setAdjustGraceDays(user.grace_days_granted || 0);
    setAdjustFailedAttempts(user.failed_payment_attempts || 0);
    setAdjustNextBilling(user.next_billing_date ? new Date(user.next_billing_date).toISOString().slice(0, 16) : "");
  };

  const handleUpdatePlan = async () => {
    if (!selectedUser) return;
    setUpdatingId(selectedUser.id);

    let nextPlan = "free";
    let expiresAt: string | null = null;

    if (trialDuration !== "free") {
      nextPlan = "pro";
      if (trialDuration === "7") {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (trialDuration === "30") {
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (trialDuration === "custom") {
        const days = Number(customTrialDays) || 14;
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      } else {
        expiresAt = null; // Lifetime
      }
    }

    const targetNextBilling = adjustNextBilling.trim() ? new Date(adjustNextBilling).toISOString() : null;

    // Call dynamic self-contained plan update RPC v2
    const { error } = await supabase.rpc("update_student_plan_admin_v2", {
      target_user_id: selectedUser.id,
      target_plan: nextPlan,
      target_expires_at: expiresAt,
      target_grace_days: Number(adjustGraceDays),
      target_failed_attempts: Number(adjustFailedAttempts),
      target_next_billing: targetNextBilling
    });

    if (!error) {
      setProfiles(profiles.map(p => 
        p.id === selectedUser.id 
          ? { 
              ...p, 
              plan: nextPlan, 
              trial_ends_at: expiresAt,
              grace_days_granted: Number(adjustGraceDays),
              failed_payment_attempts: Number(adjustFailedAttempts),
              next_billing_date: targetNextBilling
            } 
          : p
      ));
    } else {
      alert("Failed to update plan: " + error.message);
    }

    setUpdatingId(null);
    setSelectedUser(null);
  };

  // Open Billing Details & Transaction History Modal
  const handleOpenBillingDetails = async (user: any) => {
    setViewingBillingDetails(user);
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("purchase_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setUserPurchaseHistory(data);
    } else {
      setUserPurchaseHistory([]);
    }
    setLoadingHistory(false);
  };

  // Save Global Billing Settings Handler
  const handleSaveBillingRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBillingRules(true);
    setSaveBillingRulesSuccess(false);

    const { error } = await supabase
      .from("system_settings")
      .update({
        max_failed_payment_attempts: Number(maxFailedAttempts),
        global_grace_days: Number(globalGraceDays)
      })
      .eq("id", 1);

    if (!error) {
      setSaveBillingRulesSuccess(true);
      setTimeout(() => setSaveBillingRulesSuccess(false), 3000);
    } else {
      alert("Failed to save billing rules: " + error.message);
    }
    setSavingBillingRules(false);
  };

  // Open Edit User Role/Perms Modal
  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setEditingUserRole(user.role || "student");
    setEditingUserPermissions(user.permissions || []);
    setEditingUser(user);
  };

  // Save User Role/Perms Modal Changes
  const handleSaveUserPermissions = async () => {
    if (!editingUser) return;
    setSavingPermissions(true);

    const targetPermissions = editingUserRole === "admin" ? editingUserPermissions : [];

    const { error } = await supabase
      .from("profiles")
      .update({
        role: editingUserRole,
        permissions: targetPermissions
      })
      .eq("id", editingUser.id);

    if (!error) {
      setProfiles(profiles.map(p => 
        p.id === editingUser.id 
          ? { ...p, role: editingUserRole, permissions: targetPermissions } 
          : p
      ));
      setEditingUser(null);
    } else {
      alert(error.message || "Failed to update user permissions.");
    }
    setSavingPermissions(false);
  };

  const togglePermissionCheckbox = (perm: string) => {
    if (editingUserPermissions.includes(perm)) {
      setEditingUserPermissions(editingUserPermissions.filter(p => p !== perm));
    } else {
      setEditingUserPermissions([...editingUserPermissions, perm]);
    }
  };

  // Create Promo Code Handler
  const handleCreatePromocode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim() || !startDate || !endDate) return;
    setCreatingPromo(true);
    setPromoSuccess(false);

    const payload = {
      code: newPromoCode.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      max_uses: maxUses.trim() ? Number(maxUses) : null,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString()
    };

    const { data, error } = await supabase
      .from("promocodes")
      .insert([payload])
      .select("*")
      .single();

    if (!error && data) {
      setPromoSuccess(true);
      setPromocodes([data, ...promocodes]);
      setNewPromoCode("");
      setMaxUses("");
      setTimeout(() => setPromoSuccess(false), 3000);
    } else {
      alert(error?.message || "Failed to create promo code.");
    }
    setCreatingPromo(false);
  };

  // Delete Promo Code Handler
  const handleDeletePromocode = async (id: string) => {
    const { error } = await supabase.from("promocodes").delete().eq("id", id);
    if (!error) {
      setPromocodes(promocodes.filter(p => p.id !== id));
    } else {
      alert("Failed to delete promo code: " + error.message);
    }
  };

  // Open Edit Student Profile Modal
  const handleOpenEditStudent = (user: any) => {
    setProfileEditUser(user);
    setProfileEditName(user.full_name || "");
    setProfileEditGrade(user.grade_level || "");
    setProfileEditEmail(user.email || "");
    setProfileEditDiscount(user.discount_percent || 0);
  };

  // Save Student Profile Changes
  const handleSaveStudentProfile = async () => {
    if (!profileEditUser) return;
    setSavingStudentProfile(true);

    const { error } = await supabase.rpc("update_user_profile_admin", {
      target_user_id: profileEditUser.id,
      new_name: profileEditName.trim(),
      new_grade: profileEditGrade.trim(),
      new_email: profileEditEmail.trim().toLowerCase(),
      new_discount: Number(profileEditDiscount)
    });

    if (!error) {
      setProfiles(profiles.map(p => 
        p.id === profileEditUser.id 
          ? { 
              ...p, 
              full_name: profileEditName.trim(), 
              grade_level: profileEditGrade.trim(), 
              email: profileEditEmail.trim().toLowerCase(),
              discount_percent: Number(profileEditDiscount)
            } 
          : p
      ));
      setProfileEditUser(null);
    } else {
      alert(error.message || "Failed to update student profile.");
    }
    setSavingStudentProfile(false);
  };

  // Delete Student Account Handler
  const handleDeleteStudent = async (userId: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete the account for ${name}? This action is irreversible and will delete all user data.`)) return;
    setUpdatingId(userId);

    const { error } = await supabase.rpc("delete_user_direct", {
      target_user_id: userId
    });

    if (!error) {
      setProfiles(profiles.filter(p => p.id !== userId));
    } else {
      alert(error.message || "Failed to delete student account.");
    }
    setUpdatingId(null);
  };

  // Open Edit Promo Code Modal
  const handleOpenEditPromo = (promo: any) => {
    setEditingPromo(promo);
    setEditingPromoCode(promo.code);
    setEditingPromoDiscountType(promo.discount_type);
    setEditingPromoDiscountValue(promo.discount_value);
    setEditingPromoMaxUses(promo.max_uses !== null ? String(promo.max_uses) : "");
    setEditingPromoStartDate(promo.start_date ? new Date(promo.start_date).toISOString().slice(0, 16) : "");
    setEditingPromoEndDate(promo.end_date ? new Date(promo.end_date).toISOString().slice(0, 16) : "");
  };

  // Save Promo Code Changes
  const handleSavePromoCode = async () => {
    if (!editingPromo) return;
    setSavingPromo(true);

    const payload = {
      code: editingPromoCode.trim().toUpperCase(),
      discount_type: editingPromoDiscountType,
      discount_value: Number(editingPromoDiscountValue),
      max_uses: editingPromoMaxUses.trim() ? Number(editingPromoMaxUses) : null,
      start_date: new Date(editingPromoStartDate).toISOString(),
      end_date: new Date(editingPromoEndDate).toISOString()
    };

    const { error } = await supabase
      .from("promocodes")
      .update(payload)
      .eq("id", editingPromo.id);

    if (!error) {
      setPromocodes(promocodes.map(p => 
        p.id === editingPromo.id 
          ? { ...p, ...payload } 
          : p
      ));
      setEditingPromo(null);
    } else {
      alert(error.message || "Failed to update promo code.");
    }
    setSavingPromo(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
          <p className="text-sm font-semibold text-gray-500">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  // Permission shortcut checks
  const isSuperAdmin = currentUserProfile?.role === "super_admin";
  const perms = currentUserProfile?.permissions || [];
  const canManageUsers = isSuperAdmin || perms.includes("manage_users");
  const canManagePromocodes = isSuperAdmin || perms.includes("manage_promocodes");
  const canManageSettings = isSuperAdmin || perms.includes("manage_settings");
  const canViewLogs = isSuperAdmin || perms.includes("view_logs");

  // Metrics
  const totalUsers = profiles.length;
  const handleDeletePost = async (postId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this social forum post?");
    if (!confirm) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (!error) {
      setModerationPosts(prev => prev.filter(p => p.id !== postId));
      alert("Post deleted successfully.");
    } else {
      alert("Failed to delete post: " + error.message);
    }
  };

  const handleTogglePostFlag = async (postId: string, currentFlag: boolean) => {
    const { error } = await supabase
      .from("posts")
      .update({ is_flagged: !currentFlag })
      .eq("id", postId);

    if (!error) {
      setModerationPosts(prev => prev.map(p => p.id === postId ? { ...p, is_flagged: !currentFlag } : p));
    } else {
      alert("Failed to update post status: " + error.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    setCreatingAnn(true);

    const targetFilter = newAnnTargetAudience !== "all" && newAnnTargetFilter.trim()
      ? { [newAnnTargetAudience]: newAnnTargetFilter.trim() }
      : {};

    const { error } = await supabase
      .from("announcements")
      .insert({
        title: newAnnTitle.trim(),
        content: newAnnContent.trim(),
        type: newAnnType,
        display_type: newAnnDisplayType,
        questions: newAnnQuestions.length > 0 ? newAnnQuestions : [],
        target_audience: newAnnTargetAudience,
        target_filter: targetFilter
      });

    if (!error) {
      setNewAnnTitle("");
      setNewAnnContent("");
      setNewAnnQuestions([]);
      setNewAnnTargetAudience("all");
      setNewAnnTargetFilter("");
      fetchAnnouncementsData();
    } else {
      alert("Failed to create announcement: " + error.message);
    }
    setCreatingAnn(false);
  };

  const handleAddQuestion = () => {
    if (!newAnnQuestionText.trim()) return;
    const newQ = {
      id: "q_" + Date.now(),
      question: newAnnQuestionText.trim(),
      type: "text"
    };
    setNewAnnQuestions(prev => [...prev, newQ]);
    setNewAnnQuestionText("");
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    const confirm = window.confirm("Are you sure you want to permanently delete this announcement?");
    if (!confirm) return;
    const { error } = await supabase.from("announcements").delete().eq("id", annId);
    if (!error) setAnnouncements(prev => prev.filter(a => a.id !== annId));
  };

  const handleToggleAnnActive = async (ann: any) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !ann.is_active })
      .eq("id", ann.id);
    if (!error) {
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, is_active: !ann.is_active } : a));
    } else {
      alert("Failed to update status: " + error.message);
    }
  };

  const handleOpenEditAnn = (ann: any) => {
    setEditingAnn(ann);
    setEditAnnTitle(ann.title);
    setEditAnnContent(ann.content);
    setEditAnnType(ann.type);
    setEditAnnDisplayType(ann.display_type);
    setEditAnnTargetAudience(ann.target_audience || "all");
    setEditAnnTargetFilter(ann.target_filter ? Object.values(ann.target_filter)[0] as string : "");
  };

  const handleSaveEditAnn = async () => {
    if (!editingAnn) return;
    setSavingAnn(true);
    const targetFilter = editAnnTargetAudience !== "all" && editAnnTargetFilter.trim()
      ? { [editAnnTargetAudience]: editAnnTargetFilter.trim() }
      : {};
    const { error } = await supabase
      .from("announcements")
      .update({
        title: editAnnTitle.trim(),
        content: editAnnContent.trim(),
        type: editAnnType,
        display_type: editAnnDisplayType,
        target_audience: editAnnTargetAudience,
        target_filter: targetFilter
      })
      .eq("id", editingAnn.id);
    if (!error) {
      setAnnouncements(prev => prev.map(a => a.id === editingAnn.id
        ? { ...a, title: editAnnTitle.trim(), content: editAnnContent.trim(), type: editAnnType, display_type: editAnnDisplayType, target_audience: editAnnTargetAudience, target_filter: targetFilter }
        : a
      ));
      setEditingAnn(null);
    } else {
      alert("Failed to save: " + error.message);
    }
    setSavingAnn(false);
  };

  const proUsers = profiles.filter(p => {
    const active = p.plan === "pro" && (p.pro_expires_at === null || new Date(p.pro_expires_at) > new Date());
    return active || p.plan === "founding";
  }).length;
  const adminUsers = profiles.filter(p => p.role === "admin" || p.role === "super_admin").length;
  const premiumRatio = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0;

  // Render Sub-Admin welcome screen if they have absolutely no permissions
  const hasAnyPermission = canManageUsers || canManagePromocodes || canManageSettings || canViewLogs;
  if (!isSuperAdmin && !hasAnyPermission) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6 text-center">
        <div className="bg-white border border-gray-150 p-8 rounded-3xl max-w-md w-full space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 text-yellow-600 flex items-center justify-center mx-auto border border-yellow-500/20">
            <Shield size={28} />
          </div>
          <h2 className="text-lg font-bold text-surface-dark">Permission Required</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            You are registered as a **Sub-Admin**. However, the Super Admin has not assigned any specific panel permissions to your profile yet.
          </p>
          <Link href="/dashboard" className="inline-block px-5 py-2.5 bg-brand text-white font-bold rounded-xl text-xs hover:bg-brand-hover transition-all active:scale-95 shadow-sm">
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-brand mb-2">
              <Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-bold hover:underline">
                <ArrowLeft size={14} /> Back to Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
              <UserCog className="text-brand" size={24} /> Administrator Panel
            </h1>
            <p className="text-xs text-gray-500 mt-1">Manage user profiles, promotional discount campaigns, and system parameters.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-brand/10 text-brand px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-brand/20">
              <Shield size={14} /> {isSuperAdmin ? "Super Admin Console" : "Sub-Admin Console"}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-6 overflow-x-auto pb-px">
          {(isSuperAdmin || perms.includes("manage_users")) && (
            <button
              onClick={() => setActiveTab("users")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "users" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              👥 Users & Stats
            </button>
          )}
          {(isSuperAdmin || perms.includes("manage_promocodes")) && (
            <button
              onClick={() => setActiveTab("promocodes")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "promocodes" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              🏷️ Promocodes
            </button>
          )}
          {(isSuperAdmin || perms.includes("manage_settings")) && (
            <button
              onClick={() => setActiveTab("config")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "config" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              ⚙️ System Config
            </button>
          )}
          {(isSuperAdmin || perms.includes("view_logs")) && (
            <button
              onClick={() => setActiveTab("logs")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "logs" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              📋 Audit Logs
            </button>
          )}
          {isSuperAdmin && (
            <>
              <button
                onClick={() => setActiveTab("moderation")}
                className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "moderation" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                🛡️ Social Moderation
              </button>
              <button
                onClick={() => setActiveTab("announcements")}
                className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "announcements" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                📢 Bulletins & Feedbacks
              </button>
            </>
          )}
        </div>

        {/* Stats Cards (Only visible if allowed to manage users) */}
        {activeTab === "users" && canManageUsers && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Registered Students</h3>
              <p className="text-2xl font-bold text-surface-dark mt-2">{totalUsers}</p>
            </div>
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Pro Members</h3>
              <p className="text-2xl font-bold text-brand mt-2">{proUsers}</p>
            </div>
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pro Ratio</h3>
              <p className="text-2xl font-bold text-green-600 mt-2">{premiumRatio}%</p>
            </div>
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Administrators</h3>
              <p className="text-2xl font-bold text-surface-dark mt-2">{adminUsers}</p>
            </div>
          </div>
        )}

        {/* AI & R2 Configurations Section */}
        {activeTab === "config" && canManageSettings && (
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-8">
            {/* AI Settings Form */}
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                  <Key className="text-brand" size={18} /> AI Provider Configurations
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Select your active AI provider and save API credentials.
                </p>
              </div>

              <form onSubmit={handleSaveAiSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active AI Provider</label>
                    <select
                      value={activeProvider}
                      onChange={(e) => setActiveProvider(e.target.value)}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer"
                    >
                      <option value="gemini">Google Gemini (Flash)</option>
                      <option value="openai">OpenAI (GPT-4o Mini)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2 text-[10px] pb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${hasGemini ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                      Gemini: {hasGemini ? "Configured" : "Not Set"}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${hasOpenai ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                      OpenAI: {hasOpenai ? "Configured" : "Not Set"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gemini API Key</label>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder={hasGemini ? "•••••••••••••••• (Enter new key to overwrite)" : "Enter Gemini API Key (e.g. AIzaSy...)"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">OpenAI API Key</label>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder={hasOpenai ? "•••••••••••••••• (Enter new key to overwrite)" : "Enter OpenAI API Key (e.g. sk-proj...)"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    {saveSuccess && (
                      <p className="text-xs text-green-500 font-semibold flex items-center gap-1 animate-pulse">
                        <CheckCircle2 size={12} /> AI configurations updated successfully!
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={savingKey}
                    className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 self-end shrink-0 shadow-sm"
                  >
                    {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={12} />}
                    {savingKey ? "Saving Settings..." : "Save AI Configurations"}
                  </button>
                </div>
              </form>
            </div>

            {/* Cloudflare R2 Configurations Form */}
            <div className="border-t border-gray-100 pt-8">
              <div>
                <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                  <Settings className="text-brand" size={18} /> Cloudflare R2 configurations
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure object storage parameters for cheap study attachments.
                </p>
              </div>

              <form onSubmit={handleSaveR2Settings} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">R2 Access Key ID</label>
                    <input
                      type="password"
                      value={r2AccessKey}
                      onChange={(e) => setR2AccessKey(e.target.value)}
                      placeholder={hasR2AccessKey ? "•••••••••••••••• (Enter new key to overwrite)" : "Enter R2 Access Key ID"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">R2 Secret Access Key</label>
                    <input
                      type="password"
                      value={r2SecretKey}
                      onChange={(e) => setR2SecretKey(e.target.value)}
                      placeholder={hasR2SecretKey ? "•••••••••••••••• (Enter new key to overwrite)" : "Enter R2 Secret Access Key"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">R2 S3 endpoint URL</label>
                    <input
                      type="text"
                      value={r2Endpoint}
                      onChange={(e) => setR2Endpoint(e.target.value)}
                      placeholder="https://<account-id>.r2.cloudflarestorage.com"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bucket Name</label>
                    <input
                      type="text"
                      value={r2BucketName}
                      onChange={(e) => setR2BucketName(e.target.value)}
                      placeholder="e.g. onpace-notes"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">R2 Public URL / Subdomain</label>
                  <input
                    type="text"
                    value={r2PublicUrl}
                    onChange={(e) => setR2PublicUrl(e.target.value)}
                    placeholder="https://pub-xxxxxx.r2.dev or custom domain"
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${hasR2AccessKey && hasR2SecretKey ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                      R2 Credentials: {hasR2AccessKey && hasR2SecretKey ? "Configured" : "Not Set"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {saveR2Success && (
                      <span className="text-green-500 text-xs font-semibold flex items-center gap-1 animate-pulse">
                        <CheckCircle2 size={12} /> Settings saved successfully!
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={savingR2}
                      className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {savingR2 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={12} />}
                      Save R2 Settings
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Billing Retry & Grace Settings Form */}
            <div className="border-t border-gray-100 pt-8">
              <div>
                <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                  <CreditCard className="text-brand" size={18} /> Global Billing Rules & Grace Periods
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure global rules for handling rejected payments, retry counts, and cancellation grace periods.
                </p>
              </div>

              <form onSubmit={handleSaveBillingRules} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max Consecutive Failed Retries before Cancellation</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={maxFailedAttempts}
                      onChange={(e) => setMaxFailedAttempts(Number(e.target.value))}
                      placeholder="e.g. 3"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Global Grace Period Days</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={30}
                      value={globalGraceDays}
                      onChange={(e) => setGlobalGraceDays(Number(e.target.value))}
                      placeholder="e.g. 3"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    {saveBillingRulesSuccess && (
                      <span className="text-green-500 text-xs font-semibold flex items-center gap-1 animate-pulse">
                        <CheckCircle2 size={12} /> Billing rules updated successfully!
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={savingBillingRules}
                    className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {savingBillingRules ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={12} />}
                    Save Billing Rules
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Promo Codes Management Panel */}
        {activeTab === "promocodes" && canManagePromocodes && (
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                <Tag className="text-brand" size={18} /> Promo Codes Management
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Create campaigns, set maximum utilization caps, discount values, and validity schedules.
              </p>
            </div>

            {/* Create Promocode Form */}
            <form onSubmit={handleCreatePromocode} className="bg-gray-50/50 p-4 border border-gray-200/60 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-surface-dark flex items-center gap-1"><PlusCircle size={14} className="text-brand" /> Create New Promo Code</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Promo Code (Uppercase)</label>
                  <input
                    type="text"
                    required
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value)}
                    placeholder="e.g. DISCOUNT50, TRIAL30"
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="free_trial">Free Pro Trial (Days)</option>
                    <option value="lifetime">Lifetime Free Pro Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount / Trial Value</label>
                  <input
                    type="number"
                    required
                    disabled={discountType === "lifetime"}
                    value={discountType === "lifetime" ? 0 : discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    min={0}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max Uses Count (Empty = Unlimited)</label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">End Date (Expiration)</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div>
                  {promoSuccess && (
                    <p className="text-xs text-green-500 font-semibold flex items-center gap-1 animate-pulse">
                      <CheckCircle2 size={12} /> Promo code successfully created!
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={creatingPromo}
                  className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  {creatingPromo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag size={12} />}
                  Create Promo Code
                </button>
              </div>
            </form>

            {/* List Promocodes */}
            <div className="overflow-x-auto border border-gray-150 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Discount Details</th>
                    <th className="px-5 py-3">Usage</th>
                    <th className="px-5 py-3">Valid Dates</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs text-gray-700 bg-white">
                  {promocodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-gray-400">No active promo codes campaigns registered.</td>
                    </tr>
                  ) : (
                    promocodes.map((promo) => {
                      const now = new Date();
                      const start = new Date(promo.start_date);
                      const end = new Date(promo.end_date);
                      const isExpired = now > end || now < start;
                      const limitReached = promo.max_uses !== null && promo.uses_count >= promo.max_uses;

                      return (
                        <tr key={promo.id} className="hover:bg-gray-50/40">
                          <td className="px-5 py-3 font-bold text-surface-dark">{promo.code}</td>
                          <td className="px-5 py-3">
                            <span className="font-semibold text-xs">
                              {promo.discount_type === "lifetime" ? "Lifetime Pro Access" :
                               promo.discount_type === "free_trial" ? `${promo.discount_value} Days Free Pro Trial` :
                               `${promo.discount_value}% Discount Percentage`}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium">
                            {promo.uses_count} / {promo.max_uses !== null ? promo.max_uses : "∞"}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {start.toLocaleDateString()} to {end.toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            {isExpired ? (
                              <span className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold">Expired</span>
                            ) : limitReached ? (
                              <span className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold">Limit Reached</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-green-50 border border-green-100 text-green-600 text-[10px] font-bold">Active</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                             <div className="flex justify-end gap-2.5">
                               <button
                                 onClick={() => handleOpenEditPromo(promo)}
                                 className="p-1 hover:text-brand text-gray-400 transition-colors cursor-pointer"
                                 title="Edit Promo Code"
                               >
                                 <Edit size={14} />
                               </button>
                               <button
                                 onClick={() => handleDeletePromocode(promo.id)}
                                 className="p-1 hover:text-red-500 text-gray-400 transition-colors cursor-pointer"
                                 title="Delete Promo Code"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                           </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Table */}
        {activeTab === "users" && canManageUsers && (
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-dark">Registered Students</h2>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-brand" />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-100">
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Grade Level</th>
                    <th className="px-6 py-4">Subscription Plan</th>
                    <th className="px-6 py-4">Expiration / Status</th>
                    <th className="px-6 py-4">Admin Role</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                        No users registered in the database yet.
                      </td>
                    </tr>
                  )}
                  {profiles.map((profile) => {
                    const isUserPro = profile.plan === "pro";
                    const isExpired = profile.trial_ends_at && new Date(profile.trial_ends_at) < new Date();
                    const isTrial = profile.trial_ends_at !== null;
                    
                    return (
                      <tr key={profile.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-surface-dark">
                            {profile.full_name || "Anonymous User"}
                          </div>
                          {profile.email && (
                            <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                              {profile.email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {profile.grade_level || "Not specified"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isUserPro && !isExpired ? "bg-brand/10 text-brand" : "bg-gray-100 text-gray-600"}`}>
                            {isUserPro && !isExpired ? (
                              <>
                                <Sparkles size={12} /> Pro Tier
                              </>
                            ) : profile.plan === "founding" ? (
                              <>
                                <Sparkles size={12} className="text-purple-500 animate-pulse" /> Founding
                              </>
                            ) : (
                              "Free Tier"
                            )}
                          </span>
                          {profile.discount_percent > 0 && (
                            <span className="ml-2 text-[10px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded border border-green-200">
                              -{profile.discount_percent}% Coupon
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {isUserPro && !isExpired ? (
                            profile.billing_cycle === "monthly" ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-gray-700 flex items-center gap-1"><Clock size={11} className="text-brand" /> Monthly Plan</span>
                                {profile.next_billing_date && <span className="block text-[10px] text-gray-400">Renews: {new Date(profile.next_billing_date).toLocaleDateString()}</span>}
                              </div>
                            ) : profile.billing_cycle === "yearly" ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-gray-700 flex items-center gap-1"><Clock size={11} className="text-brand" /> Yearly Plan</span>
                                {profile.next_billing_date && <span className="block text-[10px] text-gray-400">Renews: {new Date(profile.next_billing_date).toLocaleDateString()}</span>}
                              </div>
                            ) : profile.billing_cycle === "lifetime" || !profile.trial_ends_at ? (
                              <span className="font-semibold text-purple-650">Lifetime Access</span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-brand font-semibold">Pro Trial</span>
                                <span className="block text-[10px] text-gray-400">Expires: {new Date(profile.trial_ends_at).toLocaleDateString()}</span>
                              </div>
                            )
                          ) : profile.plan === "founding" ? (
                            <span className="font-semibold text-purple-650">Lifetime Access</span>
                          ) : isExpired ? (
                            <span className="text-red-500 font-bold">Trial Expired</span>
                          ) : (
                            "Free Active"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                            profile.role === "super_admin" 
                              ? "bg-purple-50 text-purple-600 border-purple-100" 
                              : profile.role === "admin" 
                              ? "bg-red-50 text-red-600 border-red-100" 
                              : "bg-gray-100 text-gray-500 border-transparent"
                          }`}>
                            {profile.role === "super_admin" ? "Super Admin" : profile.role === "admin" ? "Sub-Admin" : "Student"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleOpenAdjustAccess(profile)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <CreditCard size={12} /> Set Plan
                            </button>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleOpenBillingDetails(profile)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Clock size={12} /> History
                            </button>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleOpenEditStudent(profile)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Edit size={12} /> Edit Profile
                            </button>
                            {isSuperAdmin && (
                              <button
                                disabled={updatingId !== null}
                                onClick={() => handleOpenEditUser(profile)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                <UserCog size={12} /> Edit Role
                              </button>
                            )}
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleDeleteStudent(profile.id, profile.full_name)}
                              className="px-2.5 py-1.5 rounded-lg border border-red-100 text-xs font-bold text-red-600 bg-red-50/30 hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* System Error & Execution Logs */}
        {activeTab === "logs" && canViewLogs && (
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                <Terminal className="text-brand" size={18} /> System Execution Logs
              </h2>
              <button
                onClick={fetchLogs}
                className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-brand transition-colors cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-semibold"
              >
                <RefreshCw size={14} /> Refresh Logs
              </button>
            </div>

            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No system errors logged. Everything is running healthy.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border border-red-100 bg-red-50/20 rounded-2xl flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-red-700">
                      <span className="flex items-center gap-1">
                        <AlertTriangle size={14} /> {log.error_message}
                      </span>
                      <span className="text-[10px] font-normal text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-gray-500 mt-1 font-mono bg-white/60 p-2.5 rounded-lg border border-gray-100 break-words overflow-x-auto whitespace-pre-wrap max-h-32">
                      {log.details || "No supplementary trace details provided."}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Triggered by: {log.profiles?.full_name || "Anonymous User / Server Context"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Social Moderation Tab */}
        {activeTab === "moderation" && isSuperAdmin && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    🛡️ Social Feed Moderation
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Review, flag, or remove user posts from the social academy stream.</p>
                </div>
                <button
                  onClick={fetchModerationPosts}
                  className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-brand transition-colors cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-semibold"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {loadingPosts ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-brand" />
                </div>
              ) : moderationPosts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  No posts in the social feed yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {moderationPosts.map((post) => (
                    <div
                      key={post.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-start gap-4 transition-all ${
                        post.is_flagged
                          ? "bg-red-50/30 border-red-100"
                          : "bg-white border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-brand/10 text-brand font-bold text-[10px] flex items-center justify-center border border-brand/20 uppercase shrink-0">
                            {post.profiles?.full_name?.charAt(0) || "S"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-surface-dark">{post.profiles?.full_name || "Anonymous"}</p>
                            <p className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleString()}</p>
                          </div>
                          {post.is_flagged && (
                            <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase">
                              🚩 Flagged
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed pl-9">{post.content}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleTogglePostFlag(post.id, post.is_flagged)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                            post.is_flagged
                              ? "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                              : "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100"
                          }`}
                        >
                          {post.is_flagged ? "✅ Unflag" : "🚩 Flag"}
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all cursor-pointer active:scale-95"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bulletins & Feedbacks Tab */}
        {activeTab === "announcements" && isSuperAdmin && (
          <div className="space-y-6">

            {/* Create New Announcement Form */}
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">📢 Create Bulletin or Feedback Form</h2>
                <p className="text-xs text-gray-400 mt-0.5">Pinned announcements appear as a banner at the top of the dashboard. Popup forms are shown once per login session.</p>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
                    <select value={newAnnType} onChange={(e) => setNewAnnType(e.target.value as "announcement" | "feedback")} className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer font-semibold">
                      <option value="announcement">📢 Announcement (Info only)</option>
                      <option value="feedback">📋 Feedback / Survey Form</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Display Style</label>
                    <select value={newAnnDisplayType} onChange={(e) => setNewAnnDisplayType(e.target.value as "pin" | "popup")} className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer font-semibold">
                      <option value="pin">📌 Pinned Banner (top of dashboard)</option>
                      <option value="popup">🪟 Popup Modal (one-time on login)</option>
                    </select>
                  </div>
                </div>

                {/* Target Audience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50/40 border border-blue-100 rounded-2xl">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">🎯 Target Audience</label>
                    <select value={newAnnTargetAudience} onChange={(e) => { setNewAnnTargetAudience(e.target.value); setNewAnnTargetFilter(""); }} className="block w-full mt-2 px-3 py-2.5 border border-blue-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer font-semibold">
                      <option value="all">👥 All Users</option>
                      <option value="plan">💎 By Subscription Plan</option>
                      <option value="grade">🏫 By Grade Level</option>
                      <option value="course">📚 By Course Name</option>
                    </select>
                  </div>
                  {newAnnTargetAudience !== "all" && (
                    <div>
                      <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        {newAnnTargetAudience === "plan" ? "Plan Name (free / plus / pro / founding)" : newAnnTargetAudience === "grade" ? "Grade Level (e.g. 10, 11)" : "Course Name (e.g. Mathematics)"}
                      </label>
                      <input type="text" value={newAnnTargetFilter} onChange={(e) => setNewAnnTargetFilter(e.target.value)} placeholder={newAnnTargetAudience === "plan" ? "pro" : newAnnTargetAudience === "grade" ? "10" : "Mathematics"} className="block w-full mt-2 px-3 py-2.5 border border-blue-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-400 text-gray-900 bg-white" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Title</label>
                  <input type="text" required value={newAnnTitle} onChange={(e) => setNewAnnTitle(e.target.value)} placeholder="e.g. Scheduled maintenance on July 30th" className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-gray-900 bg-white" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Content / Body</label>
                  <textarea required rows={3} value={newAnnContent} onChange={(e) => setNewAnnContent(e.target.value)} placeholder="Write the full announcement text here..." className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-gray-900 bg-white resize-none" />
                </div>

                {newAnnType === "feedback" && (
                  <div className="space-y-3 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
                    <label className="block text-[10px] font-bold text-purple-600 uppercase tracking-wider">Survey Questions</label>
                    {newAnnQuestions.length > 0 && (
                      <div className="space-y-1.5">
                        {newAnnQuestions.map((q: any, idx: number) => (
                          <div key={q.id} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2.5 rounded-xl border border-purple-100">
                            <span className="font-bold text-purple-600 shrink-0">Q{idx + 1}.</span>
                            <span className="flex-1">{q.question}</span>
                            <button type="button" onClick={() => setNewAnnQuestions((prev: any[]) => prev.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-600 cursor-pointer shrink-0"><Trash2 size={13} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input type="text" value={newAnnQuestionText} onChange={(e) => setNewAnnQuestionText(e.target.value)} placeholder="Type a question and click Add..." className="flex-1 px-3 py-2 border border-purple-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-purple-400 bg-white text-gray-900 placeholder-gray-400" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddQuestion(); } }} />
                      <button type="button" onClick={handleAddQuestion} className="px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 cursor-pointer active:scale-95 transition-all">+ Add</button>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={creatingAnn} className="w-full py-3 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                  {creatingAnn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle size={14} />}
                  {creatingAnn ? "Publishing..." : "Publish Announcement"}
                </button>
              </form>
            </div>

            {/* Published Bulletins List */}
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-surface-dark">📋 Published Bulletins</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{announcements.length} bulletin{announcements.length !== 1 ? "s" : ""} total • {announcements.filter(a => a.is_active).length} active</p>
                </div>
                <button onClick={fetchAnnouncementsData} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-brand transition-colors cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-semibold">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {announcements.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">No announcements published yet. Create one above.</div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => {
                    const responses = annResponses.filter(r => r.announcement_id === ann.id);
                    const audienceLabel = !ann.target_audience || ann.target_audience === "all"
                      ? "All Users"
                      : ann.target_audience === "plan" ? `Plan: ${Object.values(ann.target_filter || {})[0] || "?"}`
                      : ann.target_audience === "grade" ? `Grade: ${Object.values(ann.target_filter || {})[0] || "?"}`
                      : `Course: ${Object.values(ann.target_filter || {})[0] || "?"}`;
                    return (
                      <div key={ann.id} className={`p-4 border rounded-2xl transition-all space-y-3 ${ ann.is_active ? "border-gray-100 hover:border-gray-200 bg-white" : "border-gray-100 bg-gray-50/50 opacity-70" }`}>
                        {/* Header row */}
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${ ann.type === "feedback" ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-brand/10 text-brand border-brand/20" }`}>
                                {ann.type === "feedback" ? "📋 Survey" : "📢 Bulletin"}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${ ann.display_type === "popup" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-green-50 text-green-600 border-green-100" }`}>
                                {ann.display_type === "popup" ? "🪟 Popup" : "📌 Pinned"}
                              </span>
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-100">
                                🎯 {audienceLabel}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${ ann.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-100 text-gray-400 border-gray-200" }`}>
                                {ann.is_active ? "● Active" : "○ Paused"}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-surface-dark">{ann.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{ann.content}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(ann.created_at).toLocaleString("tr-TR")} •
                              {ann.type === "feedback" ? ` ${responses.length} response${responses.length !== 1 ? "s" : ""}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-50">
                          <button onClick={() => setDetailAnn({ ann, responses })} className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 cursor-pointer active:scale-95 transition-all flex items-center gap-1">
                            <Eye size={11} /> View Details
                          </button>
                          <button onClick={() => handleOpenEditAnn(ann)} className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-brand/5 text-brand border border-brand/20 hover:bg-brand/10 cursor-pointer active:scale-95 transition-all flex items-center gap-1">
                            <Edit size={11} /> Edit
                          </button>
                          <button onClick={() => handleToggleAnnActive(ann)} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border cursor-pointer active:scale-95 transition-all flex items-center gap-1 ${ ann.is_active ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" }`}>
                            {ann.is_active ? (<><span>⏸</span> Pause</>) : (<><span>▶</span> Resume</>)}
                          </button>
                          <button onClick={() => handleDeleteAnnouncement(ann.id)} className="ml-auto px-3 py-1.5 rounded-xl text-[10px] font-bold bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 cursor-pointer active:scale-95 transition-all flex items-center gap-1">
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Edit Announcement */}
        {editingAnn && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-brand to-brand-dark p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">✏️ Edit Announcement</h3>
                  <p className="text-xs opacity-75 mt-0.5">{editingAnn.title}</p>
                </div>
                <button onClick={() => setEditingAnn(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
                    <select value={editAnnType} onChange={(e) => setEditAnnType(e.target.value as "announcement" | "feedback")} className="block w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer">
                      <option value="announcement">📢 Announcement</option>
                      <option value="feedback">📋 Feedback Survey</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Display</label>
                    <select value={editAnnDisplayType} onChange={(e) => setEditAnnDisplayType(e.target.value as "pin" | "popup")} className="block w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer">
                      <option value="pin">📌 Pinned Banner</option>
                      <option value="popup">🪟 Popup Modal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/40 border border-blue-100 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">Target Audience</label>
                    <select value={editAnnTargetAudience} onChange={(e) => { setEditAnnTargetAudience(e.target.value); setEditAnnTargetFilter(""); }} className="block w-full mt-1.5 px-3 py-2 border border-blue-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer">
                      <option value="all">👥 All Users</option>
                      <option value="plan">💎 By Plan</option>
                      <option value="grade">🏫 By Grade</option>
                      <option value="course">📚 By Course</option>
                    </select>
                  </div>
                  {editAnnTargetAudience !== "all" && (
                    <div>
                      <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">Filter Value</label>
                      <input type="text" value={editAnnTargetFilter} onChange={(e) => setEditAnnTargetFilter(e.target.value)} placeholder={editAnnTargetAudience === "plan" ? "pro" : editAnnTargetAudience === "grade" ? "10" : "Mathematics"} className="block w-full mt-1.5 px-3 py-2 border border-blue-200 rounded-xl text-xs text-gray-900 bg-white outline-none" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Title</label>
                  <input type="text" required value={editAnnTitle} onChange={(e) => setEditAnnTitle(e.target.value)} className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 bg-white outline-none focus:ring-1 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Content</label>
                  <textarea rows={4} required value={editAnnContent} onChange={(e) => setEditAnnContent(e.target.value)} className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 bg-white outline-none focus:ring-1 focus:ring-brand resize-none" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditingAnn(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
                  <button onClick={handleSaveEditAnn} disabled={savingAnn} className="flex-1 py-2.5 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                    {savingAnn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save size={13} />}
                    {savingAnn ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Detail View */}
        {detailAnn && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-brand to-brand-dark p-5 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold">{detailAnn.ann.title}</h3>
                  <p className="text-xs opacity-75 mt-0.5">{detailAnn.ann.type === "feedback" ? "Survey" : "Bulletin"} • {detailAnn.ann.display_type === "popup" ? "Popup" : "Pinned"}</p>
                </div>
                <button onClick={() => setDetailAnn(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">✕</button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Status", value: detailAnn.ann.is_active ? "Active" : "Paused", color: detailAnn.ann.is_active ? "text-emerald-600" : "text-gray-400" },
                    { label: "Display", value: detailAnn.ann.display_type === "popup" ? "🪟 Popup" : "📌 Pinned" },
                    { label: "Audience", value: !detailAnn.ann.target_audience || detailAnn.ann.target_audience === "all" ? "All Users" : `${detailAnn.ann.target_audience}: ${Object.values(detailAnn.ann.target_filter || {})[0] || "-"}` },
                    { label: "Created", value: new Date(detailAnn.ann.created_at).toLocaleDateString("tr-TR") },
                    { label: "Responses", value: String(detailAnn.responses.length) },
                    { label: "Questions", value: String(detailAnn.ann.questions?.length || 0) }
                  ].map((item: any) => (
                    <div key={item.label} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{item.label}</p>
                      <p className={`text-xs font-bold mt-0.5 ${item.color || "text-surface-dark"}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Content</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{detailAnn.ann.content}</p>
                </div>

                {/* Questions list */}
                {detailAnn.ann.questions && detailAnn.ann.questions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Survey Questions</p>
                    {detailAnn.ann.questions.map((q: any, idx: number) => (
                      <div key={q.id || idx} className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-gray-700">
                        <span className="font-bold text-purple-600 mr-1">Q{idx + 1}.</span> {q.question}
                      </div>
                    ))}
                  </div>
                )}

                {/* Responses */}
                {detailAnn.responses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">All Responses ({detailAnn.responses.length})</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {detailAnn.responses.map((resp: any) => (
                        <div key={resp.id} className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                          <p className="text-[10px] font-bold text-purple-700 mb-1.5">{resp.profiles?.full_name || "Anonymous"} • {new Date(resp.created_at).toLocaleString("tr-TR")}</p>
                          {Object.entries(resp.responses || {}).map(([key, val]: [string, any]) => (
                            <div key={key} className="text-[10px] text-gray-600 mb-0.5">
                              <span className="font-semibold text-gray-500">{key}:</span> {String(val)}
                            </div>
                          ))}
                          {Object.keys(resp.responses || {}).length === 0 && (
                            <p className="text-[10px] text-gray-400 italic">No answers submitted</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 shrink-0">
                <button onClick={() => setDetailAnn(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Change Plan / Trial Expiration */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-6 relative border border-gray-150 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <Sparkles className="text-brand animate-pulse" /> Adjust Access Level
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">For student: {selectedUser.full_name}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Target Tier</label>
                  <select
                    value={trialDuration}
                    onChange={(e) => setTrialDuration(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                  >
                    <option value="free">Free Tier (Standard Access)</option>
                    <option value="7">Pro Tier: 7 Days Trial</option>
                    <option value="30">Pro Tier: 30 Days Access</option>
                    <option value="custom">Pro Tier: Custom Days Trial</option>
                    <option value="lifetime">Pro Tier: Lifetime Access</option>
                  </select>
                </div>

                {trialDuration === "custom" && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Number of Trial Days</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={3650}
                      value={customTrialDays}
                      onChange={(e) => setCustomTrialDays(e.target.value)}
                      placeholder="e.g. 14"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-semibold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grace Days Granted</label>
                    <input
                      type="number"
                      min={0}
                      value={adjustGraceDays}
                      onChange={(e) => setAdjustGraceDays(Number(e.target.value))}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Failed Payment Retries</label>
                    <input
                      type="number"
                      min={0}
                      value={adjustFailedAttempts}
                      onChange={(e) => setAdjustFailedAttempts(Number(e.target.value))}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Next Billing Renewal Date</label>
                  <input
                    type="datetime-local"
                    value={adjustNextBilling}
                    onChange={(e) => setAdjustNextBilling(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-semibold cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePlan}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-hover cursor-pointer"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit User Role & Sub-Admin Permissions (Super Admin only) */}
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 relative border border-gray-150 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <UserCog className="text-brand" /> Edit Role & Permissions
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">User: {editingUser.full_name}</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">User Role</label>
                  <select
                    value={editingUserRole}
                    onChange={(e) => setEditingUserRole(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                  >
                    <option value="student">Student (Standard User)</option>
                    <option value="admin">Sub-Admin (Restricted Access)</option>
                    <option value="super_admin">Super Admin (Unrestricted Access)</option>
                  </select>
                </div>

                {editingUserRole === "admin" && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sub-Admin Permissions</label>
                    <div className="space-y-2.5 mt-1.5">
                      {[
                        { key: "manage_users", label: "Registered Students & Subscriptions" },
                        { key: "manage_promocodes", label: "Promo Codes Campaign Manager" },
                        { key: "manage_settings", label: "AI & R2 Configurations" },
                        { key: "view_logs", label: "View System Execution Logs" }
                      ].map((item) => {
                        const checked = editingUserPermissions.includes(item.key);
                        return (
                          <div 
                            key={item.key} 
                            onClick={() => togglePermissionCheckbox(item.key)}
                            className="flex items-center gap-2.5 p-2 rounded-xl border border-gray-100 hover:bg-gray-50/50 cursor-pointer text-xs font-semibold text-gray-700 transition-all"
                          >
                            {checked ? <CheckSquare size={16} className="text-brand" /> : <Square size={16} className="text-gray-400" />}
                            <span>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3 border-t border-gray-100">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveUserPermissions}
                    disabled={savingPermissions}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-hover cursor-pointer flex items-center justify-center gap-1"
                  >
                    {savingPermissions && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: View Billing Details & Transaction History */}
        {viewingBillingDetails && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 relative border border-gray-150 shadow-xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <CreditCard className="text-brand" /> Subscription & Transaction History
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Billing details for: <span className="font-bold text-gray-700">{viewingBillingDetails.full_name}</span></p>
                </div>
                <button onClick={() => setViewingBillingDetails(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              {/* User Subscription Profile Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Current Tier</span>
                  <span className="font-bold text-surface-dark uppercase">{viewingBillingDetails.plan}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Billing Cycle</span>
                  <span className="font-bold text-surface-dark uppercase">{viewingBillingDetails.billing_cycle || "none"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Trial Start Date</span>
                  <span className="font-semibold text-gray-600">
                    {viewingBillingDetails.trial_start_at ? new Date(viewingBillingDetails.trial_start_at).toLocaleDateString() : "Not started"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Trial Expiration</span>
                  <span className="font-semibold text-gray-600">
                    {viewingBillingDetails.trial_ends_at ? new Date(viewingBillingDetails.trial_ends_at).toLocaleDateString() : "No active trial"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-xs mt-2">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Next Billing Date</span>
                  <span className="font-bold text-brand">
                    {viewingBillingDetails.next_billing_date ? new Date(viewingBillingDetails.next_billing_date).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Failed Payment Retries</span>
                  <span className={`font-bold ${viewingBillingDetails.failed_payment_attempts > 0 ? "text-red-500" : "text-gray-600"}`}>
                    {viewingBillingDetails.failed_payment_attempts || 0} Attempts
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Grace Days Granted</span>
                  <span className="font-semibold text-gray-600">
                    {viewingBillingDetails.grace_days_granted || 0} Extra Days
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-surface-dark uppercase tracking-wider">Transaction Records</h4>
                
                {loadingHistory ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  </div>
                ) : userPurchaseHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No transaction history exists for this user.</p>
                ) : (
                  <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-[10px] uppercase font-bold text-gray-500">
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Plan Type</th>
                          <th className="px-4 py-2.5">Amount</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Payment Intent ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-600 bg-white">
                        {userPurchaseHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5">{new Date(item.created_at).toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-semibold text-surface-dark uppercase">{item.plan_type}</td>
                            <td className="px-4 py-2.5 font-bold text-green-600">${item.amount}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                item.status === "completed" ? "bg-green-50 text-green-600 border border-green-100" :
                                item.status === "failed" ? "bg-red-50 text-red-500 border border-red-100" :
                                "bg-amber-50 text-amber-500 border border-amber-100"
                              }`}>
                                {item.status || "completed"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-gray-400">{item.stripe_payment_intent_id || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingBillingDetails(null)}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
                >
                  Close Records
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Student Profile */}
        {profileEditUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 relative border border-gray-150 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <User className="text-brand" /> Edit Student Profile
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Adjust information for user: {profileEditUser.full_name || "Anonymous"}</p>
                </div>
                <button onClick={() => setProfileEditUser(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileEditName}
                    onChange={(e) => setProfileEditName(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grade / Goal Level</label>
                  <input
                    type="text"
                    required
                    value={profileEditGrade}
                    onChange={(e) => setProfileEditGrade(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileEditEmail}
                    onChange={(e) => setProfileEditEmail(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount Coupon Percentage (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={profileEditDiscount}
                    onChange={(e) => setProfileEditDiscount(Number(e.target.value))}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div className="pt-4 flex gap-3 border-t border-gray-100">
                  <button
                    onClick={() => setProfileEditUser(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveStudentProfile}
                    disabled={savingStudentProfile}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-hover cursor-pointer flex items-center justify-center gap-1"
                  >
                    {savingStudentProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Promo Code */}
        {editingPromo && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 relative border border-gray-150 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <Tag className="text-brand" /> Edit Promo Code Campaign
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Adjust parameters for code: {editingPromo.code}</p>
                </div>
                <button onClick={() => setEditingPromo(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Promo Code String</label>
                  <input
                    type="text"
                    required
                    value={editingPromoCode}
                    onChange={(e) => setEditingPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GET30"
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount Type</label>
                    <select
                      value={editingPromoDiscountType}
                      onChange={(e) => setEditingPromoDiscountType(e.target.value as any)}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                    >
                      <option value="percentage">Percentage Discount</option>
                      <option value="free_trial">Free Pro Trial Days</option>
                      <option value="lifetime">Lifetime Pro Upgrade</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount Value</label>
                    <input
                      type="number"
                      required
                      min={0}
                      disabled={editingPromoDiscountType === "lifetime"}
                      value={editingPromoDiscountType === "lifetime" ? "" : editingPromoDiscountValue}
                      onChange={(e) => setEditingPromoDiscountValue(Number(e.target.value))}
                      placeholder={editingPromoDiscountType === "lifetime" ? "N/A" : "Value"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max Usage Limit</label>
                    <input
                      type="number"
                      value={editingPromoMaxUses}
                      onChange={(e) => setEditingPromoMaxUses(e.target.value)}
                      placeholder="∞ (Unlimited)"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                    <input
                      type="datetime-local"
                      required
                      value={editingPromoStartDate}
                      onChange={(e) => setEditingPromoStartDate(e.target.value)}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">End Date (Expiration)</label>
                  <input
                    type="datetime-local"
                    required
                    value={editingPromoEndDate}
                    onChange={(e) => setEditingPromoEndDate(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div className="pt-4 flex gap-3 border-t border-gray-100">
                  <button
                    onClick={() => setEditingPromo(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePromoCode}
                    disabled={savingPromo}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-hover cursor-pointer flex items-center justify-center gap-1"
                  >
                    {savingPromo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
