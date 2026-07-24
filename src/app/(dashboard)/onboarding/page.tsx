"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, ChevronRight, ChevronLeft, GraduationCap, Clock, Award, Sparkles, BookOpen, Loader2 } from "lucide-react";

const POPULAR_COURSES = [
  { name: "AP Calculus", color: "#4F46E5" },
  { name: "AP Chemistry", color: "#06B6D4" },
  { name: "AP Biology", color: "#10B981" },
  { name: "AP Physics", color: "#EF4444" },
  { name: "AP US History", color: "#F59E0B" },
  { name: "English Literature", color: "#EC4899" },
  { name: "SAT Math Prep", color: "#8B5CF6" },
  { name: "SAT Reading Prep", color: "#3B82F6" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1 Form Data
  const [learningStyles, setLearningStyles] = useState<string[]>(["visual"]);
  const [dailyGoal, setDailyGoal] = useState("60");

  // Step 2 Form Data
  const [selectedCourses, setSelectedCourses] = useState<any[]>([]);
  const [customCourse, setCustomCourse] = useState("");

  // Step 3 Form Data
  const [streakCommitment, setStreakCommitment] = useState("30");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data?.has_onboarded) {
        router.push("/dashboard");
        return;
      }
      setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, [router, supabase]);

  const toggleCourseSelection = (course: any) => {
    if (selectedCourses.some(c => c.name === course.name)) {
      setSelectedCourses(selectedCourses.filter(c => c.name !== course.name));
    } else {
      setSelectedCourses([...selectedCourses, course]);
    }
  };

  const handleAddCustomCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCourse.trim()) return;
    const colors = ["#4F46E5", "#06B6D4", "#10B981", "#EF4444", "#F59E0B", "#EC4899", "#8B5CF6"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newCourse = { name: customCourse.trim(), color: randomColor };
    if (!selectedCourses.some(c => c.name === newCourse.name)) {
      setSelectedCourses([...selectedCourses, newCourse]);
    }
    setCustomCourse("");
  };

  const handleCompleteOnboarding = async () => {
    setSaving(true);
    // 1. Insert selected courses
    if (selectedCourses.length > 0) {
      const coursesToInsert = selectedCourses.map(c => ({
        user_id: profile.id,
        name: c.name,
        color: c.color,
      }));
      await supabase.from("courses").insert(coursesToInsert);
    }

    // 2. Update profile onboarding state
    const { error } = await supabase
      .from("profiles")
      .update({
        has_onboarded: true,
        daily_study_goal_minutes: parseInt(dailyGoal),
        learning_styles: learningStyles
      })
      .eq("id", profile.id);

    if (!error) {
      router.push("/dashboard");
    } else {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">Personalizing your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-surface-dark">OnPace</span>
        </div>
        
        {/* Progress Bar */}
        <div className="max-w-xs mx-auto bg-gray-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-brand h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-3xl sm:px-10 space-y-6">
          
          {/* Step 1: Learning Style & Goals */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-surface-dark flex items-center justify-center sm:justify-start gap-2">
                  <Clock className="text-brand shrink-0" /> Set your pace
                </h2>
                <p className="text-sm text-gray-500 mt-1">First, let's understand your study style and goals.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    What are your learning styles? <span className="text-xs text-gray-400 font-normal">(Select all that apply)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { val: "visual", label: "👁️ Visual (Images/Diagrams)" },
                      { val: "auditory", label: "🎧 Auditory (Lectures/Podcasts)" },
                      { val: "reading", label: "📖 Reading & Writing notes" },
                      { val: "kinesthetic", label: "✍️ Kinesthetic (Hands-on problem solving)" },
                    ].map(style => {
                      const isSelected = learningStyles.includes(style.val);
                      return (
                        <button
                          key={style.val}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setLearningStyles(learningStyles.filter(s => s !== style.val));
                            } else {
                              setLearningStyles([...learningStyles, style.val]);
                            }
                          }}
                          className={`p-3.5 border rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                            isSelected ? "bg-brand/10 border-brand text-brand font-bold shadow-xs" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {style.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="dailyGoal" className="block text-sm font-semibold text-gray-700">Daily Study Target</label>
                  <select
                    id="dailyGoal"
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(e.target.value)}
                    className="block w-full mt-2 px-3 py-3 border border-gray-200 rounded-xl sm:text-sm bg-white text-surface-dark outline-none cursor-pointer"
                  >
                    <option value="30">0.5 Hour (30 mins / day)</option>
                    <option value="60">1 Hour (60 mins / day - Standard)</option>
                    <option value="120">2 Hours (120 mins / day - AP Target)</option>
                    <option value="240">4 Hours (240 mins / day - Intense)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Course Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-surface-dark flex items-center justify-center sm:justify-start gap-2">
                  <BookOpen className="text-brand shrink-0" /> Select your subjects
                </h2>
                <p className="text-sm text-gray-500 mt-1">Which courses are you pacing this semester? Select at least one.</p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border border-gray-50 rounded-xl bg-gray-50/50">
                  {POPULAR_COURSES.map(course => {
                    const isSelected = selectedCourses.some(c => c.name === course.name);
                    return (
                      <button
                        key={course.name}
                        onClick={() => toggleCourseSelection(course)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${isSelected ? "bg-brand text-white border-brand shadow-sm" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                      >
                        {course.name}
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleAddCustomCourse} className="flex gap-2">
                  <input
                    type="text"
                    value={customCourse}
                    onChange={(e) => setCustomCourse(e.target.value)}
                    placeholder="Add a custom course, e.g. SAT Chemistry"
                    className="flex-1 px-4 py-3 border border-gray-200 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-surface-dark"
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer"
                  >
                    Add
                  </button>
                </form>

                {selectedCourses.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Selected Courses</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCourses.map(course => (
                        <span
                          key={course.name}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: course.color }}
                        >
                          {course.name}
                          <button
                            onClick={() => setSelectedCourses(selectedCourses.filter(c => c.name !== course.name))}
                            className="hover:opacity-80 font-bold"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Commitment */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-surface-dark flex items-center justify-center sm:justify-start gap-2">
                  <Award className="text-brand shrink-0" /> Commit to OnPace
                </h2>
                <p className="text-sm text-gray-500 mt-1">Streaks keep you motivated. Choose your streak target commitment.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: "7", label: "7 Days" },
                    { val: "30", label: "30 Days" },
                    { val: "100", label: "100 Days" },
                  ].map(target => (
                    <button
                      key={target.val}
                      onClick={() => setStreakCommitment(target.val)}
                      className={`p-4 border rounded-xl text-center font-bold text-sm transition-all cursor-pointer ${streakCommitment === target.val ? "bg-brand/10 border-brand text-brand" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>

                <div className="bg-brand/5 border border-brand/10 p-5 rounded-2xl flex items-start gap-3 mt-4">
                  <Sparkles className="text-brand shrink-0 mt-0.5" />
                  <div className="text-xs text-brand font-medium">
                    OnPace will help you commit to a <strong>{streakCommitment}-day streak</strong> by sending intelligent suggestions and adaptive tasks to keep you pacing correctly.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-100">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-brand cursor-pointer"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <button
                disabled={step === 2 && selectedCourses.length === 0}
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                disabled={saving}
                onClick={handleCompleteOnboarding}
                className="flex items-center gap-1.5 px-6 py-3 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-hover shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Pacing...
                  </>
                ) : (
                  <>
                    Commit & Finish <Sparkles size={14} />
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
