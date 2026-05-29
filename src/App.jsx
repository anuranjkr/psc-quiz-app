import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail
} from "firebase/auth";
import {
  getDatabase, ref, set, get, onValue, push,
  serverTimestamp, query, orderByChild, limitToLast,
  remove, update
} from "firebase/database";

// ─── Firebase Config ───────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyArFo7B3M7lSfbOzUSycMUsnke8YSck74k",
  authDomain: "psc-quiz-kerala.firebaseapp.com",
  databaseURL: "https://psc-quiz-kerala-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "psc-quiz-kerala",
  storageBucket: "psc-quiz-kerala.firebasestorage.app",
  messagingSenderId: "100637065162",
  appId: "1:100637065162:web:d492ed8ff24718ca215933",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);
const gProvider = new GoogleAuthProvider();

// ─── Constants ─────────────────────────────────────────────
const SUPER_ADMIN = "anuranjkr45@gmail.com";

const DEFAULT_CATS = [
  { id:"ldc",       label:"LDC / LGS",       icon:"📋", color:"#6366f1" },
  { id:"psc",       label:"PSC General",      icon:"🏛️", color:"#8b5cf6" },
  { id:"police",    label:"Police / SI",      icon:"👮", color:"#3b82f6" },
  { id:"science",   label:"Science",          icon:"🔬", color:"#10b981" },
  { id:"history",   label:"History",          icon:"📜", color:"#f59e0b" },
  { id:"geography", label:"Geography",        icon:"🌍", color:"#06b6d4" },
  { id:"current",   label:"Current Affairs",  icon:"📰", color:"#ef4444" },
];

const BUILTIN_Q = [
  { id:"b1",  q:"Kerala formed on?",                qm:"കേരളം രൂപീകരിച്ചത്?",                options:["Nov 1, 1956","Aug 15, 1947","Jan 26, 1950","Nov 1, 1960"],                   answer:0, cat:"ldc",       explanation:"Kerala was formed on November 1, 1956." },
  { id:"b2",  q:"Longest river in Kerala?",         qm:"കേരളത്തിലെ ഏറ്റവും നീളമേറിയ നദി?",  options:["Periyar","Bharathapuzha","Pamba","Chaliyar"],                                answer:1, cat:"ldc",       explanation:"Bharathapuzha (312 km) is the longest river in Kerala." },
  { id:"b3",  q:"Capital of Kerala?",               qm:"കേരളത്തിന്റെ തലസ്ഥാനം?",            options:["Kochi","Kozhikode","Thiruvananthapuram","Thrissur"],                          answer:2, cat:"ldc",       explanation:"Thiruvananthapuram is the capital of Kerala." },
  { id:"b4",  q:"Highest peak in Kerala?",          qm:"കേരളത്തിലെ ഏറ്റവും ഉയർന്ന കൊടുമുടി?", options:["Chembra","Anamudi","Meesapulimala","Agasthyamala"],                      answer:1, cat:"ldc",       explanation:"Anamudi (2695m) is the highest peak." },
  { id:"b5",  q:"Father of Indian Constitution?",   qm:"ഭരണഘടനയുടെ പിതാവ്?",               options:["Nehru","Sardar Patel","BR Ambedkar","Rajendra Prasad"],                       answer:2, cat:"psc",       explanation:"Dr. BR Ambedkar is the Father of the Indian Constitution." },
  { id:"b6",  q:"National game of India?",          qm:"ദേശീയ കായിക വിനോദം?",               options:["Cricket","Football","Hockey","Kabaddi"],                                      answer:2, cat:"psc",       explanation:"Hockey is the national game of India." },
  { id:"b7",  q:"IPC stands for?",                  qm:"IPC-യുടെ പൂർണ്ണ രൂപം?",              options:["Indian Penal Code","Indian Police Code","Indian Penal Court","Indian Public Code"], answer:0, cat:"police", explanation:"IPC - Indian Penal Code, enacted in 1860." },
  { id:"b8",  q:"Chemical symbol of Gold?",         qm:"സ്വർണ്ണത്തിന്റെ രാസ ചിഹ്നം?",       options:["Go","Gd","Au","Ag"],                                                         answer:2, cat:"science",   explanation:"Au comes from Latin 'Aurum'." },
  { id:"b9",  q:"Speed of light?",                  qm:"പ്രകാശ വേഗത?",                        options:["3×10⁸ m/s","3×10⁶ m/s","3×10⁵ m/s","3×10⁴ m/s"],                           answer:0, cat:"science",   explanation:"Speed of light = 3×10⁸ m/s." },
  { id:"b10", q:"Battle of Plassey year?",           qm:"പ്ലാസി യുദ്ധം?",                      options:["1747","1757","1764","1799"],                                                  answer:1, cat:"history",   explanation:"Battle of Plassey was fought in 1757." },
  { id:"b11", q:"Chandrayaan-3 landed in?",         qm:"ചന്ദ്രയാൻ-3 ഇറങ്ങിയ വർഷം?",         options:["2021","2022","2023","2024"],                                                  answer:2, cat:"current",   explanation:"Chandrayaan-3 landed on Moon on August 23, 2023." },
  { id:"b12", q:"Largest state in India by area?",  qm:"ഏറ്റവും വലിയ സംസ്ഥാനം?",             options:["MP","Maharashtra","Rajasthan","UP"],                                          answer:2, cat:"geography", explanation:"Rajasthan is the largest state." },
];

const FORUM_CATS = [
  { id:"general",    label:"General",       icon:"💬", color:"#6366f1" },
  { id:"ldc",        label:"LDC Tips",      icon:"📋", color:"#8b5cf6" },
  { id:"current",    label:"Current",       icon:"📰", color:"#ef4444" },
  { id:"doubt",      label:"Doubts",        icon:"🤔", color:"#f59e0b" },
  { id:"resources",  label:"Resources",     icon:"📚", color:"#10b981" },
  { id:"motivation", label:"Motivation",    icon:"🔥", color:"#06b6d4" },
];

const ICONS = ["📋","🏛️","👮","🔬","📜","🌍","📰","🎯","📚","✏️","🧪","⚖️","💡","🗺️","🏆","📖","🔭","🧮","🏅","📐"];
const COLORS = ["#6366f1","#8b5cf6","#3b82f6","#10b981","#f59e0b","#06b6d4","#ef4444","#ec4899","#84cc16","#f97316"];

const computerAnswer = (q) => Math.random() < 0.65 ? q.answer : (q.answer + 1 + Math.floor(Math.random()*3)) % 4;

const timeAgo = (ts) => {
  const d = Date.now() - ts;
  if (d < 60000) return "now";
  if (d < 3600000) return Math.floor(d/60000)+"m ago";
  if (d < 86400000) return Math.floor(d/3600000)+"h ago";
  return Math.floor(d/86400000)+"d ago";
};

// ─── Gemini AI Quiz Generator Component ────────────────────
function GeminiQuizGenerator({ db, categories, user, showNotif }) {
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [topic, setTopic] = useState("");
  const [targetCat, setTargetCat] = useState("ldc");
  const [qCount, setQCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [includeMalayalam, setIncludeMalayalam] = useState(false);
  const [generatedQs, setGeneratedQs] = useState([]);
  const [genStatus, setGenStatus] = useState("idle"); // idle | loading | done | error
  const [genMsg, setGenMsg] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [editingIdx, setEditingIdx] = useState(null);
  const [editQ, setEditQ] = useState(null);
  const [savedKey, setSavedKey] = useState(!!localStorage.getItem("gemini_api_key"));

  const saveKey = () => {
    localStorage.setItem("gemini_api_key", geminiKey.trim());
    setSavedKey(true);
    showNotif("🔑 API Key saved!");
  };

  const clearKey = () => {
    localStorage.removeItem("gemini_api_key");
    setGeminiKey("");
    setSavedKey(false);
    showNotif("Key cleared.", "error");
  };

  const generateQuiz = async () => {
    const key = geminiKey.trim();
    if (!key) { setGenMsg("❌ Gemini API Key ഇടൂ!"); return; }
    if (!topic.trim()) { setGenMsg("❌ Topic ഇടൂ!"); return; }

    setGenStatus("loading");
    setGenMsg("🤖 Gemini generating questions...");
    setGeneratedQs([]);

    const malayalamInstruction = includeMalayalam
      ? `Also provide a Malayalam translation of the question in the "qm" field.`
      : `Leave "qm" as empty string "".`;

    const prompt = `You are an expert quiz creator for Kerala PSC (Public Service Commission) exams.

Generate exactly ${qCount} multiple choice questions about the topic: "${topic}"
Difficulty level: ${difficulty}
Category: ${categories.find(c => c.id === targetCat)?.label || targetCat}

Requirements:
- Questions must be relevant to Kerala PSC exam preparation
- Each question must have exactly 4 options
- Only ONE correct answer per question
- Include a clear explanation for the correct answer
- Questions should be factually accurate
- ${malayalamInstruction}
- Vary question types (who/what/when/where/why/how)

Respond with ONLY a valid JSON array. No markdown, no backticks, no preamble. Example format:
[
  {
    "q": "Question text in English",
    "qm": "ചോദ്യം മലയാളത്തിൽ",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanation": "Explanation why this is correct"
  }
]

The "answer" field must be 0, 1, 2, or 3 (index of correct option in options array).
Generate ${qCount} questions now:`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            }
          })
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Clean and parse JSON
      let cleaned = rawText.trim();
      // Remove markdown code blocks if present
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      // Extract JSON array
      const arrMatch = cleaned.match(/\[[\s\S]*\]/);
      if (!arrMatch) throw new Error("No JSON array found in response");

      const parsed = JSON.parse(arrMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Empty or invalid questions array");

      // Validate and normalize each question
      const normalized = parsed.map((q, i) => ({
        q: q.q || `Question ${i + 1}`,
        qm: q.qm || "",
        options: Array.isArray(q.options) && q.options.length === 4
          ? q.options.map(o => String(o))
          : ["Option A", "Option B", "Option C", "Option D"],
        answer: typeof q.answer === "number" && q.answer >= 0 && q.answer <= 3 ? q.answer : 0,
        explanation: q.explanation || "",
        cat: targetCat,
        _selected: true,
      }));

      setGeneratedQs(normalized);
      setGenStatus("done");
      setGenMsg(`✅ ${normalized.length} questions generated!`);
    } catch (e) {
      setGenStatus("error");
      setGenMsg(`❌ Error: ${e.message}`);
    }
  };

  const toggleSelect = (idx) => {
    setGeneratedQs(prev => prev.map((q, i) => i === idx ? { ...q, _selected: !q._selected } : q));
  };

  const selectAll = () => setGeneratedQs(prev => prev.map(q => ({ ...q, _selected: true })));
  const deselectAll = () => setGeneratedQs(prev => prev.map(q => ({ ...q, _selected: false })));

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditQ({ ...generatedQs[idx] });
  };

  const saveEdit = () => {
    setGeneratedQs(prev => prev.map((q, i) => i === editingIdx ? { ...editQ } : q));
    setEditingIdx(null);
    setEditQ(null);
    showNotif("✏️ Question updated!");
  };

  const removeQ = (idx) => {
    setGeneratedQs(prev => prev.filter((_, i) => i !== idx));
    showNotif("Question removed.", "error");
  };

  const uploadSelected = async () => {
    const toUpload = generatedQs.filter(q => q._selected);
    if (!toUpload.length) { showNotif("❌ Select at least one question!", "error"); return; }
    setUploadStatus(`⏳ Uploading ${toUpload.length} questions...`);
    let count = 0;
    for (const q of toUpload) {
      const { _selected, ...qData } = q;
      await push(ref(db, "questions"), {
        ...qData,
        addedBy: user.email,
        addedAt: serverTimestamp(),
        source: "gemini_ai",
        topic: topic,
      });
      count++;
    }
    setUploadStatus(`✅ ${count} questions uploaded to Firebase!`);
    showNotif(`🎉 ${count} AI questions uploaded!`);
    setGeneratedQs(prev => prev.filter(q => !q._selected));
    setTimeout(() => setUploadStatus(""), 4000);
  };

  const Inp = { width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 14px", color:"#e2e8f0", fontSize:13, marginBottom:10, fontFamily:"inherit", outline:"none" };
  const Sel = { ...Inp, background:"#0f0f1e" };
  const card = (ex={}) => ({ background:"rgba(255,255,255,0.045)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, ...ex });
  const glass = (ex={}) => ({ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, ...ex });
  const Btn = (bg, col="#fff", ex={}) => ({ background:bg, color:col, border:"none", borderRadius:12, padding:"12px 16px", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", transition:"all 0.2s", ...ex });

  const selectedCount = generatedQs.filter(q => q._selected).length;

  return (
    <div>
      {/* Header Banner */}
      <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.15),rgba(6,182,212,0.1))", border:"1px solid rgba(16,185,129,0.25)", borderRadius:16, padding:"16px 18px", marginBottom:14, display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:52, height:52, background:"linear-gradient(135deg,#10b981,#06b6d4)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>🤖</div>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:"#6ee7b7", marginBottom:2 }}>Gemini AI Quiz Generator</div>
          <div style={{ fontSize:11, color:"#475569", lineHeight:1.4 }}>Topic നൽകൂ → AI automatically MCQ questions create ചെയ്യും → Firebase-ലേക്ക് upload ചെയ്യൂ!</div>
        </div>
      </div>

      {/* API Key Section */}
      <div style={{ ...card(), padding:14, marginBottom:12, borderLeft:"3px solid #f59e0b" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <span style={{ fontSize:14 }}>🔑</span>
          <span style={{ fontWeight:700, color:"#fbbf24", fontSize:13 }}>Gemini API Key</span>
          {savedKey && <span style={{ fontSize:10, background:"rgba(16,185,129,0.15)", color:"#10b981", padding:"2px 8px", borderRadius:20, fontWeight:700 }}>✅ Saved</span>}
        </div>
        <div style={{ fontSize:11, color:"#64748b", marginBottom:8 }}>
          Get free key: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color:"#6366f1" }}>aistudio.google.com/apikey</a>
        </div>
        <input
          value={geminiKey}
          onChange={e => setGeminiKey(e.target.value)}
          placeholder="AIzaSy..."
          type="password"
          style={{ ...Inp, marginBottom:8, fontFamily:"monospace" }}
        />
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={saveKey} style={{ ...Btn("linear-gradient(135deg,#f59e0b,#fbbf24)", "#000"), flex:1, padding:"9px 0", fontSize:12 }}>💾 Save Key</button>
          {savedKey && <button onClick={clearKey} style={{ ...Btn("rgba(239,68,68,0.15)", "#ef4444"), padding:"9px 14px", fontSize:12 }}>🗑️</button>}
        </div>
      </div>

      {/* Generator Form */}
      <div style={{ ...card(), padding:14, marginBottom:12, borderLeft:"3px solid #10b981" }}>
        <div style={{ fontWeight:700, color:"#10b981", marginBottom:12, fontSize:13 }}>⚙️ Generator Settings</div>

        <label style={{ fontSize:11, color:"#64748b", fontWeight:600, display:"block", marginBottom:5 }}>Topic / Subject *</label>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. Kerala History, Indian Constitution, General Science..."
          style={Inp}
        />

        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, color:"#64748b", fontWeight:600, display:"block", marginBottom:5 }}>Category</label>
            <select value={targetCat} onChange={e => setTargetCat(e.target.value)} style={{ ...Sel, marginBottom:0 }}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, color:"#64748b", fontWeight:600, display:"block", marginBottom:5 }}>No. of Questions</label>
            <select value={qCount} onChange={e => setQCount(Number(e.target.value))} style={{ ...Sel, marginBottom:0 }}>
              {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n} Questions</option>)}
            </select>
          </div>
        </div>

        <label style={{ fontSize:11, color:"#64748b", fontWeight:600, display:"block", marginBottom:6 }}>Difficulty</label>
        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          {[["easy","🟢 Easy","#10b981"],["medium","🟡 Medium","#f59e0b"],["hard","🔴 Hard","#ef4444"]].map(([v,l,c]) => (
            <button key={v} onClick={() => setDifficulty(v)} style={{ flex:1, padding:"8px 0", background:difficulty===v?`${c}25`:"rgba(255,255,255,0.05)", border:`1.5px solid ${difficulty===v?c:"rgba(255,255,255,0.1)"}`, borderRadius:10, color:difficulty===v?c:"#64748b", cursor:"pointer", fontWeight:700, fontSize:12, transition:"all 0.2s" }}>{l}</button>
          ))}
        </div>

        {/* Malayalam toggle */}
        <button
          onClick={() => setIncludeMalayalam(!includeMalayalam)}
          style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", background:includeMalayalam?"rgba(99,102,241,0.12)":"rgba(255,255,255,0.04)", border:`1.5px solid ${includeMalayalam?"#6366f1":"rgba(255,255,255,0.1)"}`, borderRadius:12, cursor:"pointer", marginBottom:14, transition:"all 0.2s" }}
        >
          <div style={{ width:38, height:22, borderRadius:11, background:includeMalayalam?"#6366f1":"rgba(255,255,255,0.1)", position:"relative", transition:"all 0.2s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:3, left:includeMalayalam?18:3, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"all 0.2s" }}/>
          </div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:13, fontWeight:700, color:includeMalayalam?"#a5b4fc":"#64748b" }}>🔤 Include Malayalam Translation</div>
            <div style={{ fontSize:10, color:"#475569" }}>Questions-ൽ Malayalam text കൂടി add ചെയ്യും</div>
          </div>
        </button>

        {genMsg && (
          <div style={{ fontSize:13, marginBottom:10, padding:"10px 12px", borderRadius:10, background:genStatus==="done"?"rgba(16,185,129,0.1)":genStatus==="error"?"rgba(239,68,68,0.1)":"rgba(99,102,241,0.1)", color:genStatus==="done"?"#10b981":genStatus==="error"?"#ef4444":"#a5b4fc", border:`1px solid ${genStatus==="done"?"rgba(16,185,129,0.2)":genStatus==="error"?"rgba(239,68,68,0.2)":"rgba(99,102,241,0.2)"}` }}>
            {genMsg}
          </div>
        )}

        <button
          onClick={generateQuiz}
          disabled={genStatus === "loading"}
          style={{ ...Btn("linear-gradient(135deg,#10b981,#06b6d4)"), width:"100%", padding:14, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:genStatus==="loading"?0.7:1 }}
        >
          {genStatus === "loading" ? (
            <>
              <span style={{ display:"inline-block", animation:"spin 1s linear infinite" }}>⚙️</span>
              <span>Generating...</span>
            </>
          ) : (
            <>🤖 Generate {qCount} Questions with AI</>
          )}
        </button>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* Generated Questions Preview */}
      {generatedQs.length > 0 && (
        <div>
          {/* Toolbar */}
          <div style={{ ...glass(), padding:"10px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <div style={{ flex:1, fontSize:13, fontWeight:700, color:"#e2e8f0" }}>
              📋 {generatedQs.length} Questions
              <span style={{ color:"#10b981", marginLeft:6, fontSize:12 }}>{selectedCount} selected</span>
            </div>
            <button onClick={selectAll} style={{ ...Btn("rgba(99,102,241,0.15)", "#a5b4fc"), padding:"6px 10px", fontSize:11 }}>☑️ All</button>
            <button onClick={deselectAll} style={{ ...Btn("rgba(255,255,255,0.06)", "#64748b"), padding:"6px 10px", fontSize:11 }}>☐ None</button>
          </div>

          {/* Questions List */}
          {generatedQs.map((q, idx) => (
            <div key={idx} style={{ ...card(), padding:12, marginBottom:8, borderLeft:`3px solid ${q._selected?"#10b981":"#334155"}`, opacity:q._selected?1:0.5, transition:"all 0.2s" }}>
              {editingIdx === idx ? (
                // Edit Mode
                <div>
                  <div style={{ fontSize:11, color:"#6366f1", fontWeight:700, marginBottom:8 }}>✏️ Editing Q{idx+1}</div>
                  <input value={editQ.q} onChange={e => setEditQ({...editQ, q:e.target.value})} placeholder="Question (English)" style={{ ...Inp, fontSize:12 }}/>
                  <input value={editQ.qm} onChange={e => setEditQ({...editQ, qm:e.target.value})} placeholder="Question (Malayalam) — Optional" style={{ ...Inp, fontSize:12 }}/>
                  {editQ.options.map((opt, oi) => (
                    <input key={oi} value={opt} onChange={e => { const newOpts=[...editQ.options]; newOpts[oi]=e.target.value; setEditQ({...editQ,options:newOpts}); }} placeholder={`Option ${["A","B","C","D"][oi]}`} style={{ ...Inp, fontSize:12, borderColor:editQ.answer===oi?"#10b981":"rgba(255,255,255,0.12)" }}/>
                  ))}
                  <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                    <select value={editQ.answer} onChange={e => setEditQ({...editQ,answer:parseInt(e.target.value)})} style={{ ...Sel, flex:1, marginBottom:0, fontSize:12 }}>
                      <option value={0}>✅ Answer: A</option><option value={1}>✅ Answer: B</option><option value={2}>✅ Answer: C</option><option value={3}>✅ Answer: D</option>
                    </select>
                  </div>
                  <input value={editQ.explanation} onChange={e => setEditQ({...editQ, explanation:e.target.value})} placeholder="Explanation" style={{ ...Inp, fontSize:12 }}/>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={saveEdit} style={{ ...Btn("linear-gradient(135deg,#10b981,#059669)"), flex:1, padding:"9px 0", fontSize:12 }}>✅ Save</button>
                    <button onClick={() => {setEditingIdx(null);setEditQ(null);}} style={{ ...Btn("rgba(255,255,255,0.06)", "#94a3b8"), flex:1, padding:"9px 0", fontSize:12 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                    <button onClick={() => toggleSelect(idx)} style={{ width:20, height:20, borderRadius:6, background:q._selected?"#10b981":"rgba(255,255,255,0.06)", border:`1.5px solid ${q._selected?"#10b981":"rgba(255,255,255,0.2)"}`, cursor:"pointer", flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>
                      {q._selected?"✓":""}
                    </button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:4, lineHeight:1.5 }}>
                        <span style={{ color:"#6366f1", marginRight:5 }}>Q{idx+1}.</span>{q.q}
                      </div>
                      {q.qm && <div style={{ fontSize:11, color:"#64748b", marginBottom:5 }}>{q.qm}</div>}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:5 }}>
                        {q.options.map((opt, oi) => (
                          <span key={oi} style={{ fontSize:10, padding:"3px 9px", borderRadius:8, background:oi===q.answer?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.05)", color:oi===q.answer?"#10b981":"#64748b", border:`1px solid ${oi===q.answer?"rgba(16,185,129,0.35)":"rgba(255,255,255,0.08)"}`, fontWeight:oi===q.answer?700:400 }}>
                            {["A","B","C","D"][oi]}: {opt} {oi===q.answer?"✅":""}
                          </span>
                        ))}
                      </div>
                      {q.explanation && <div style={{ fontSize:10, color:"#64748b", background:"rgba(245,158,11,0.06)", borderRadius:6, padding:"4px 8px", borderLeft:"2px solid #f59e0b" }}>💡 {q.explanation}</div>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0 }}>
                      <button onClick={() => startEdit(idx)} style={{ ...Btn("rgba(99,102,241,0.15)", "#a5b4fc"), padding:"5px 8px", fontSize:11 }}>✏️</button>
                      <button onClick={() => removeQ(idx)} style={{ ...Btn("rgba(239,68,68,0.1)", "#ef4444"), padding:"5px 8px", fontSize:11 }}>🗑️</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Upload Section */}
          <div style={{ ...card(), padding:14, marginTop:6, borderLeft:"3px solid #6366f1" }}>
            {uploadStatus && (
              <div style={{ fontSize:13, marginBottom:10, padding:"10px 12px", borderRadius:10, background:uploadStatus.includes("✅")?"rgba(16,185,129,0.1)":"rgba(99,102,241,0.1)", color:uploadStatus.includes("✅")?"#10b981":"#a5b4fc" }}>
                {uploadStatus}
              </div>
            )}
            <button
              onClick={uploadSelected}
              disabled={selectedCount === 0}
              style={{ ...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width:"100%", padding:14, fontSize:14, opacity:selectedCount===0?0.5:1 }}
            >
              🚀 Upload {selectedCount} Selected Questions to Firebase
            </button>
            <div style={{ fontSize:10, color:"#475569", textAlign:"center", marginTop:6 }}>
              Category: {categories.find(c=>c.id===targetCat)?.icon} {categories.find(c=>c.id===targetCat)?.label} • Source: Gemini AI
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {genStatus === "idle" && generatedQs.length === 0 && (
        <div style={{ ...glass(), padding:36, textAlign:"center", color:"#475569" }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🤖</div>
          <p style={{ fontSize:13, color:"#475569", lineHeight:1.5 }}>Topic ഇട്ട് Generate ചെയ്യൂ!<br/><span style={{ fontSize:11 }}>Gemini AI automatically MCQ questions create ചെയ്യും.</span></p>
        </div>
      )}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────
export default function App() {
  // Auth
  const [screen, setScreen] = useState("splash");
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [dn, setDn] = useState("");
  const [authErr, setAuthErr] = useState(""); const [authMsg, setAuthMsg] = useState("");

  // Data
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [fbQ, setFbQ] = useState([]);
  const [allQ, setAllQ] = useState(BUILTIN_Q);
  const [pendingQ, setPendingQ] = useState([]);
  const [myContribs, setMyContribs] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [activeMembers, setActiveMembers] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState({});

  // Quiz
  const [selCat, setSelCat] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizCount, setQuizCount] = useState(10);
  const [curr, setCurr] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef(null);

  // Battle
  const [battleType, setBattleType] = useState("1v1");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [roomErr, setRoomErr] = useState("");
  const [battleQ, setBattleQ] = useState([]);
  const [battleCurr, setBattleCurr] = useState(0);
  const [battlePicked, setBattlePicked] = useState(null);
  const [battleScore, setBattleScore] = useState(0);
  const [battleTimer, setBattleTimer] = useState(20);
  const [battleStarted, setBattleStarted] = useState(false);
  const battleTimerRef = useRef(null);
  const battleStartedRef = useRef(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatMsgs, setChatMsgs] = useState([]);
  const chatEndRef = useRef(null);

  // Forum
  const [forumPosts, setForumPosts] = useState([]);
  const [forumMsg, setForumMsg] = useState("");
  const [forumCat, setForumCat] = useState("general");
  const [forumFilter, setForumFilter] = useState("all");
  const forumEndRef = useRef(null);

  // Admin
  const [adminTab, setAdminTab] = useState("pending");
  const [newCat, setNewCat] = useState({ label:"", icon:"📋", color:"#6366f1" });
  const [newQ, setNewQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:"" });
  const [addQStatus, setAddQStatus] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState(""); const [adminStatus, setAdminStatus] = useState("");
  const [sheetId, setSheetId] = useState(""); const [sheetStatus, setSheetStatus] = useState("idle"); const [sheetCat, setSheetCat] = useState("ldc");
  const [bulkText, setBulkText] = useState(""); const [bulkCat, setBulkCat] = useState("ldc");
  const [bulkPreview, setBulkPreview] = useState([]); const [bulkStatus, setBulkStatus] = useState("");

  // Contribute
  const [cQ, setCQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:"" });
  const [cStatus, setCStatus] = useState("");

  // Notification
  const [notif, setNotif] = useState(null);
  const showNotif = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };

  // ── Auth listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const superA = u.email === SUPER_ADMIN;
        setIsSuperAdmin(superA);
        const adminSnap = await get(ref(db, `adminEmails/${u.email.replace(/\./g,"_")}`));
        const admin = superA || adminSnap.exists();
        setIsAdmin(admin);
        set(ref(db,`online/${u.uid}`), { name:u.displayName||u.email, time:Date.now() });
        loadData(u.uid, admin);
        setScreen("home");
      } else {
        setUser(null); setIsAdmin(false); setIsSuperAdmin(false);
        setTimeout(() => setScreen("auth"), 1500);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => { setAllQ([...BUILTIN_Q, ...fbQ]); }, [fbQ]);
  useEffect(() => { forumEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [forumPosts]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs]);

  const loadData = (uid, admin) => {
    onValue(ref(db,"questions"), snap => {
      const qs = []; if(snap.exists()) snap.forEach(c => qs.push({id:c.key,...c.val()}));
      setFbQ(qs);
    });
    onValue(ref(db,"categories"), snap => {
      if(snap.exists()) { const cs=[]; snap.forEach(c=>cs.push({id:c.key,...c.val()})); setCategories([...DEFAULT_CATS,...cs]); }
      else setCategories(DEFAULT_CATS);
    });
    const lbQ = query(ref(db,"leaderboard"), orderByChild("score"), limitToLast(20));
    onValue(lbQ, snap => {
      if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setLeaderboard(d.reverse()); }
    });
    onValue(ref(db,`users/${uid}/stats`), snap => { if(snap.exists()) setMyStats(snap.val()); });
    onValue(ref(db,`users/${uid}/contributions`), snap => {
      if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setMyContribs(d); }
    });
    onValue(ref(db,"online"), snap => { setActiveMembers(snap.exists() ? snap.size : 0); });
    const fQ = query(ref(db,"forum"), orderByChild("time"), limitToLast(200));
    onValue(fQ, snap => {
      if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setForumPosts(d); }
      else setForumPosts([]);
    });
    if(admin) {
      onValue(ref(db,"pending_questions"), snap => {
        const d=[]; if(snap.exists()) snap.forEach(c=>d.push({id:c.key,...c.val()})); setPendingQ(d);
      });
      onValue(ref(db,"adminEmails"), snap => {
        if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({key:c.key,email:c.key.replace(/_/g,".")})); setAdminList(d); }
      });
    }
  };

  // ── Auth functions ──
  const loginGoogle = async () => {
    setAuthLoading(true); setAuthErr(""); setAuthMsg("");
    try { await signInWithPopup(auth, gProvider); }
    catch(e) { setAuthErr("Google login failed. Try again!"); }
    setAuthLoading(false);
  };

  const loginEmail = async () => {
    setAuthLoading(true); setAuthErr(""); setAuthMsg("");
    try {
      if(authMode === "register") {
        if(!dn.trim()) { setAuthErr("Name ഇടൂ!"); setAuthLoading(false); return; }
        if(pw.length < 6) { setAuthErr("Password minimum 6 characters!"); setAuthLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, em, pw);
        await updateProfile(cred.user, { displayName: dn });
        await set(ref(db,`users/${cred.user.uid}/profile`), { name:dn, email:em, createdAt:Date.now() });
      } else {
        await signInWithEmailAndPassword(auth, em, pw);
      }
    } catch(e) {
      if(e.code==="auth/wrong-password"||e.code==="auth/invalid-credential") setAuthErr("❌ Password തെറ്റ്!");
      else if(e.code==="auth/user-not-found") setAuthErr("❌ User ഇല്ല! Register ചെയ്യൂ.");
      else if(e.code==="auth/email-already-in-use") setAuthErr("❌ Email already registered!");
      else if(e.code==="auth/invalid-email") setAuthErr("❌ Valid email ഇടൂ!");
      else setAuthErr("❌ " + (e.message || "Error occurred"));
    }
    setAuthLoading(false);
  };

  const forgotPassword = async () => {
    if(!em.trim()) { setAuthErr("Email ആദ്യം ഇടൂ!"); return; }
    try {
      await sendPasswordResetEmail(auth, em.trim());
      setAuthMsg("✅ Reset email sent! Inbox check ചെയ്യൂ.");
      setAuthErr("");
    } catch { setAuthErr("❌ Email കണ്ടില്ല!"); }
  };

  const logout = async () => {
    if(user) await remove(ref(db,`online/${user.uid}`));
    await signOut(auth);
    setScreen("splash");
    setTimeout(() => setScreen("auth"), 500);
  };

  // ── Quiz Timer ──
  useEffect(() => {
    if(screen !== "quiz" || picked !== null) return;
    setTimer(30); clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(t => { if(t<=1) { clearInterval(timerRef.current); handleAns(-1); return 0; } return t-1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [curr, screen]);

  // ── Battle Timer ──
  useEffect(() => {
    if(screen !== "battle" || !battleStarted || battlePicked !== null || battleQ.length === 0) return;
    setBattleTimer(20); clearInterval(battleTimerRef.current);
    battleTimerRef.current = setInterval(() => {
      setBattleTimer(t => { if(t<=1) { clearInterval(battleTimerRef.current); handleBattleAns(-1); return 0; } return t-1; });
    }, 1000);
    return () => clearInterval(battleTimerRef.current);
  }, [battleCurr, battleStarted, screen]);

  // ── Room Status Listener ──
  useEffect(() => {
    if(!roomCode) return;
    battleStartedRef.current = false;
    const unsub = onValue(ref(db,`rooms/${roomCode}`), snap => {
      if(!snap.exists()) return;
      const room = snap.val();
      setRoomData(room);
      if(room.status === "playing" && !battleStartedRef.current) {
        battleStartedRef.current = true;
        if(room.questions) setBattleQ(Object.values(room.questions));
        setBattleCurr(0); setBattlePicked(null); setBattleScore(0); setBattleStarted(true);
        setScreen("battle");
      }
    });
    const chatUnsub = onValue(ref(db,`rooms/${roomCode}/chat`), snap => {
      if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setChatMsgs(d); }
    });
    return () => { unsub(); chatUnsub(); };
  }, [roomCode]);

  // ── Quiz Functions ──
  const startQuiz = (cat) => {
    const pool = cat === "mock" ? [...allQ] : allQ.filter(q => q.cat === cat);
    const qs = pool.sort(() => Math.random()-0.5).slice(0, quizCount);
    if(!qs.length) { showNotif("Questions ഇല്ല! Admin-ൽ add ചെയ്യൂ.", "error"); return; }
    setSelCat(cat); setQuestions(qs); setCurr(0); setPicked(null); setScore(0); setAnswers([]);
    setScreen("quiz");
  };

  const handleAns = (i) => {
    if(picked !== null) return;
    clearInterval(timerRef.current);
    setPicked(i);
    const q = questions[curr];
    const ok = i === q.answer;
    if(ok) setScore(s => s+1);
    setAnswers(a => [...a, {q, sel:i, ok}]);
  };

  const nextQ = async () => {
    if(curr+1 >= questions.length) { await saveResult(); setScreen("result"); return; }
    setCurr(c => c+1); setPicked(null);
  };

  const saveResult = async () => {
    if(!user) return;
    const fs = answers.filter(a => a.ok).length;
    const catLabel = categories.find(c=>c.id===selCat)?.label || selCat || "Mock";
    await push(ref(db,"leaderboard"), {
      uid:user.uid, name:user.displayName||user.email.split("@")[0],
      score:fs, total:questions.length, category:selCat||"mock",
      categoryLabel:catLabel, accuracy:Math.round((fs/questions.length)*100),
      timestamp:serverTimestamp()
    });
    const sRef = ref(db,`users/${user.uid}/stats/${selCat||"mock"}`);
    const snap = await get(sRef);
    const prev = snap.exists() ? snap.val() : {attempts:0,correct:0,best:0};
    await set(sRef, { attempts:prev.attempts+1, correct:prev.correct+fs, best:Math.max(prev.best||0,fs) });
  };

  // ── Battle Functions ──
  const createRoom = async () => {
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    const maxP = battleType === "multi" ? 100 : 2;
    const qs = [...allQ].sort(()=>Math.random()-0.5).slice(0, quizCount);
    await set(ref(db,`rooms/${code}`), {
      host:user.displayName||user.email, hostUid:user.uid,
      code, type:battleType, status:"waiting", maxPlayers:maxP,
      createdAt:serverTimestamp(),
      questions:Object.fromEntries(qs.map((q,i)=>[i,{q:q.q,options:q.options,answer:q.answer,explanation:q.explanation||""}])),
      players:{ [user.uid]:{ name:user.displayName||user.email, score:0, avatar:(user.displayName||"U")[0].toUpperCase() } }
    });
    setRoomCode(code);
    setBattleQ(qs);
    setScreen("room");
  };

  const joinRoom = async () => {
    const code = joinCode.toUpperCase().trim();
    if(!code) return;
    const snap = await get(ref(db,`rooms/${code}`));
    if(!snap.exists()) { setRoomErr("❌ Room കണ്ടില്ല!"); return; }
    const room = snap.val();
    const pCount = Object.keys(room.players||{}).length;
    if(pCount >= room.maxPlayers) { setRoomErr("❌ Room full!"); return; }
    await set(ref(db,`rooms/${code}/players/${user.uid}`), {
      name:user.displayName||user.email, score:0, avatar:(user.displayName||"U")[0].toUpperCase()
    });
    setRoomCode(code);
    if(room.questions) setBattleQ(Object.values(room.questions));
    setScreen("room");
  };

  const startBattle = async () => {
    if(!roomCode) return;
    await update(ref(db,`rooms/${roomCode}`), { status:"playing", startedAt:serverTimestamp() });
    battleStartedRef.current = true;
    setBattleCurr(0); setBattlePicked(null); setBattleScore(0); setBattleStarted(true);
    setScreen("battle");
  };

  const handleBattleAns = (i) => {
    if(battlePicked !== null) return;
    clearInterval(battleTimerRef.current);
    setBattlePicked(i);
    const q = battleQ[battleCurr];
    if(!q) return;
    const ok = i === q.answer;
    const newScore = ok ? battleScore+1 : battleScore;
    if(ok) setBattleScore(newScore);
    set(ref(db,`rooms/${roomCode}/players/${user.uid}/score`), newScore);
    if(roomData?.players?.computer) {
      const compOk = computerAnswer(q) === q.answer;
      const curComp = roomData?.players?.computer?.score || 0;
      setTimeout(() => {
        set(ref(db,`rooms/${roomCode}/players/computer/score`), compOk ? curComp+1 : curComp);
      }, 600+Math.random()*1000);
    }
  };

  const nextBattle = () => {
    if(battleCurr+1 >= battleQ.length) { setScreen("battle_result"); return; }
    setBattleCurr(c=>c+1); setBattlePicked(null);
  };

  const sendChat = async () => {
    if(!chatMsg.trim()||!roomCode) return;
    const msg = chatMsg.trim(); setChatMsg("");
    await push(ref(db,`rooms/${roomCode}/chat`), {
      uid:user.uid, name:user.displayName||user.email.split("@")[0],
      msg, time:Date.now()
    });
  };

  // ── Forum Functions ──
  const sendForumMsg = async () => {
    if(!forumMsg.trim()) return;
    const msg = forumMsg.trim(); setForumMsg("");
    await push(ref(db,"forum"), {
      uid:user.uid,
      name:user.displayName||user.email.split("@")[0],
      avatar:(user.displayName||user.email||"U")[0].toUpperCase(),
      msg, category:forumCat, time:Date.now(), likes:0
    });
  };

  const deleteForumPost = async (id) => { await remove(ref(db,`forum/${id}`)); };

  const likePost = async (post) => {
    const key = `liked_${post.id}`;
    if(localStorage.getItem(key)) return;
    localStorage.setItem(key,"1");
    await update(ref(db,`forum/${post.id}`), { likes:(post.likes||0)+1 });
  };

  // ── Contribute ──
  const submitContrib = async () => {
    if(!cQ.q||!cQ.o1||!cQ.o2||!cQ.o3||!cQ.o4) { setCStatus("❌ Fields fill ചെയ്യൂ!"); return; }
    setCStatus("⏳ Submitting...");
    try {
      const r = await push(ref(db,"pending_questions"), {
        q:cQ.q, qm:cQ.qm, options:[cQ.o1,cQ.o2,cQ.o3,cQ.o4],
        answer:parseInt(cQ.answer), cat:cQ.cat, explanation:cQ.explanation,
        submittedBy:user.uid, submittedByName:user.displayName||user.email,
        submittedByEmail:user.email, status:"pending", submittedAt:serverTimestamp()
      });
      await set(ref(db,`users/${user.uid}/contributions/${r.key}`), { q:cQ.q, cat:cQ.cat, status:"pending", submittedAt:Date.now() });
      setCQ({q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:""});
      setCStatus("✅ Submitted! Admin approval-ന് കാത്തിരിക്കൂ.");
      showNotif("Question submitted! 🎉");
    } catch(e) { setCStatus("❌ Error: "+e.message); }
  };

  // ── Admin Functions ──
  const approveQ = async (pq) => {
    try {
      await push(ref(db,"questions"), {
        q:pq.q, qm:pq.qm||"", options:pq.options, answer:pq.answer,
        cat:pq.cat, explanation:pq.explanation||"",
        approvedBy:user.email, approvedAt:serverTimestamp(),
        contributedBy:pq.submittedByName||""
      });
      await remove(ref(db,`pending_questions/${pq.id}`));
      if(pq.submittedBy) await update(ref(db,`users/${pq.submittedBy}/contributions/${pq.id}`), {status:"approved"});
      showNotif("✅ Question approved!");
    } catch(e) { showNotif("Error: "+e.message,"error"); }
  };

  const rejectQ = async (pq) => {
    await remove(ref(db,`pending_questions/${pq.id}`));
    if(pq.submittedBy) await update(ref(db,`users/${pq.submittedBy}/contributions/${pq.id}`), {status:"rejected"});
    showNotif("Question rejected.","error");
  };

  const addDirectQ = async () => {
    if(!newQ.q||!newQ.o1||!newQ.o2||!newQ.o3||!newQ.o4) { setAddQStatus("❌ Fields fill ചെയ്യൂ!"); return; }
    setAddQStatus("⏳ Adding...");
    try {
      await push(ref(db,"questions"), {
        q:newQ.q, qm:newQ.qm||"", options:[newQ.o1,newQ.o2,newQ.o3,newQ.o4],
        answer:parseInt(newQ.answer), cat:newQ.cat, explanation:newQ.explanation||"",
        addedBy:user.email, addedAt:serverTimestamp()
      });
      setNewQ({q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:""});
      setAddQStatus("✅ Added!");
      showNotif("Question added! 🎉");
      setTimeout(()=>setAddQStatus(""),3000);
    } catch(e) { setAddQStatus("❌ Error: "+e.message); }
  };

  const addCategory = async () => {
    if(!newCat.label.trim()) { showNotif("Name ഇടൂ!","error"); return; }
    const id = newCat.label.toLowerCase().replace(/[^a-z0-9]/g,"_")+"_"+Date.now();
    await set(ref(db,`categories/${id}`), { label:newCat.label, icon:newCat.icon, color:newCat.color, createdAt:serverTimestamp() });
    setNewCat({label:"",icon:"📋",color:"#6366f1"});
    showNotif(`"${newCat.label}" added! 🎉`);
  };

  const deleteCat = async (id) => {
    if(!window.confirm("Delete this category?")) return;
    await remove(ref(db,`categories/${id}`));
    showNotif("Category deleted!","error");
  };

  const deleteQ = async (id) => {
    if(!window.confirm("Delete this question?")) return;
    await remove(ref(db,`questions/${id}`));
    showNotif("Question deleted!","error");
  };

  const addAdmin = async () => {
    if(!newAdminEmail.trim()||!newAdminEmail.includes("@")) { setAdminStatus("❌ Valid email!"); return; }
    const key = newAdminEmail.trim().replace(/\./g,"_");
    await set(ref(db,`adminEmails/${key}`), { email:newAdminEmail.trim(), addedBy:user.email, addedAt:serverTimestamp() });
    setNewAdminEmail(""); setAdminStatus("✅ Admin added!");
    showNotif(`${newAdminEmail} is now Admin! 👑`);
    setTimeout(()=>setAdminStatus(""),3000);
  };

  const removeAdmin = async (key) => { await remove(ref(db,`adminEmails/${key}`)); showNotif("Admin removed.","error"); };

  const importSheet = async () => {
    if(!sheetId.trim()) return;
    setSheetStatus("loading");
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
      const res = await fetch(url); const raw = await res.text();
      const json = JSON.parse(raw.replace(/.*?({.*})/s,"$1"));
      let count = 0;
      for(const row of json.table.rows) {
        const c=row.c; const g=(i)=>c[i]?.v!=null?String(c[i].v).trim():"";
        if(!g(0)||!g(1)) continue;
        const opts=[g(1),g(2),g(3),g(4)];
        const ar=g(5).toUpperCase();
        let ans=ar==="B"?0:ar==="C"?1:ar==="D"?2:ar==="E"?3:parseInt(ar)||0;
        await push(ref(db,"questions"),{ q:g(0),qm:"",options:opts,answer:ans,cat:sheetCat,explanation:g(6)||"",addedBy:"sheet",addedAt:serverTimestamp() });
        count++;
      }
      setSheetStatus("success"); showNotif(`✅ ${count} questions imported!`);
    } catch(e) { setSheetStatus("error"); showNotif("Import failed!","error"); }
  };

  const parseBulk = (text) => {
    return text.trim().split("\n").filter(l=>l.trim()).map(line=>{
      const cols = line.includes("\t") ? line.split("\t") : line.split(",");
      const g=(i)=>(cols[i]||"").trim().replace(/^"|"$/g,"");
      const ar=g(5).toUpperCase();
      const ans=ar==="B"?0:ar==="C"?1:ar==="D"?2:ar==="E"?3:parseInt(ar)||0;
      return { q:g(0),o1:g(1),o2:g(2),o3:g(3),o4:g(4),answer:ans,explanation:g(6)||"" };
    }).filter(r=>r.q&&r.o1);
  };

  const previewBulk = () => {
    const parsed = parseBulk(bulkText);
    if(!parsed.length) { setBulkStatus("❌ Format ശരിയല്ല!"); return; }
    setBulkPreview(parsed); setBulkStatus(`✅ ${parsed.length} questions ready!`);
  };

  const uploadBulk = async () => {
    if(!bulkPreview.length) return;
    setBulkStatus("⏳ Uploading...");
    let count=0;
    for(const q of bulkPreview) {
      await push(ref(db,"questions"),{ q:q.q,qm:"",options:[q.o1,q.o2,q.o3,q.o4],answer:q.answer,cat:bulkCat,explanation:q.explanation,addedBy:user.email,addedAt:serverTimestamp() });
      count++;
    }
    setBulkStatus(`✅ ${count} questions uploaded!`);
    setBulkText(""); setBulkPreview([]);
    showNotif(`🎉 ${count} questions added!`);
  };

  const reportQ = async (qId, qText) => {
    const reason = window.prompt(`Report reason:\n"${qText.substring(0,50)}"`);
    if(!reason) return;
    await push(ref(db,"reports"),{ qId,qText,reason,reportedBy:user.uid,reportedByName:user.displayName||user.email,reportedAt:serverTimestamp(),status:"pending" });
    showNotif("✅ Reported! Admins will review.");
  };

  // ─── Styles ────────────────────────────────────────────────
  const S = { minHeight:"100vh", background:"#05050f", color:"#e2e8f0", fontFamily:"'Segoe UI',sans-serif" };
  const card = (ex={}) => ({ background:"rgba(255,255,255,0.045)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, ...ex });
  const glass = (ex={}) => ({ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, ...ex });
  const Btn = (bg,col="#fff",ex={}) => ({ background:bg, color:col, border:"none", borderRadius:12, padding:"12px 16px", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", transition:"all 0.2s", ...ex });
  const Inp = { width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 14px", color:"#e2e8f0", fontSize:13, marginBottom:10, fontFamily:"inherit", outline:"none" };
  const Sel = { ...Inp, background:"#0f0f1e" };

  // ─── SPLASH ────────────────────────────────────────────────
  if(screen === "splash") return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <div style={{fontSize:72,filter:"drop-shadow(0 0 30px rgba(99,102,241,0.8))"}}>🎓</div>
      <h1 style={{fontSize:26,fontWeight:900,background:"linear-gradient(135deg,#a5b4fc,#e879f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>PSC Quiz Kerala</h1>
      <p style={{color:"#475569"}}>Loading...</p>
    </div>
  );

  // ─── AUTH ──────────────────────────────────────────────────
  if(screen === "auth") return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center",padding:20,minHeight:"100vh"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input,select,textarea{font-family:inherit}input:focus,textarea:focus{border-color:#6366f1!important;outline:none}`}</style>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:60,marginBottom:12,filter:"drop-shadow(0 0 20px rgba(99,102,241,0.6))"}}>🎓</div>
          <h1 style={{fontSize:24,fontWeight:900,background:"linear-gradient(135deg,#a5b4fc,#e879f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:6}}>PSC Quiz Kerala</h1>
          <p style={{color:"#475569",fontSize:13}}>Kerala's #1 PSC Exam Prep App</p>
        </div>
        <button onClick={loginGoogle} disabled={authLoading} style={{...Btn("rgba(255,255,255,0.08)","#e2e8f0"),width:"100%",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:12,border:"1px solid rgba(255,255,255,0.15)",padding:16,fontSize:15,borderRadius:14}}>
          <div style={{width:24,height:24,background:"#fff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#4285f4"}}>G</div>
          Continue with Google
        </button>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}}/><span style={{color:"#334155",fontSize:12}}>OR</span><div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}}/>
        </div>
        <div style={{...glass(),padding:22}}>
          <div style={{display:"flex",marginBottom:16,background:"rgba(255,255,255,0.05)",borderRadius:12,padding:4}}>
            {["login","register"].map(m=><button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");setAuthMsg("");}} style={{flex:1,padding:"9px 0",background:authMode===m?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",border:"none",borderRadius:10,color:authMode===m?"#fff":"#64748b",cursor:"pointer",fontWeight:700,fontSize:13,transition:"all 0.2s"}}>{m==="login"?"🔐 Login":"📝 Register"}</button>)}
          </div>
          {authMode==="register"&&<input value={dn} onChange={e=>setDn(e.target.value)} placeholder="Your Name" style={Inp}/>}
          <input value={em} onChange={e=>setEm(e.target.value)} placeholder="Email address" type="email" style={Inp}/>
          <input value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password (min 6)" type="password" style={Inp}/>
          {authErr&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"10px 12px",color:"#ef4444",fontSize:13,marginBottom:10}}>{authErr}</div>}
          {authMsg&&<div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:10,padding:"10px 12px",color:"#10b981",fontSize:13,marginBottom:10}}>{authMsg}</div>}
          <button onClick={loginEmail} disabled={authLoading} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",padding:14,fontSize:14,borderRadius:12,marginBottom:10}}>
            {authLoading?"⏳ Please wait...":authMode==="login"?"🔐 Sign In":"✅ Create Account"}
          </button>
          {authMode==="login"&&<button onClick={forgotPassword} style={{background:"none",border:"none",color:"#6366f1",fontSize:13,cursor:"pointer",width:"100%",textAlign:"center",fontFamily:"inherit",fontWeight:600}}>🔑 Forgot Password?</button>}
        </div>
      </div>
    </div>
  );

  // ─── Main App Layout ───────────────────────────────────────
  const Header = () => (
    <div style={{background:"linear-gradient(135deg,rgba(19,16,58,0.97),rgba(30,27,75,0.97))",backdropFilter:"blur(20px)",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(99,102,241,0.2)",position:"sticky",top:0,zIndex:100}}>
      <div onClick={()=>setScreen("home")} style={{cursor:"pointer"}}>
        <div style={{fontSize:15,fontWeight:800,background:"linear-gradient(135deg,#a5b4fc,#e879f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>🎓 PSC Quiz Kerala</div>
        <div style={{fontSize:10,color:"#4f46e5",marginTop:1}}>
          {user?.displayName||user?.email?.split("@")[0]} {isSuperAdmin?"👑":isAdmin?"🛡️":""}
        </div>
      </div>
      <div style={{display:"flex",gap:5}}>
        {isAdmin&&(
          <button onClick={()=>setScreen("admin")} style={{...Btn("rgba(251,191,36,0.15)","#fbbf24"),padding:"6px 10px",fontSize:12,position:"relative"}}>
            👑{pendingQ.length>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{pendingQ.length}</span>}
          </button>
        )}
        <button onClick={logout} style={{...Btn("rgba(255,255,255,0.06)","#94a3b8"),padding:"6px 10px",fontSize:12}}>🚪</button>
      </div>
    </div>
  );

  const BottomNav = () => (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(5,5,15,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",zIndex:100}}>
      {[["home","🏠","Home"],["contribute","✍️","Contribute"],["battle_select","⚔️","Battle"],["forum","💬","Forum"],["myprogress","📊","Progress"]].map(([s,icon,label])=>(
        <button key={s} onClick={()=>setScreen(s)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 4px 10px",background:"none",border:"none",cursor:"pointer",color:screen===s?"#a5b4fc":"#475569",transition:"color 0.2s"}}>
          <span style={{fontSize:20}}>{icon}</span>
          <span style={{fontSize:9,fontWeight:700}}>{label}</span>
        </button>
      ))}
    </div>
  );

  const BackBtn = ({to="home",label="Back"}) => (
    <button onClick={()=>setScreen(to)} style={{...Btn("rgba(255,255,255,0.06)","#94a3b8"),padding:"8px 14px",fontSize:12,marginBottom:14}}>← {label}</button>
  );

  return (
    <div style={S}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes pop{from{transform:scale(0.93);opacity:0}to{transform:scale(1);opacity:1}}.pop{animation:pop 0.25s ease}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}.blink{animation:blink 0.7s infinite}@keyframes slideD{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}.slideD{animation:slideD 0.3s ease}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}input,select,textarea{font-family:inherit}input:focus,select:focus,textarea:focus{outline:none;border-color:#6366f1!important}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#4f46e5;border-radius:3px}`}</style>

      {notif&&<div className="slideD" style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:notif.type==="error"?"linear-gradient(135deg,#ef4444,#dc2626)":"linear-gradient(135deg,#10b981,#059669)",color:"#fff",padding:"10px 22px",borderRadius:30,fontSize:13,fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>{notif.msg}</div>}

      <Header/>
      <div style={{maxWidth:500,margin:"0 auto",padding:"0 14px 90px"}}>

        {/* ══════════ HOME ══════════ */}
        {screen==="home"&&(
          <div className="pop">
            <div style={{textAlign:"center",padding:"20px 0 16px"}}>
              <div style={{fontSize:48,marginBottom:8,filter:"drop-shadow(0 0 20px rgba(99,102,241,0.5))"}}>🎯</div>
              <h1 style={{fontSize:20,fontWeight:900,background:"linear-gradient(135deg,#c7d2fe,#e879f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4}}>Kerala PSC Exam Prep</h1>
              <p style={{color:"#475569",fontSize:12}}>{allQ.length} Questions • {categories.length} Categories • 🟢 {activeMembers} Online</p>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[{l:"Questions",v:allQ.length,i:"📝",c:"#6366f1"},{l:"Categories",v:categories.length,i:"📚",c:"#8b5cf6"},{l:"My Best",v:Object.values(myStats).reduce((a,s)=>Math.max(a,s.best||0),0),i:"🏆",c:"#f59e0b"}].map((x,i)=>(
                <div key={i} style={{...card(),flex:1,padding:"12px 6px",textAlign:"center",borderTop:`2px solid ${x.c}`}}>
                  <div style={{fontSize:20,marginBottom:2}}>{x.i}</div>
                  <div style={{fontSize:22,fontWeight:900,color:x.c}}>{x.v}</div>
                  <div style={{fontSize:10,color:"#475569",marginTop:1}}>{x.l}</div>
                </div>
              ))}
            </div>
            <div style={{...glass(),padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:12,color:"#64748b",marginBottom:8,fontWeight:600}}>📊 Questions per Quiz:</div>
              <div style={{display:"flex",gap:6}}>
                {[5,10,15,20].map(n=><button key={n} onClick={()=>setQuizCount(n)} style={{flex:1,padding:"8px 0",background:quizCount===n?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.05)",border:`1px solid ${quizCount===n?"#6366f1":"rgba(255,255,255,0.1)"}`,borderRadius:10,color:quizCount===n?"#fff":"#64748b",cursor:"pointer",fontWeight:800,fontSize:14,transition:"all 0.2s"}}>{n}</button>)}
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <button onClick={()=>startQuiz("mock")} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"16px 10px",background:"linear-gradient(135deg,rgba(236,72,153,0.15),rgba(139,92,246,0.1))",border:"1px solid rgba(236,72,153,0.25)",borderRadius:14,cursor:"pointer"}}>
                <span style={{fontSize:28}}>🎯</span>
                <span style={{fontWeight:700,color:"#f0abfc",fontSize:13}}>Mock Test</span>
                <span style={{color:"#475569",fontSize:10}}>{quizCount} Random Q</span>
              </button>
              <button onClick={()=>setScreen("battle_select")} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"16px 10px",background:"linear-gradient(135deg,rgba(239,68,68,0.15),rgba(245,158,11,0.1))",border:"1px solid rgba(239,68,68,0.25)",borderRadius:14,cursor:"pointer"}}>
                <span style={{fontSize:28}}>⚔️</span>
                <span style={{fontWeight:700,color:"#fca5a5",fontSize:13}}>Quiz Battle</span>
                <span style={{color:"#475569",fontSize:10}}>1v1 • Multi • Random</span>
              </button>
            </div>
            <div style={{fontSize:12,color:"#475569",marginBottom:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>📚 Categories</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {categories.map(cat=>{
                const qCount=allQ.filter(q=>q.cat===cat.id).length;
                return (
                  <button key={cat.id} onClick={()=>startQuiz(cat.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",background:"rgba(255,255,255,0.03)",border:`1px solid rgba(255,255,255,0.07)`,borderLeft:`3px solid ${cat.color}`,borderRadius:13,cursor:"pointer",textAlign:"left",width:"100%",transition:"all 0.2s"}}>
                    <span style={{fontSize:22,width:36,height:36,background:`${cat.color}20`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{cat.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:"#e2e8f0",fontSize:14}}>{cat.label}</div>
                      {myStats[cat.id]&&<div style={{fontSize:10,color:"#475569",marginTop:2}}>Best: {myStats[cat.id].best} • {myStats[cat.id].attempts}x played</div>}
                    </div>
                    <div style={{background:`${cat.color}25`,color:cat.color,borderRadius:8,padding:"3px 9px",fontSize:11,fontWeight:700}}>{qCount}Q</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ QUIZ ══════════ */}
        {screen==="quiz"&&questions[curr]&&(()=>{
          const q=questions[curr];
          const catInfo=categories.find(c=>c.id===q.cat)||{label:q.cat,icon:"📋",color:"#6366f1"};
          return (
            <div className="pop" style={{paddingTop:14}}>
              <div style={{...glass(),padding:"12px 14px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div><span style={{color:"#a5b4fc",fontWeight:700,fontSize:13}}>{curr+1}</span><span style={{color:"#475569",fontSize:13}}>/{questions.length}</span><span style={{color:"#64748b",fontSize:11,marginLeft:6}}>{catInfo.icon} {catInfo.label}</span></div>
                  <div style={{display:"flex",gap:8}}>
                    <div style={{background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:20,padding:"3px 10px",color:"#10b981",fontWeight:700,fontSize:12}}>✅ {score}</div>
                    <div className={timer<=5?"blink":""} style={{background:timer<=5?"rgba(239,68,68,0.12)":"rgba(99,102,241,0.12)",border:`1px solid ${timer<=5?"rgba(239,68,68,0.3)":"rgba(99,102,241,0.3)"}`,borderRadius:20,padding:"3px 10px",color:timer<=5?"#ef4444":"#a5b4fc",fontWeight:800,fontSize:13}}>⏱{timer}</div>
                  </div>
                </div>
                <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:5}}>
                  <div style={{height:"100%",width:`${(curr/questions.length)*100}%`,background:`linear-gradient(90deg,${catInfo.color},#a855f7)`,borderRadius:5,transition:"width 0.5s ease"}}/>
                </div>
              </div>
              <div style={{...card(),padding:18,marginBottom:12,background:`linear-gradient(135deg,${catInfo.color}12,rgba(168,85,247,0.06))`,borderColor:`${catInfo.color}25`}}>
                <div style={{fontSize:10,color:catInfo.color,marginBottom:8,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700}}>{catInfo.icon} {catInfo.label}</div>
                <p style={{fontSize:16,fontWeight:700,color:"#f1f5f9",lineHeight:1.65}}>{q.q}</p>
                {q.qm&&<p style={{fontSize:13,color:"#64748b",marginTop:7,lineHeight:1.55}}>{q.qm}</p>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                {q.options.map((opt,i)=>{
                  let bg="rgba(255,255,255,0.04)",bdr="rgba(255,255,255,0.09)",col="#e2e8f0",icon="";
                  if(picked!==null){
                    if(i===q.answer){bg="rgba(16,185,129,0.14)";bdr="#10b981";col="#10b981";icon="✅";}
                    else if(i===picked){bg="rgba(239,68,68,0.14)";bdr="#ef4444";col="#ef4444";icon="❌";}
                    else{col="#64748b";}
                  }
                  return <button key={i} onClick={()=>handleAns(i)} style={{display:"flex",alignItems:"center",gap:11,padding:"13px 15px",background:bg,border:`1.5px solid ${bdr}`,borderRadius:12,color:col,textAlign:"left",fontSize:14,cursor:picked===null?"pointer":"default",lineHeight:1.5,transition:"all 0.2s"}}>
                    <span style={{width:28,height:28,borderRadius:8,background:`${bdr}30`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0,border:`1px solid ${bdr}`}}>{["A","B","C","D"][i]}</span>
                    <span style={{flex:1}}>{opt}</span>
                    {icon&&<span style={{fontSize:16}}>{icon}</span>}
                  </button>;
                })}
              </div>
              {picked!==null&&(
                <div className="pop">
                  {q.explanation&&<div style={{...card(),padding:12,marginBottom:10,borderLeft:"3px solid #f59e0b",background:"rgba(245,158,11,0.06)"}}>
                    <div style={{fontSize:11,color:"#f59e0b",marginBottom:4,fontWeight:700}}>💡 Explanation</div>
                    <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.5}}>{q.explanation}</div>
                  </div>}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>reportQ(q.id,q.q)} style={{...Btn("rgba(239,68,68,0.1)","#ef4444"),padding:"10px 14px",fontSize:12}}>🚩 Report</button>
                    <button onClick={nextQ} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),flex:1,padding:12}}>{curr+1>=questions.length?"📊 See Result →":"Next →"}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ══════════ RESULT ══════════ */}
        {screen==="result"&&(
          <div className="pop" style={{paddingTop:18}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:64,marginBottom:8,filter:`drop-shadow(0 0 30px ${score>=questions.length*0.8?"#f59e0b":score>=questions.length*0.5?"#10b981":"#6366f1"})`}}>{score>=questions.length*0.8?"🏆":score>=questions.length*0.5?"🎉":"💪"}</div>
              <h2 style={{fontSize:22,fontWeight:900,color:"#c7d2fe",marginBottom:8}}>Quiz Complete!</h2>
              <div style={{fontSize:52,fontWeight:900,background:"linear-gradient(135deg,#6366f1,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"8px 0"}}>{score}<span style={{fontSize:24,opacity:0.5}}>/{questions.length}</span></div>
              <div style={{display:"inline-block",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:20,padding:"5px 16px",color:"#10b981",fontWeight:700,fontSize:13}}>Accuracy: {Math.round((score/questions.length)*100)}%</div>
            </div>
            <h3 style={{fontSize:11,color:"#475569",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Answer Review</h3>
            {answers.map((a,i)=>(
              <div key={i} style={{...card(),padding:11,marginBottom:6,borderLeft:`3px solid ${a.ok?"#10b981":"#ef4444"}`}}>
                <div style={{fontSize:11,color:"#64748b",marginBottom:3}}>Q{i+1}: {a.q.q}</div>
                <div style={{fontSize:12,color:a.ok?"#10b981":"#ef4444",marginBottom:a.q.explanation&&!a.ok?4:0}}>{a.ok?"✅":"❌"} {a.sel===-1?"⏱ Time out":a.q.options[a.sel]}{!a.ok&&a.sel!==-1&&<span style={{color:"#10b981"}}> → {a.q.options[a.q.answer]}</span>}</div>
                {a.q.explanation&&!a.ok&&<div style={{fontSize:11,color:"#475569"}}>💡 {a.q.explanation}</div>}
                <button onClick={()=>reportQ(a.q.id,a.q.q)} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,marginTop:4}}>🚩 Report wrong answer</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:14}}>
              <button onClick={()=>startQuiz(selCat)} style={{...Btn("rgba(99,102,241,0.15)","#a5b4fc"),flex:1}}>🔄 Again</button>
              <button onClick={()=>setScreen("home")} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),flex:1}}>🏠 Home</button>
            </div>
          </div>
        )}

        {/* ══════════ BATTLE SELECT ══════════ */}
        {screen==="battle_select"&&(
          <div className="pop" style={{paddingTop:18}}>
            <BackBtn label="Home"/>
            <h2 style={{fontSize:20,fontWeight:900,background:"linear-gradient(135deg,#fca5a5,#f87171)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4}}>⚔️ Quiz Battle</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:16}}>Battle mode choose ചെയ്യൂ!</p>
            <div style={{...glass(),padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:12,color:"#64748b",marginBottom:8,fontWeight:600}}>Questions per Battle:</div>
              <div style={{display:"flex",gap:6}}>{[5,10,15,20].map(n=><button key={n} onClick={()=>setQuizCount(n)} style={{flex:1,padding:"8px 0",background:quizCount===n?"linear-gradient(135deg,#ef4444,#f97316)":"rgba(255,255,255,0.05)",border:`1px solid ${quizCount===n?"#ef4444":"rgba(255,255,255,0.1)"}`,borderRadius:10,color:quizCount===n?"#fff":"#64748b",cursor:"pointer",fontWeight:800,fontSize:14}}>{n}</button>)}</div>
            </div>
            {[{type:"1v1",icon:"🤺",title:"1 vs 1",sub:"Room code share ചെയ്ത് friend-നെ challenge",color:"#6366f1",desc:"Private"},{type:"multi",icon:"👥",title:"Multiplayer",sub:"Up to 100 players ഒരേ സമയം!",color:"#10b981",desc:"100 Players"},{type:"random",icon:"🎲",title:"Random Match",sub:"Online player കിട്ടിയില്ലെങ്കിൽ AI!",color:"#f59e0b",desc:"vs AI if needed"}].map(b=>(
              <button key={b.type} onClick={()=>{setBattleType(b.type);setScreen("battle_lobby");}} style={{display:"flex",alignItems:"center",gap:14,padding:"18px 16px",background:`linear-gradient(135deg,${b.color}15,${b.color}08)`,border:`1px solid ${b.color}30`,borderRadius:16,cursor:"pointer",textAlign:"left",width:"100%",marginBottom:10,transition:"all 0.2s"}}>
                <div style={{width:52,height:52,background:`${b.color}20`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{b.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,color:"#f1f5f9",fontSize:16,marginBottom:3}}>{b.title}</div>
                  <div style={{color:"#64748b",fontSize:12,lineHeight:1.4}}>{b.sub}</div>
                </div>
                <div style={{background:`${b.color}20`,color:b.color,borderRadius:20,padding:"4px 10px",fontSize:10,fontWeight:700}}>{b.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* ══════════ BATTLE LOBBY ══════════ */}
        {screen==="battle_lobby"&&(
          <div className="pop" style={{paddingTop:18}}>
            <BackBtn to="battle_select" label="Battle"/>
            <h2 style={{fontSize:19,fontWeight:900,color:"#c7d2fe",marginBottom:14}}>⚔️ {battleType==="1v1"?"1 vs 1":battleType==="multi"?"Multiplayer":"Random Match"}</h2>
            <div style={{...card(),padding:16,marginBottom:10,borderLeft:"3px solid #6366f1"}}>
              <div style={{fontWeight:700,color:"#a5b4fc",marginBottom:8}}>🆕 Create Room</div>
              <button onClick={createRoom} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%"}}>🎮 Create Room</button>
            </div>
            <div style={{...card(),padding:16,borderLeft:"3px solid #10b981"}}>
              <div style={{fontWeight:700,color:"#10b981",marginBottom:8}}>🔗 Join Room</div>
              <input value={joinCode} onChange={e=>{setJoinCode(e.target.value.toUpperCase());setRoomErr("");}} placeholder="ROOM CODE" style={{...Inp,textTransform:"uppercase",letterSpacing:6,textAlign:"center",fontSize:22,fontWeight:900}}/>
              {roomErr&&<div style={{color:"#ef4444",fontSize:12,marginBottom:8}}>{roomErr}</div>}
              <button onClick={joinRoom} style={{...Btn("#10b981"),width:"100%"}}>🚀 Join</button>
            </div>
          </div>
        )}

        {/* ══════════ ROOM ══════════ */}
        {screen==="room"&&(
          <div className="pop" style={{paddingTop:14}}>
            <BackBtn to="battle_select" label="Leave"/>
            <div style={{...glass(),padding:20,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:2,fontWeight:700}}>Room Code</div>
              <div style={{fontSize:36,fontWeight:900,background:"linear-gradient(135deg,#a5b4fc,#e879f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:8,margin:"4px 0"}}>{roomCode}</div>
              <div style={{fontSize:11,color:"#475569"}}>Share with friends!</div>
            </div>
            <div style={{...card(),padding:14,marginBottom:12}}>
              <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:10,fontSize:13}}>Players ({Object.keys(roomData?.players||{}).length}/{roomData?.maxPlayers||2})</div>
              {Object.entries(roomData?.players||{}).map(([uid,p])=>(
                <div key={uid} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,#6366f1,#8b5cf6)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14}}>{p.isComputer?"🤖":p.avatar||"U"}</div>
                  <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:uid===user?.uid?"#a5b4fc":"#e2e8f0"}}>{p.name} {uid===user?.uid?"(You)":""}</div></div>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#10b981"}}/>
                </div>
              ))}
            </div>
            {roomData?.hostUid===user?.uid
              ?<button onClick={startBattle} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",padding:14,fontSize:15}}>🚀 Start Battle!</button>
              :<div style={{textAlign:"center",color:"#475569",fontSize:13,padding:14}}>⏳ Host-ന് start ചെയ്യാൻ കാത്തിരിക്കൂ...</div>
            }
          </div>
        )}

        {/* ══════════ BATTLE ══════════ */}
        {screen==="battle"&&battleQ[battleCurr]&&(()=>{
          const q=battleQ[battleCurr];
          const players=roomData?.players||{};
          return (
            <div className="pop" style={{paddingTop:10}}>
              <div style={{...glass(),padding:"10px 12px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:12,color:"#a5b4fc",fontWeight:700}}>Q{battleCurr+1}/{battleQ.length}</div>
                <div className={battleTimer<=5?"blink":""} style={{background:battleTimer<=5?"rgba(239,68,68,0.15)":"rgba(99,102,241,0.15)",border:`1px solid ${battleTimer<=5?"rgba(239,68,68,0.4)":"rgba(99,102,241,0.3)"}`,borderRadius:20,padding:"4px 14px",color:battleTimer<=5?"#ef4444":"#a5b4fc",fontWeight:900,fontSize:16}}>⏱ {battleTimer}</div>
                <div style={{fontSize:12,color:"#10b981",fontWeight:700}}>Score: {battleScore}</div>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {Object.entries(players).slice(0,4).map(([uid,p])=>(
                  <div key={uid} style={{flex:1,...card(),padding:"8px 6px",textAlign:"center",borderTop:`2px solid ${uid===user?.uid?"#6366f1":"#ef4444"}`}}>
                    <div style={{fontSize:16,marginBottom:2}}>{p.isComputer?"🤖":p.avatar||"👤"}</div>
                    <div style={{fontSize:18,fontWeight:900,color:uid===user?.uid?"#a5b4fc":"#e2e8f0"}}>{p.score||0}</div>
                    <div style={{fontSize:9,color:"#475569",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{uid===user?.uid?"You":p.name.split(" ")[0]}</div>
                  </div>
                ))}
              </div>
              <div style={{...card(),padding:16,marginBottom:10,background:"rgba(99,102,241,0.07)"}}>
                <p style={{fontSize:15,fontWeight:700,color:"#f1f5f9",lineHeight:1.6}}>{q.q}</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:10}}>
                {q.options.map((opt,i)=>{
                  let bg="rgba(255,255,255,0.04)",bdr="rgba(255,255,255,0.09)",col="#e2e8f0";
                  if(battlePicked!==null){if(i===q.answer){bg="rgba(16,185,129,0.14)";bdr="#10b981";col="#10b981";}else if(i===battlePicked){bg="rgba(239,68,68,0.14)";bdr="#ef4444";col="#ef4444";}}
                  return <button key={i} onClick={()=>handleBattleAns(i)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:bg,border:`1.5px solid ${bdr}`,borderRadius:12,color:col,textAlign:"left",fontSize:13,cursor:battlePicked===null?"pointer":"default",transition:"all 0.2s"}}>
                    <span style={{width:26,height:26,borderRadius:8,background:`${bdr}30`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11,flexShrink:0}}>{["A","B","C","D"][i]}</span>{opt}
                  </button>;
                })}
              </div>
              {battlePicked!==null&&<button onClick={nextBattle} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",padding:12,marginBottom:10}}>{battleCurr+1>=battleQ.length?"🏆 Results":"Next →"}</button>}
              <div style={{...card(),padding:12}}>
                <div style={{fontSize:10,color:"#64748b",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>💬 Battle Chat</div>
                <div style={{height:70,overflowY:"auto",marginBottom:8}}>
                  {chatMsgs.map((m,i)=><div key={i} style={{fontSize:11,marginBottom:3,color:m.uid===user?.uid?"#a5b4fc":"#94a3b8"}}><strong>{m.uid===user?.uid?"You":m.name}:</strong> {m.msg}</div>)}
                  <div ref={chatEndRef}/>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Message..." style={{...Inp,marginBottom:0,flex:1,padding:"8px 12px",fontSize:12}}/>
                  <button onClick={sendChat} style={{...Btn("rgba(99,102,241,0.2)","#a5b4fc"),padding:"8px 12px",fontSize:12}}>➤</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══════════ BATTLE RESULT ══════════ */}
        {screen==="battle_result"&&(
          <div className="pop" style={{paddingTop:18,textAlign:"center"}}>
            <div style={{fontSize:64,marginBottom:12}}>🏆</div>
            <h2 style={{fontSize:22,fontWeight:900,color:"#c7d2fe",marginBottom:16}}>Battle Over!</h2>
            <div style={{...card(),padding:16,marginBottom:16}}>
              <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:12}}>Final Scores</div>
              {Object.entries(roomData?.players||{}).sort((a,b)=>(b[1].score||0)-(a[1].score||0)).map(([uid,p],i)=>(
                <div key={uid} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:20,width:28}}>{i===0?"🥇":i===1?"🥈":"🥉"}</span>
                  <div style={{flex:1,textAlign:"left",fontWeight:700,color:uid===user?.uid?"#a5b4fc":"#e2e8f0"}}>{p.name} {uid===user?.uid?"(You)":""}</div>
                  <div style={{fontWeight:900,color:"#6366f1",fontSize:20}}>{p.score||0}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setScreen("battle_select")} style={{...Btn("rgba(99,102,241,0.15)","#a5b4fc"),flex:1}}>🔄 Play Again</button>
              <button onClick={()=>setScreen("home")} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),flex:1}}>🏠 Home</button>
            </div>
          </div>
        )}

        {/* ══════════ FORUM ══════════ */}
        {screen==="forum"&&(
          <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"}}>
            <div style={{padding:"10px 14px 8px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💬</div>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:"#e2e8f0"}}>PSC Students Forum</div>
                  <div style={{fontSize:11,color:"#10b981"}}>🟢 {forumPosts.length} messages</div>
                </div>
              </div>
              <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4}}>
                {[{id:"all",label:"All",icon:"🌐",color:"#6366f1"},...FORUM_CATS].map(cat=>(
                  <button key={cat.id} onClick={()=>setForumFilter(cat.id)} style={{flexShrink:0,padding:"4px 10px",background:forumFilter===cat.id?cat.color:"rgba(255,255,255,0.06)",border:"none",borderRadius:20,color:forumFilter===cat.id?"#fff":"#64748b",cursor:"pointer",fontWeight:700,fontSize:10,whiteSpace:"nowrap",transition:"all 0.2s"}}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
              {forumPosts.filter(p=>forumFilter==="all"||p.category===forumFilter).map(post=>{
                const catInfo=FORUM_CATS.find(c=>c.id===post.category)||{icon:"💬",color:"#6366f1"};
                const isOwn=post.uid===user?.uid;
                return (
                  <div key={post.id} style={{display:"flex",flexDirection:"column",alignItems:isOwn?"flex-end":"flex-start"}}>
                    {!isOwn&&<div style={{fontSize:10,color:catInfo.color,fontWeight:700,marginBottom:2,marginLeft:8}}>{post.name} {catInfo.icon}</div>}
                    <div style={{display:"flex",alignItems:"flex-end",gap:6,maxWidth:"82%",flexDirection:isOwn?"row-reverse":"row"}}>
                      {!isOwn&&<div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${catInfo.color},${catInfo.color}99)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>{post.avatar||post.name[0].toUpperCase()}</div>}
                      <div style={{background:isOwn?"linear-gradient(135deg,#6366f1,#7c3aed)":"rgba(255,255,255,0.09)",borderRadius:isOwn?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"10px 14px"}}>
                        <p style={{fontSize:14,color:"#f1f5f9",lineHeight:1.5,margin:0,wordBreak:"break-word"}}>{post.msg}</p>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,marginTop:4}}>
                          <span style={{fontSize:9,color:isOwn?"rgba(255,255,255,0.5)":"#475569"}}>{timeAgo(post.time)}</span>
                          {isOwn&&<span style={{fontSize:9,color:"rgba(255,255,255,0.5)"}}>✓✓</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:3,paddingLeft:isOwn?0:36}}>
                      <button onClick={()=>likePost(post)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:11,fontFamily:"inherit",padding:0}}>👍 {post.likes||0}</button>
                      {(isOwn||isAdmin)&&<button onClick={()=>deleteForumPost(post.id)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:0}}>🗑️</button>}
                    </div>
                  </div>
                );
              })}
              {forumPosts.filter(p=>forumFilter==="all"||p.category===forumFilter).length===0&&(
                <div style={{textAlign:"center",padding:40,color:"#475569"}}>
                  <div style={{fontSize:40,marginBottom:10}}>💬</div>
                  <p>No messages yet! First message ഇടൂ!</p>
                </div>
              )}
              <div ref={forumEndRef}/>
            </div>
            <div style={{padding:"8px 10px",background:"rgba(5,5,15,0.97)",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <select value={forumCat} onChange={e=>setForumCat(e.target.value)} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"4px 10px",color:"#94a3b8",fontSize:11,fontFamily:"inherit",outline:"none"}}>
                  {FORUM_CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
                <div style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:24,padding:"10px 16px"}}>
                  <textarea value={forumMsg} onChange={e=>setForumMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendForumMsg();}}} placeholder="Type a message..." rows={1} style={{width:"100%",background:"none",border:"none",color:"#e2e8f0",fontSize:14,fontFamily:"inherit",resize:"none",outline:"none",maxHeight:80,lineHeight:1.4}}/>
                </div>
                <button onClick={sendForumMsg} disabled={!forumMsg.trim()} style={{width:44,height:44,borderRadius:"50%",background:forumMsg.trim()?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.08)",border:"none",cursor:forumMsg.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,transition:"all 0.2s"}}>➤</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ CONTRIBUTE ══════════ */}
        {screen==="contribute"&&(
          <div className="pop" style={{paddingTop:16}}>
            <h2 style={{fontSize:19,fontWeight:900,color:"#10b981",marginBottom:4}}>✍️ Contribute a Question</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:14}}>Submit → Admin reviews → Published! 🎉</p>
            {myContribs.length>0&&(
              <div style={{...glass(),padding:12,marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:12,color:"#e2e8f0",marginBottom:8}}>My Submissions ({myContribs.length})</div>
                {myContribs.slice(0,5).map((c,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{flex:1,fontSize:12,color:"#94a3b8"}}>{c.q?.substring(0,35)}...</div>
                    <div style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:c.status==="approved"?"rgba(16,185,129,0.15)":c.status==="rejected"?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.15)",color:c.status==="approved"?"#10b981":c.status==="rejected"?"#ef4444":"#f59e0b"}}>
                      {c.status==="approved"?"✅ Approved":c.status==="rejected"?"❌ Rejected":"⏳ Pending"}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{...card(),padding:16,borderLeft:"3px solid #10b981"}}>
              <input value={cQ.q} onChange={e=>setCQ({...cQ,q:e.target.value})} placeholder="Question (English) *" style={Inp}/>
              <input value={cQ.qm} onChange={e=>setCQ({...cQ,qm:e.target.value})} placeholder="Question (Malayalam) — Optional" style={Inp}/>
              {["o1","o2","o3","o4"].map((k,i)=><input key={k} value={cQ[k]} onChange={e=>setCQ({...cQ,[k]:e.target.value})} placeholder={`Option ${["A","B","C","D"][i]} *`} style={Inp}/>)}
              <input value={cQ.explanation} onChange={e=>setCQ({...cQ,explanation:e.target.value})} placeholder="💡 Explanation (Optional)" style={Inp}/>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                <select value={cQ.answer} onChange={e=>setCQ({...cQ,answer:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}>
                  <option value="0">✅ Answer: A</option><option value="1">✅ Answer: B</option><option value="2">✅ Answer: C</option><option value="3">✅ Answer: D</option>
                </select>
                <select value={cQ.cat} onChange={e=>setCQ({...cQ,cat:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              {cStatus&&<div style={{fontSize:13,marginBottom:10,padding:"8px 12px",borderRadius:10,background:cStatus.includes("✅")?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",color:cStatus.includes("✅")?"#10b981":"#ef4444"}}>{cStatus}</div>}
              <button onClick={submitContrib} style={{...Btn("linear-gradient(135deg,#10b981,#06b6d4)"),width:"100%",padding:13,fontSize:14}}>✍️ Submit for Review</button>
            </div>
          </div>
        )}

        {/* ══════════ MY PROGRESS ══════════ */}
        {screen==="myprogress"&&(
          <div className="pop" style={{paddingTop:16}}>
            <h2 style={{fontSize:19,fontWeight:900,color:"#c7d2fe",marginBottom:4}}>📊 My Progress</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:14}}>{user?.displayName||user?.email}</p>
            <div style={{display:"flex",gap:7,marginBottom:14}}>
              {[{l:"Submitted",v:myContribs.length,i:"✍️",c:"#6366f1"},{l:"Approved",v:myContribs.filter(c=>c.status==="approved").length,i:"✅",c:"#10b981"},{l:"Pending",v:myContribs.filter(c=>c.status==="pending").length,i:"⏳",c:"#f59e0b"}].map((x,i)=>(
                <div key={i} style={{...card(),flex:1,padding:"10px 5px",textAlign:"center",borderTop:`2px solid ${x.c}`}}>
                  <div style={{fontSize:18}}>{x.i}</div>
                  <div style={{fontSize:20,fontWeight:900,color:x.c}}>{x.v}</div>
                  <div style={{fontSize:10,color:"#475569"}}>{x.l}</div>
                </div>
              ))}
            </div>
            {Object.keys(myStats).length===0
              ?<div style={{...card(),padding:36,textAlign:"center",color:"#475569"}}><div style={{fontSize:36}}>📊</div><p style={{marginTop:8}}>No quiz history yet!</p></div>
              :Object.entries(myStats).map(([catId,data])=>{
                const catInfo=categories.find(c=>c.id===catId)||{label:catId,icon:"📋",color:"#6366f1"};
                const pct=data.attempts>0?Math.round((data.correct/(data.attempts*quizCount))*100):0;
                return (
                  <div key={catId} style={{...card(),padding:14,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontWeight:700,fontSize:13}}>{catInfo.icon} {catInfo.label}</span>
                      <span style={{color:pct>=80?"#10b981":pct>=50?"#f59e0b":"#ef4444",fontWeight:800,fontSize:14}}>{pct}%</span>
                    </div>
                    <div style={{height:6,background:"rgba(255,255,255,0.06)",borderRadius:6,marginBottom:7}}>
                      <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:pct>=80?"linear-gradient(90deg,#10b981,#059669)":pct>=50?"linear-gradient(90deg,#f59e0b,#d97706)":"linear-gradient(90deg,#ef4444,#dc2626)",borderRadius:6,transition:"width 0.5s ease"}}/>
                    </div>
                    <div style={{display:"flex",gap:12,fontSize:11,color:"#475569"}}>
                      <span>🎮 {data.attempts}x</span><span>🏆 Best: {data.best}</span><span>✅ {data.correct} correct</span>
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* ══════════ ADMIN ══════════ */}
        {screen==="admin"&&isAdmin&&(
          <div className="pop" style={{paddingTop:16}}>
            <BackBtn label="Home"/>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{fontSize:28}}>👑</div>
              <div>
                <h2 style={{fontSize:18,fontWeight:900,color:"#fbbf24",marginBottom:2}}>Admin Panel</h2>
                <p style={{color:"#475569",fontSize:11}}>{isSuperAdmin?"Super Admin — Full Access":"Admin — Approve/Reject Only"}</p>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
              {[
                ["pending",`⏳(${pendingQ.length})`],
                ["reports","🚩"],
                isSuperAdmin&&["gemini","🤖 AI Gen"],
                isSuperAdmin&&["addq","➕ Add"],
                isSuperAdmin&&["bulk","📋 Bulk"],
                isSuperAdmin&&["cats","📁 Cats"],
                isSuperAdmin&&["sheet","📊 Sheet"],
                isSuperAdmin&&["admins","👑 Admins"],
                isSuperAdmin&&["members","🟢 Members"]
              ].filter(Boolean).map(([t,l])=>(
                <button key={t} onClick={()=>setAdminTab(t)} style={{padding:"7px 12px",background:adminTab===t?(t==="gemini"?"linear-gradient(135deg,#10b981,#06b6d4)":"linear-gradient(135deg,#6366f1,#8b5cf6)"):"rgba(255,255,255,0.06)",border:`1px solid ${adminTab===t?(t==="gemini"?"#10b981":"#6366f1"):"rgba(255,255,255,0.1)"}`,borderRadius:20,color:adminTab===t?"#fff":"#64748b",cursor:"pointer",fontWeight:700,fontSize:11,transition:"all 0.2s"}}>{l}</button>
              ))}
            </div>

            {/* ── PENDING ── */}
            {adminTab==="pending"&&(
              <div>
                {pendingQ.length===0
                  ?<div style={{...card(),padding:40,textAlign:"center",color:"#475569"}}><div style={{fontSize:40}}>✅</div><p style={{marginTop:10}}>No pending questions!</p></div>
                  :pendingQ.map(pq=>(
                    <div key={pq.id} style={{...card(),padding:14,marginBottom:10,borderLeft:"3px solid #f59e0b"}}>
                      <div style={{fontSize:10,color:"#f59e0b",marginBottom:6,fontWeight:700}}>⏳ By: {pq.submittedByName} • {categories.find(c=>c.id===pq.cat)?.label||pq.cat}</div>
                      <p style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:8}}>{pq.q}</p>
                      {pq.qm&&<p style={{fontSize:12,color:"#64748b",marginBottom:8}}>{pq.qm}</p>}
                      {(pq.options||[]).map((o,i)=><div key={i} style={{fontSize:12,color:i===pq.answer?"#10b981":"#94a3b8",padding:"3px 0"}}>{["A","B","C","D"][i]}. {o} {i===pq.answer?"✅":""}</div>)}
                      {pq.explanation&&<p style={{fontSize:11,color:"#475569",marginTop:6}}>💡 {pq.explanation}</p>}
                      <div style={{display:"flex",gap:8,marginTop:10}}>
                        <button onClick={()=>approveQ(pq)} style={{...Btn("rgba(16,185,129,0.2)","#10b981",{border:"1px solid rgba(16,185,129,0.4)"}),flex:1,padding:"10px 0"}}>✅ Approve</button>
                        <button onClick={()=>rejectQ(pq)} style={{...Btn("rgba(239,68,68,0.15)","#ef4444",{border:"1px solid rgba(239,68,68,0.3)"}),flex:1,padding:"10px 0"}}>❌ Reject</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── REPORTS ── */}
            {adminTab==="reports"&&<ReportsPanel db={db} isAdmin={isAdmin} userId={user?.uid} showNotif={showNotif}/>}

            {/* ── GEMINI AI GENERATOR ── */}
            {adminTab==="gemini"&&isSuperAdmin&&(
              <GeminiQuizGenerator
                db={db}
                categories={categories}
                user={user}
                showNotif={showNotif}
              />
            )}

            {/* ── ADD Q ── */}
            {adminTab==="addq"&&isSuperAdmin&&(
              <div style={{...card(),padding:14,borderLeft:"3px solid #6366f1"}}>
                <div style={{fontWeight:700,color:"#a5b4fc",marginBottom:10}}>➕ Add Question</div>
                <input value={newQ.q} onChange={e=>setNewQ({...newQ,q:e.target.value})} placeholder="Question (English) *" style={Inp}/>
                <input value={newQ.qm} onChange={e=>setNewQ({...newQ,qm:e.target.value})} placeholder="Question (Malayalam)" style={Inp}/>
                {["o1","o2","o3","o4"].map((k,i)=><input key={k} value={newQ[k]} onChange={e=>setNewQ({...newQ,[k]:e.target.value})} placeholder={`Option ${["A","B","C","D"][i]} *`} style={Inp}/>)}
                <input value={newQ.explanation} onChange={e=>setNewQ({...newQ,explanation:e.target.value})} placeholder="Explanation" style={Inp}/>
                <div style={{display:"flex",gap:6,marginBottom:10}}>
                  <select value={newQ.answer} onChange={e=>setNewQ({...newQ,answer:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select>
                  <select value={newQ.cat} onChange={e=>setNewQ({...newQ,cat:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
                </div>
                {addQStatus&&<div style={{fontSize:13,marginBottom:10,padding:"8px 12px",borderRadius:10,background:addQStatus.includes("✅")?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",color:addQStatus.includes("✅")?"#10b981":"#ef4444"}}>{addQStatus}</div>}
                <button onClick={addDirectQ} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%"}}>➕ Add to Firebase</button>
              </div>
            )}

            {/* ── BULK ── */}
            {adminTab==="bulk"&&isSuperAdmin&&(
              <div>
                <div style={{...card(),padding:14,marginBottom:10,borderLeft:"3px solid #f59e0b"}}>
                  <div style={{fontWeight:800,color:"#fbbf24",fontSize:15,marginBottom:6}}>📋 Bulk Paste & U
