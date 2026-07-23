"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  RefreshCw
} from "lucide-react";

export default function AdminPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // AI Config States
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [hasGemini, setHasGemini] = useState(false);
  const [hasOpenai, setHasOpenai] = useState(false);
  const [activeProvider, setActiveProvider] = useState("gemini");
  const [savingKey, setSavingKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Plan Duration Modal States
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [trialDuration, setTrialDuration] = useState("7"); // "7", "30", "lifetime", "free"

  useEffect(() => {
    fetchProfiles();
    fetchSettings();
    fetchLogs();
  }, []);

  async function fetchProfiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    
    if (!error && data) {
      setProfiles(data);
    }
    setLoading(false);
  }

  async function fetchSettings() {
    const { data, error } = await supabase.rpc("get_system_ai_settings");
    if (!error && data) {
      const settings = Array.isArray(data) ? data[0] : data;
      setHasGemini(settings?.has_gemini || false);
      setHasOpenai(settings?.has_openai || false);
      setActiveProvider(settings?.active_provider || "gemini");
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

  const toggleRole = async (userId: string, currentRole: string) => {
    setUpdatingId(userId);
    const nextRole = currentRole === "admin" ? "student" : "admin";
    const { error } = await supabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", userId);
    
    if (!error) {
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: nextRole } : p));
    }
    setUpdatingId(null);
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
      } else {
        expiresAt = null; // Lifetime
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        plan: nextPlan,
        pro_expires_at: expiresAt
      })
      .eq("id", selectedUser.id);

    if (!error) {
      setProfiles(profiles.map(p => 
        p.id === selectedUser.id 
          ? { ...p, plan: nextPlan, pro_expires_at: expiresAt } 
          : p
      ));
    }

    setUpdatingId(null);
    setSelectedUser(null);
  };

  // Metrics
  const totalUsers = profiles.length;
  const proUsers = profiles.filter(p => {
    const active = p.plan === "pro" && (p.pro_expires_at === null || new Date(p.pro_expires_at) > new Date());
    return active;
  }).length;
  const adminUsers = profiles.filter(p => p.role === "admin").length;
  const premiumRatio = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0;

  return (
    <div className="min-h-screen bg-surface-secondary p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand mb-2">
              <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-semibold hover:underline">
                <ArrowLeft size={16} /> Back to Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-surface-dark flex items-center gap-2">
              <UserCog className="text-brand" /> Administrator Panel
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage user profiles, billing plans, and permissions.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-brand/10 text-brand px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <Shield size={14} /> Admin Mode Active
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-3xl font-bold text-surface-dark mt-2">{loading ? "..." : totalUsers}</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Active Pro/Trials</h3>
            <p className="text-3xl font-bold text-brand mt-2">{loading ? "..." : proUsers}</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Premium Ratio</h3>
            <p className="text-3xl font-bold text-accent mt-2">{loading ? "..." : `${premiumRatio}%`}</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Admin Roles</h3>
            <p className="text-3xl font-bold text-surface-dark mt-2">{loading ? "..." : adminUsers}</p>
          </div>
        </div>

        {/* Configurations Panel */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
              <Key className="text-brand" /> AI Configurations (Gemini & OpenAI)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Select your active AI provider and save API credentials. Keys are encrypted and stored securely on the database.
            </p>
          </div>

          <form onSubmit={handleSaveAiSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Active AI Provider</label>
                <select
                  value={activeProvider}
                  onChange={(e) => setActiveProvider(e.target.value)}
                  className="block w-full mt-2 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark outline-none cursor-pointer"
                >
                  <option value="gemini">Google Gemini (Flash)</option>
                  <option value="openai">OpenAI (GPT-4o Mini)</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${hasGemini ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                  Gemini Status: {hasGemini ? "Active / Configured" : "Not Set"}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${hasOpenai ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                  OpenAI Status: {hasOpenai ? "Active / Configured" : "Not Set"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Gemini API Key</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder={hasGemini ? "•••••••••••••••• (Enter new key to overwrite)" : "Enter Gemini API Key (e.g. AIzaSy...)"}
                  className="block w-full mt-2 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-surface-dark bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">OpenAI API Key</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder={hasOpenai ? "•••••••••••••••• (Enter new key to overwrite)" : "Enter OpenAI API Key (e.g. sk-proj...)"}
                  className="block w-full mt-2 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-surface-dark bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                {saveSuccess && (
                  <p className="text-xs text-green-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> AI configurations updated successfully!
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={savingKey}
                className="px-6 py-3 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 self-end shrink-0"
              >
                {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
                {savingKey ? "Saving Settings..." : "Save AI Configurations"}
              </button>
            </div>
          </form>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-surface-dark">Registered Students</h2>
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
                  <th className="px-6 py-4">Admin Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {!loading && profiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                      No users registered in the database yet.
                    </td>
                  </tr>
                )}
                {profiles.map((profile) => {
                  const isUserPro = profile.plan === "pro";
                  const isExpired = profile.pro_expires_at && new Date(profile.pro_expires_at) < new Date();
                  const isTrial = profile.pro_expires_at !== null;
                  
                  return (
                    <tr key={profile.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-semibold text-surface-dark">
                        {profile.full_name || "Anonymous User"}
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
                          ) : (
                            "Free Tier"
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {isUserPro && !isExpired ? (
                          isTrial ? (
                            <span className="flex items-center gap-1"><Clock size={12} /> Expires: {new Date(profile.pro_expires_at).toLocaleDateString()}</span>
                          ) : (
                            "Lifetime Access"
                          )
                        ) : isExpired ? (
                          <span className="text-red-500">Trial Expired</span>
                        ) : (
                          "Active"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${profile.role === "admin" ? "bg-red-50 text-red-600 border border-red-100" : "bg-gray-100 text-gray-600"}`}>
                          {profile.role === "admin" ? "Admin" : "Student"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={updatingId !== null}
                            onClick={() => setSelectedUser(profile)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <CreditCard size={12} /> Set Plan
                          </button>
                          <button
                            disabled={updatingId !== null}
                            onClick={() => toggleRole(profile.id, profile.role)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Shield size={12} /> {profile.role === "admin" ? "Remove Admin" : "Make Admin"}
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

        {/* System Error & Execution Logs */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
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

        {/* Change Plan / Trial Expiration Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-6 relative border border-gray-100 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-surface-dark flex items-center gap-2">
                    <Sparkles className="text-brand animate-pulse" /> Adjust Access Level
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">For student: {selectedUser.full_name}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Select Target Tier</label>
                  <select
                    value={trialDuration}
                    onChange={(e) => setTrialDuration(e.target.value)}
                    className="block w-full mt-2 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark outline-none cursor-pointer"
                  >
                    <option value="free">Free Tier (Standard Access)</option>
                    <option value="7">Pro Tier: 7 Days Trial</option>
                    <option value="30">Pro Tier: 30 Days Access</option>
                    <option value="lifetime">Pro Tier: Lifetime Access</option>
                  </select>
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
                    className="flex-1 py-2.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-hover cursor-pointer"
                  >
                    Apply Changes
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
