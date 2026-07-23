"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BrainCircuit,
  Timer,
  CalendarCheck2,
  Sparkles,
  CheckCircle,
  LayoutDashboard,
  Calendar,
  BookOpen,
  CheckSquare,
  Trophy
} from "lucide-react";

export function Hero() {
  // Interactive mock dashboard states inside Hero
  const [mockTaskDone, setMockTaskDone] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerVal, setTimerVal] = useState("25:00");

  const handleStartTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
      setTimerVal("25:00");
    } else {
      setTimerRunning(true);
      setTimerVal("24:59");
    }
  };

  return (
    <section className="relative overflow-hidden bg-surface-secondary pt-24 pb-20 sm:pt-32 sm:pb-28">
      {/* Decorative Gradients */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#EEF2FF] to-brand-light opacity-40 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
      </div>
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="hidden sm:mb-4 sm:flex sm:justify-center">
            <div className="relative rounded-full px-4 py-1 text-xs font-semibold leading-6 text-gray-500 bg-white border border-gray-150 shadow-sm">
              Meet your new AI study assistant. <Link href="/register" className="font-bold text-brand hover:underline">Read more &rarr;</Link>
            </div>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-surface-dark sm:text-6xl leading-tight">
            Stop procrastinating.<br />
            Start staying <span className="text-transparent bg-clip-text bg-gradient-to-tr from-brand to-brand-dark">OnPace.</span>
          </h1>
          
          <p className="mt-4 text-base leading-relaxed text-gray-500 max-w-2xl mx-auto font-medium">
            The smart study productivity platform designed for students. Manage tasks, block distractions, and let AI build your perfect study schedule so you can ace your exams and get your life back.
          </p>
          
          <div className="mt-8 flex items-center justify-center gap-x-4">
            <Link
              href="/register"
              className="rounded-xl bg-brand px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-brand-hover hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#features" className="text-xs font-bold leading-6 text-gray-700 hover:text-brand transition-colors">
              Learn more <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        
        {/* Mock Application Dashboard Preview */}
        <div className="mt-16 flow-root sm:mt-20 max-w-5xl mx-auto">
          <div className="relative -m-2 rounded-3xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-3xl lg:p-4 shadow-sm">
            <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/10 overflow-hidden flex flex-col md:flex-row h-[500px] border border-gray-100">
              
              {/* Mock Sidebar */}
              <aside className="w-16 md:w-48 bg-gray-50 border-r border-gray-100 p-4 flex flex-col justify-between shrink-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="OnPace Logo" width={24} height={24} className="rounded-lg object-contain" />
                    <span className="hidden md:inline text-xs font-bold text-surface-dark">OnPace</span>
                  </div>
                  <nav className="space-y-1">
                    <div className="flex items-center gap-2.5 px-2.5 py-2 text-brand bg-brand-light/35 rounded-lg text-xs font-bold">
                      <LayoutDashboard size={14} />
                      <span className="hidden md:inline">Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-2.5 py-2 text-gray-500 rounded-lg text-xs font-semibold">
                      <CheckSquare size={14} />
                      <span className="hidden md:inline">Tasks</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-2.5 py-2 text-gray-500 rounded-lg text-xs font-semibold">
                      <Calendar size={14} />
                      <span className="hidden md:inline">Calendar</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-2.5 py-2 text-gray-500 rounded-lg text-xs font-semibold">
                      <BookOpen size={14} />
                      <span className="hidden md:inline">Study Notes</span>
                    </div>
                  </nav>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-100 rounded-xl">
                  <div className="h-6 w-6 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-[10px] shrink-0">S</div>
                  <span className="hidden md:inline text-[10px] font-bold text-surface-dark truncate">Student</span>
                </div>
              </aside>

              {/* Mock Main Desk Container */}
              <section className="flex-1 bg-surface-secondary p-5 md:p-8 flex flex-col justify-between text-left overflow-hidden">
                
                {/* Mock Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-surface-dark md:text-base">Interactive App Preview</h3>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Click the widgets below to interact with our dashboard elements.</p>
                  </div>
                  <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold rounded-full">Pro Member</span>
                </div>

                {/* Dashboard grid mock layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 flex-1">
                  
                  {/* Left Mock widget: Tasks list */}
                  <div className="bg-white border border-gray-100 p-4.5 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-surface-dark flex items-center gap-1.5"><CheckSquare size={12} className="text-brand" /> Today's Assignments</h4>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Check off mock task to view progress update.</p>
                    </div>

                    <div className="space-y-2">
                      <div 
                        onClick={() => setMockTaskDone(!mockTaskDone)}
                        className="flex items-center gap-2.5 p-2 bg-gray-50 border border-gray-100 hover:border-brand/20 hover:bg-white rounded-xl transition-all cursor-pointer select-none"
                      >
                        <button className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${mockTaskDone ? "bg-brand border-brand text-white" : "bg-white border-gray-300"}`}>
                          {mockTaskDone && <CheckSquare className="h-3 w-3" />}
                        </button>
                        <span className={`text-[11px] font-semibold truncate ${mockTaskDone ? "text-gray-400 line-through" : "text-gray-700"}`}>
                          Finish AP History chapter 4 summary
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 p-2 bg-gray-50 border border-gray-100 rounded-xl opacity-60">
                        <div className="h-4 w-4 rounded border border-gray-300 bg-white" />
                        <span className="text-[11px] font-semibold text-gray-700 truncate">Solve 10 quadratic equation practice items</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                      <Trophy size={10} className="text-brand" /> {mockTaskDone ? "1 of 2 Completed" : "0 of 2 Completed"}
                    </div>
                  </div>

                  {/* Right Mock widget: Focus Pomodoro */}
                  <div className="bg-white border border-gray-100 p-4.5 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between text-center">
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-surface-dark flex items-center gap-1.5"><Timer size={12} className="text-brand" /> Distraction Block</h4>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Click Start to toggle countdown animation.</p>
                    </div>

                    <div className="py-2">
                      <p className={`text-3xl font-extrabold tracking-tight text-surface-dark select-none ${timerRunning ? "animate-pulse text-brand" : ""}`}>{timerVal}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Focus study interval</p>
                    </div>

                    <button 
                      onClick={handleStartTimer}
                      className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                        timerRunning 
                          ? "bg-gray-100 text-gray-500 hover:bg-gray-200" 
                          : "bg-brand text-white hover:bg-brand-hover"
                      }`}
                    >
                      {timerRunning ? "Pause Timer" : "Start Session"}
                    </button>
                  </div>

                </div>

                {/* Bottom Mock widget: AI Study Coach recommendation */}
                <div className="relative overflow-hidden bg-gradient-to-tr from-brand/5 to-brand-light/20 border border-brand/10 p-4.5 rounded-2xl mt-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-brand text-white">
                        <Sparkles size={10} fill="white" /> AI Coach
                      </span>
                      <h4 className="text-xs font-bold text-surface-dark leading-snug">Personalized study roadmap recommendation</h4>
                      <p className="text-[10px] text-gray-600 max-w-xl">
                        "Based on your <strong>AP History</strong> test schedule next Tuesday, we recommend reviewing flashcards generated from notebook summary."
                      </p>
                    </div>
                    <button className="px-3.5 py-2 bg-brand text-white text-[10px] font-bold rounded-lg hover:bg-brand-hover shadow-sm active:scale-95 transition-all cursor-pointer shrink-0">
                      Create Schedule
                    </button>
                  </div>
                </div>

              </section>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
