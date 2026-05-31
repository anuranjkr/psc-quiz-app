import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "firebase/auth";
import {
  getDatabase, ref, onValue, push,
  serverTimestamp, update
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
  measurementId: "G-FZ12HPFRE5"
};

const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp, "https://psc-quiz-kerala-default-rtdb.asia-southeast1.firebasedatabase.app");
const gProvider = new GoogleAuthProvider();

// ─── Constants ─────────────────────────────────────────────
const SUPER_ADMIN = "anuranjkr45@gmail.com";

const DEFAULT_CATS = [
  { id: "ldc",       label: "LDC / LGS",      icon: "📋", color: "#6366f1" },
  { id: "psc",       label: "PSC General",     icon: "🏛️", color: "#8b5cf6" },
  { id: "police",    label: "Police / SI",     icon: "👮", color: "#3b82f6" },
  { id: "science",   label: "Science",         icon: "🔬", color: "#10b981" },
  { id: "history",   label: "History",         icon: "📜", color: "#f59e0b" },
  { id: "geography", label: "Geography",       icon: "🌍", color: "#06b6d4" },
  { id: "current",   label: "Current Affairs", icon: "📰", color: "#ef4444" },
];

const BUILTIN_Q = [
  { id: "b1",  q: "Kerala formed on?",               qm: "കേരളം രൂപീകരിച്ചത്?",                  options: ["Nov 1, 1956","Aug 15, 1947","Jan 26, 1950","Nov 1, 1960"],                    answer: 0, cat: "ldc",       explanation: "Kerala was formed on November 1, 1956." },
  { id: "b2",  q: "Longest river in Kerala?",        qm: "കേരളത്തിലെ ഏറ്റവും നീളമേറിയ നദി?",    options: ["Periyar","Bharathapuzha","Pamba","Chaliyar"],                                  answer: 1, cat: "ldc",       explanation: "Bharathapuzha (312 km) is the longest river in Kerala." },
  { id: "b3",  q: "Capital of Kerala?",              qm: "കേരളത്തിന്റെ തലസ്ഥാനം?",               options: ["Kochi","Kozhikode","Thiruvananthapuram","Thrissur"],                           answer: 2, cat: "ldc",       explanation: "Thiruvananthapuram is the capital of Kerala." },
  { id: "b4",  q: "Highest peak in Kerala?",         qm: "കേരളത്തിലെ ഏറ്റവും ഉയർന്ന കൊടുമുടി?", options: ["Chembra","Anamudi","Meesapulimala","Agasthyamala"],                            answer: 1, cat: "ldc",       explanation: "Anamudi (2695m) is the highest peak." },
  { id: "b5",  q: "Father of Indian Constitution?",  qm: "ഭരണഘടനയുടെ പിതാവ്?",                  options: ["Nehru","Sardar Patel","BR Ambedkar","Rajendra Prasad"],                        answer: 2, cat: "psc",       explanation: "Dr. BR Ambedkar is the Father of the Indian Constitution." },
  { id: "b6",  q: "National game of India?",         qm: "ദേശീയ കായിക വിനോദം?",                  options: ["Cricket","Football","Hockey","Kabaddi"],                                       answer: 2, cat: "psc",       explanation: "Hockey is the national game of India." },
  { id: "b7",  q: "IPC stands for?",                 qm: "IPC-യുടെ പൂർണ്ണ രൂപം?",                options: ["Indian Penal Code","Indian Police Code","Indian Penal Court","Indian Public Code"], answer: 0, cat: "police", explanation: "IPC - Indian Penal Code, enacted in 1860." },
  { id: "b8",  q: "Chemical symbol of Gold?",        qm: "സ്വർണ്ണത്തിന്റെ രാസ ചിഹ്നം?",         options: ["Go","Gd","Au","Ag"],                                                          answer: 2, cat: "science",   explanation: "Au comes from Latin 'Aurum'." },
  { id: "b9",  q: "Speed of light?",                 qm: "പ്രകാശ വേഗത?",                          options: ["3×10⁸ m/s","3×10⁶ m/s","3×10⁵ m/s","3×10⁴ m/s"],                            answer: 0, cat: "science",   explanation: "Speed of light = 3×10⁸ m/s." },
  { id: "b10", q: "Battle of Plassey year?",         qm: "പ്ലാസി യുദ്ധം?",                        options: ["1747","1757","1764","1799"],                                                   answer: 1, cat: "history",   explanation: "Battle of Plassey was fought in 1757." },
  { id: "b11", q: "Chandrayaan-3 landed in?",        qm: "ചന്ദ്രയാൻ-3 ഇറങ്ങിയ വർഷം?",           options: ["2021","2022","2023","2024"],                                                   answer: 2, cat: "current",   explanation: "Chandrayaan-3 landed on Moon on August 23, 2023." },
  { id: "b12", q: "Largest state in India by area?", qm: "ഏറ്റവും വലിയ സംസ്ഥാനം?",               options: ["MP","Maharashtra","Rajasthan","UP"],                                           answer: 2, cat: "geography", explanation: "Rajasthan is the largest state." },
];

// ─── Question Count Options ────────────────────────────────
const Q_COUNT_OPTIONS = [
  { value: 1,  label: "1 Question  (Quick Test)" },
  { value: 2,  label: "2 Questions" },
  { value: 5,  label: "5 Questions" },
  { value: 10, label: "10 Questions (Default)" },
  { value: 15, label: "15 Questions" },
  { value: 20, label: "20 Questions" },
  { value: 30, label: "30 Questions" },
  { value: 50, label: "50 Questions (Full Set)" },
];

// ─── Claude Quiz Generator Component ──────────────────────
function ClaudeQuizGenerator({ db, categories, user, showNotif }) {
  const [topic, setTopic] = useState("");
  const [targetCat, setTargetCat] = useState("ldc");
  const [qCount, setQCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [includeMalayalam, setIncludeMalayalam] = useState(false);
  const [generatedQs, setGeneratedQs] = useState([]);
  const [genStatus, setGenStatus] = useState("idle"); // idle | loading | done | error
  const [genMsg, setGenMsg] = useState("");

  const selectStyle = {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    background: "#111",
    color: "#fff",
    border: "1px solid #333",
    marginBottom: 8,
    fontSize: 14,
    cursor: "pointer",
  };

  const generateQuiz = async () => {
    if (!topic.trim()) {
      setGenMsg("❌ Topic ഇടൂ!");
      return;
    }
    setGenStatus("loading");
    setGenMsg(`🤖 Claude AI generating ${qCount} questions...`);
    setGeneratedQs([]);

    try {
      const malayalamInstruction = includeMalayalam
        ? `Also provide a Malayalam translation in the "qm" field for each question.`
        : `Set "qm" as empty string "" for all questions.`;

      const prompt = `You are a quiz generator for Kerala PSC exam preparation.
Generate exactly ${qCount} multiple choice questions about the topic: "${topic}".
Category: ${targetCat}. Difficulty: ${difficulty}.
${malayalamInstruction}

Rules:
- Each question must have exactly 4 options.
- "answer" is the zero-based index (0,1,2,3) of the correct option.
- Return ONLY a valid raw JSON array. No markdown, no backticks, no explanation.

Format:
[{"q":"Question text","qm":"Malayalam translation or empty","options":["A","B","C","D"],"answer":0,"explanation":"Brief explanation"}]`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are a quiz generator for Kerala PSC exam preparation. Always respond with valid JSON arrays only. No markdown, no backticks, no explanation text.",
          messages: [
            { role: "user", content: prompt }
          ],
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawText = data?.content
        ?.filter(b => b.type === "text")
        ?.map(b => b.text)
        ?.join("") || "";

      // Clean up any accidental markdown fences
      let cleaned = rawText.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Claude returned invalid JSON format.");

      const parsed = JSON.parse(match[0]);

      const normalized = parsed.map(q => ({
        q: q.q || q.question || "Untitled Question",
        qm: q.qm || "",
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["A", "B", "C", "D"],
        answer: typeof q.answer === "number" ? q.answer : 0,
        explanation: q.explanation || "",
        cat: targetCat.toLowerCase().trim(),
        _selected: true
      }));

      setGeneratedQs(normalized);
      setGenStatus("done");
      setGenMsg(`✅ ${normalized.length} ചോദ്യങ്ങൾ തയ്യാർ!`);
    } catch (e) {
      setGenStatus("error");
      setGenMsg(`❌ Error: ${e.message}`);
    }
  };

  const uploadSelected = async () => {
    const toUpload = generatedQs.filter(q => q._selected);
    if (!toUpload.length) {
      showNotif("ഒരു ചോദ്യമെങ്കിലും select ചെയ്യൂ!", "error");
      return;
    }
    showNotif("⏳ Uploading...");
    try {
      for (const q of toUpload) {
        const { _selected, ...qData } = q;
        await push(ref(db, "questions"), {
          ...qData,
          addedBy: user.email,
          addedAt: serverTimestamp()
        });
      }
      showNotif(`🚀 ${toUpload.length} ചോദ്യങ്ങൾ Firebase-ൽ upload ചെയ്തു!`);
      setGeneratedQs([]);
      setGenStatus("idle");
      setGenMsg("");
    } catch (err) {
      showNotif("Upload failed: " + err.message, "error");
    }
  };

  const toggleSelect = (idx) => {
    setGeneratedQs(prev => prev.map((q, i) => i === idx ? { ...q, _selected: !q._selected } : q));
  };

  const toggleAll = () => {
    const allSelected = generatedQs.every(q => q._selected);
    setGeneratedQs(prev => prev.map(q => ({ ...q, _selected: !allSelected })));
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 12, marginBottom: 15, border: "1px solid #1e1e3f" }}>

      {/* Claude Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ background: "linear-gradient(90deg,#d97706,#f59e0b,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: "bold", fontSize: 15 }}>✨ Claude AI</span>
        <span style={{ fontSize: 11, color: "#666", background: "#111", padding: "2px 8px", borderRadius: 10 }}>claude-sonnet-4</span>
      </div>

      {/* Topic Input */}
      <input
        value={topic}
        onChange={e => setTopic(e.target.value)}
        placeholder="Topic നൽകൂ (e.g. Indian Rivers, Kerala History)"
        style={{ ...selectStyle, border: "1px solid #444" }}
        onKeyDown={e => e.key === "Enter" && generateQuiz()}
      />

      {/* Category */}
      <label style={{ fontSize: 11, color: "#888", marginBottom: 3, display: "block" }}>📂 Category</label>
      <select value={targetCat} onChange={e => setTargetCat(e.target.value)} style={selectStyle}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
      </select>

      {/* Question Count */}
      <label style={{ fontSize: 11, color: "#888", marginBottom: 3, display: "block" }}>📊 ചോദ്യങ്ങളുടെ എണ്ണം</label>
      <select
        value={qCount}
        onChange={e => setQCount(Number(e.target.value))}
        style={{ ...selectStyle, border: "1px solid #6366f1" }}
      >
        {Q_COUNT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Difficulty */}
      <label style={{ fontSize: 11, color: "#888", marginBottom: 3, display: "block" }}>🎯 Difficulty</label>
      <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={selectStyle}>
        <option value="easy">Easy — ലളിതം</option>
        <option value="medium">Medium — മധ്യനില</option>
        <option value="hard">Hard — കഠിനം</option>
      </select>

      {/* Malayalam Toggle */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer", fontSize: 13, color: "#ccc" }}>
        <input
          type="checkbox"
          checked={includeMalayalam}
          onChange={e => setIncludeMalayalam(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "#6366f1" }}
        />
        മലയാളം ട്രാൻസ്ലേഷൻ ഉൾപ്പെടുത്തണോ? (qm field)
      </label>

      {/* Status Message */}
      {genMsg && (
        <div style={{
          fontSize: 12,
          color: genStatus === "error" ? "#ef4444" : genStatus === "done" ? "#10b981" : "#f59e0b",
          background: "rgba(0,0,0,0.4)",
          padding: "8px 12px",
          borderRadius: 8,
          marginBottom: 10,
          borderLeft: `3px solid ${genStatus === "error" ? "#ef4444" : genStatus === "done" ? "#10b981" : "#f59e0b"}`
        }}>
          {genMsg}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={generateQuiz}
        disabled={genStatus === "loading"}
        style={{
          padding: "12px 0",
          background: genStatus === "loading"
            ? "#222"
            : "linear-gradient(135deg, #d97706, #f59e0b)",
          border: "none",
          borderRadius: 8,
          width: "100%",
          fontWeight: "bold",
          color: "#fff",
          cursor: genStatus === "loading" ? "not-allowed" : "pointer",
          opacity: genStatus === "loading" ? 0.6 : 1,
          fontSize: 14,
          letterSpacing: 0.5
        }}
      >
        {genStatus === "loading"
          ? `⏳ Generating ${qCount} Questions...`
          : `✨ Generate ${qCount} Questions with Claude`}
      </button>

      {/* Generated Questions Preview */}
      {generatedQs.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <p style={{ fontSize: 12, color: "#aaa", margin: 0 }}>
              📋 Preview — {generatedQs.filter(q => q._selected).length}/{generatedQs.length} selected
            </p>
            <button onClick={toggleAll} style={{ fontSize: 11, background: "#222", color: "#aaa", border: "1px solid #333", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
              {generatedQs.every(q => q._selected) ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div style={{ maxHeight: 220, overflowY: "auto", background: "#000", borderRadius: 8, padding: 10 }}>
            {generatedQs.map((q, i) => (
              <label key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, cursor: "pointer", padding: "6px 8px", borderRadius: 6, background: q._selected ? "rgba(99,102,241,0.1)" : "transparent", border: q._selected ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent" }}>
                <input
                  type="checkbox"
                  checked={q._selected}
                  onChange={() => toggleSelect(i)}
                  style={{ marginTop: 3, accentColor: "#6366f1" }}
                />
                <div>
                  <span style={{ fontSize: 12, color: "#ddd" }}>{i + 1}. {q.q}</span>
                  {q.qm && <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}>{q.qm}</p>}
                  <p style={{ fontSize: 11, color: "#10b981", margin: "2px 0 0" }}>✅ {q.options[q.answer]}</p>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={uploadSelected}
            style={{
              padding: "12px 0",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: 8,
              width: "100%",
              fontWeight: "bold",
              color: "#fff",
              marginTop: 10,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            🚀 Upload {generatedQs.filter(q => q._selected).length} Qs to Firebase
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main App Component ────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("auth");
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [dn, setDn] = useState("");
  const [authErr, setAuthErr] = useState("");

  const [categories] = useState(DEFAULT_CATS);
  const [fbQ, setFbQ] = useState([]);
  const [allQ, setAllQ] = useState(BUILTIN_Q);
  const [dbError, setDbError] = useState("");

  const [selCat, setSelCat] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizCount, setQuizCount] = useState(10);
  const [curr, setCurr] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [adminTab, setAdminTab] = useState("fix");

  const [notif, setNotif] = useState(null);
  const showNotif = (msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  };

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setIsAdmin(u.email === SUPER_ADMIN);
        loadData(u.uid);
        setScreen("home");
      } else {
        setUser(null);
        setScreen("auth");
      }
    });
  }, []);

  // Merge builtin + firebase questions
  useEffect(() => {
    setAllQ([...BUILTIN_Q, ...fbQ]);
  }, [fbQ]);

  const loadData = (uid) => {
    setDbError("");
    onValue(ref(db, "questions"), snap => {
      const qs = [];
      if (snap.exists()) {
        snap.forEach(c => {
          const val = c.val();
          if (val) {
            qs.push({
              id: c.key,
              ...val,
              cat: val.cat ? String(val.cat).toLowerCase().trim() : "ldc"
            });
          }
        });
      }
      setFbQ(qs);
    }, err => {
      setDbError(err.message);
    });
  };

  const loginGoogle = async () => {
    setAuthErr("");
    try { await signInWithPopup(auth, gProvider); }
    catch (e) { setAuthErr("Google login failed. Try again."); }
  };

  const loginEmail = async () => {
    setAuthLoading(true); setAuthErr("");
    try {
      if (authMode === "register") {
        const cred = await createUserWithEmailAndPassword(auth, em, pw);
        await updateProfile(cred.user, { displayName: dn });
      } else {
        await signInWithEmailAndPassword(auth, em, pw);
      }
    } catch (e) { setAuthErr(e.message); }
    setAuthLoading(false);
  };

  const logout = () => { signOut(auth); };

  const startQuiz = (cat) => {
    const pool = cat === "mock"
      ? [...allQ]
      : allQ.filter(q => String(q.cat).toLowerCase().trim() === String(cat).toLowerCase().trim());
    const qs = pool.sort(() => Math.random() - 0.5).slice(0, quizCount);
    if (!qs.length) {
      showNotif("ഈ കാറ്റഗറിയിൽ ചോദ്യങ്ങൾ ലഭ്യമല്ല!", "error");
      return;
    }
    setSelCat(cat);
    setQuestions(qs);
    setCurr(0);
    setPicked(null);
    setScore(0);
    setAnswers([]);
    setScreen("quiz");
  };

  const handleAns = (i) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === questions[curr].answer;
    if (correct) setScore(s => s + 1);
    setAnswers(a => [...a, { q: questions[curr], sel: i, ok: correct }]);
  };

  const nextQ = () => {
    if (curr + 1 >= questions.length) setScreen("result");
    else { setCurr(c => c + 1); setPicked(null); }
  };

  const S = { minHeight: "100vh", background: "#05050f", color: "#e2e8f0", fontFamily: "sans-serif" };
  const Inp = { width: "100%", background: "#111", border: "1px solid #333", borderRadius: 10, padding: 12, color: "#fff", marginBottom: 10, boxSizing: "border-box" };

  // ─── Auth Screen ─────────────────────────────────────────
  if (screen === "auth") return (
    <div style={{ ...S, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#0f0f25", padding: 24, borderRadius: 16, border: "1px solid #222" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40 }}>🎓</div>
          <h2 style={{ margin: "8px 0 4px", color: "#a5b4fc" }}>PSC Quiz Kerala</h2>
          <p style={{ fontSize: 12, color: "#666", margin: 0 }}>Kerala PSC Exam Preparation</p>
        </div>

        <button onClick={loginGoogle} style={{ width: "100%", padding: 12, background: "#fff", color: "#333", border: "none", borderRadius: 8, fontWeight: "bold", marginBottom: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>G</span> Google-ൽ Continue ചെയ്യൂ
        </button>

        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: 9, background: authMode === "login" ? "#6366f1" : "#1a1a2e", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: authMode === "login" ? "bold" : "normal" }}>Login</button>
          <button onClick={() => setAuthMode("register")} style={{ flex: 1, padding: 9, background: authMode === "register" ? "#6366f1" : "#1a1a2e", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: authMode === "register" ? "bold" : "normal" }}>Register</button>
        </div>

        {authMode === "register" && <input value={dn} onChange={e => setDn(e.target.value)} placeholder="Full Name" style={Inp} />}
        <input value={em} onChange={e => setEm(e.target.value)} placeholder="Email" type="email" style={Inp} />
        <input value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" type="password" style={Inp} />

        {authErr && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{authErr}</p>}

        <button onClick={loginEmail} style={{ width: "100%", padding: 12, background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          {authLoading ? "Loading..." : authMode === "login" ? "Login" : "Register"}
        </button>
      </div>
    </div>
  );

  // ─── Main App ─────────────────────────────────────────────
  return (
    <div style={S}>
      {/* Notification */}
      {notif && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: notif.type === "error" ? "#ef4444" : "#10b981", padding: "10px 24px", borderRadius: 20, zIndex: 9999, fontSize: 13, fontWeight: "bold", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", whiteSpace: "nowrap" }}>
          {notif.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#0a0a1f", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1a1a3f", position: "sticky", top: 0, zIndex: 100 }}>
        <span onClick={() => setScreen("home")} style={{ fontWeight: "bold", color: "#a5b4fc", cursor: "pointer", fontSize: 16 }}>🎓 PSC Quiz Kerala</span>
        <div style={{ display: "flex", gap: 6 }}>
          {isAdmin && (
            <button onClick={() => setScreen("admin")} style={{ background: "#fbbf24", color: "#000", border: "none", padding: "6px 12px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 12 }}>
              👑 Admin
            </button>
          )}
          <button onClick={logout} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: 16 }}>

        {/* Firebase Error Alert */}
        {dbError && (
          <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", padding: 12, borderRadius: 10, marginBottom: 14, color: "#fca5a5" }}>
            <strong>⚠ Firebase Error!</strong>
            <p style={{ fontSize: 12, margin: "4px 0 0" }}>{dbError} — Firebase Console → Realtime Database → Rules → read, write: true ആക്കുക.</p>
          </div>
        )}

        {/* ─── HOME ─── */}
        {screen === "home" && (
          <div>
            <div style={{ background: "#0f0f25", padding: 16, borderRadius: 12, textAlign: "center", marginBottom: 16, border: "1px solid #1e1e3f" }}>
              <h3 style={{ margin: "0 0 4px", color: "#e879f9" }}>Kerala PSC Prep-ലേക്ക് സ്വാഗതം! 🎉</h3>
              <p style={{ fontSize: 12, color: "#666", margin: "0 0 12px" }}>
                ആകെ ചോദ്യങ്ങൾ: <strong style={{ color: "#a5b4fc" }}>{allQ.length}</strong> &nbsp;|&nbsp; DB-ൽ നിന്ന്: <strong style={{ color: "#10b981" }}>{fbQ.length}</strong>
              </p>

              {/* Quiz Count Selector on Home */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, justifyContent: "center" }}>
                <span style={{ fontSize: 12, color: "#888" }}>ചോദ്യങ്ങൾ:</span>
                <select
                  value={quizCount}
                  onChange={e => setQuizCount(Number(e.target.value))}
                  style={{ background: "#1a1a3f", color: "#fff", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", fontSize: 13, cursor: "pointer" }}
                >
                  {Q_COUNT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value} Qs</option>)}
                </select>
              </div>

              <button onClick={() => startQuiz("mock")} style={{ width: "100%", padding: 13, background: "linear-gradient(135deg,#ec7293,#a855f7)", border: "none", borderRadius: 8, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: 14 }}>
                🎯 Full Mock Test Start ചെയ്യൂ
              </button>
            </div>

            <h4 style={{ color: "#888", marginBottom: 10, fontSize: 13 }}>📚 Categories</h4>
            {categories.map(cat => {
              const count = allQ.filter(q => String(q.cat).toLowerCase().trim() === String(cat.id).toLowerCase().trim()).length;
              return (
                <div key={cat.id} onClick={() => startQuiz(cat.id)}
                  style={{ background: "#0f0f25", padding: 13, borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderLeft: `4px solid ${cat.color}`, transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#141430"}
                  onMouseLeave={e => e.currentTarget.style.background = "#0f0f25"}
                >
                  <span style={{ fontSize: 14 }}>{cat.icon} {cat.label}</span>
                  <span style={{ background: "#1a1a3f", padding: "4px 10px", borderRadius: 6, fontSize: 12, color: cat.color, fontWeight: "bold" }}>{count} Qs</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── QUIZ ─── */}
        {screen === "quiz" && questions[curr] && (
          <div>
            {/* Progress Bar */}
            <div style={{ background: "#1a1a3f", borderRadius: 4, height: 4, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ background: "#6366f1", height: "100%", width: `${((curr + 1) / questions.length) * 100}%`, transition: "width 0.3s" }} />
            </div>

            <div style={{ background: "#0f0f25", padding: 16, borderRadius: 12, marginBottom: 14, border: "1px solid #1e1e3f" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#888" }}>ചോദ്യം {curr + 1}/{questions.length}</span>
                <span style={{ fontSize: 12, color: "#10b981" }}>Score: {score}</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: "bold", margin: "0 0 6px", lineHeight: 1.5 }}>{questions[curr].q}</p>
              {questions[curr].qm && <p style={{ color: "#888", fontSize: 14, margin: 0 }}>{questions[curr].qm}</p>}
            </div>

            {questions[curr].options.map((opt, i) => {
              let bg = "#0f0f25";
              let border = "1px solid #1e1e3f";
              if (picked !== null) {
                if (i === questions[curr].answer) { bg = "rgba(16,185,129,0.2)"; border = "1px solid #10b981"; }
                else if (i === picked) { bg = "rgba(239,68,68,0.2)"; border = "1px solid #ef4444"; }
              }
              return (
                <button key={i} onClick={() => handleAns(i)}
                  style={{ width: "100%", padding: 13, background: bg, color: "#fff", border, borderRadius: 10, textAlign: "left", marginBottom: 8, cursor: picked !== null ? "default" : "pointer", fontSize: 14, transition: "all 0.15s" }}>
                  <span style={{ color: "#6366f1", fontWeight: "bold", marginRight: 8 }}>{["A","B","C","D"][i]}.</span>{opt}
                </button>
              );
            })}

            {picked !== null && (
              <div>
                {questions[curr].explanation && (
                  <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", padding: 10, borderRadius: 8, marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: "#a5b4fc", margin: 0 }}>💡 {questions[curr].explanation}</p>
                  </div>
                )}
                <button onClick={nextQ} style={{ width: "100%", padding: 13, background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: 14 }}>
                  {curr + 1 >= questions.length ? "Result കാണൂ 🎉" : "അടുത്ത ചോദ്യം →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── RESULT ─── */}
        {screen === "result" && (
          <div style={{ textAlign: "center", padding: 10 }}>
            <div style={{ fontSize: 60, marginBottom: 8 }}>
              {score === questions.length ? "🏆" : score >= questions.length * 0.7 ? "👍" : "📚"}
            </div>
            <h2 style={{ margin: "0 0 4px" }}>Quiz പൂർത്തിയായി!</h2>
            <h1 style={{ color: "#a855f7", fontSize: 48, margin: "8px 0" }}>{score}<span style={{ fontSize: 24, color: "#666" }}>/{questions.length}</span></h1>
            <p style={{ color: "#888", marginBottom: 16 }}>
              {score === questions.length ? "Perfect Score! അതിഗംഭീരം! 🎉" : score >= questions.length * 0.7 ? "നന്നായി ചെയ്തു! 👏" : "തുടർന്ന് പ്രാക്ടീസ് ചെയ്യൂ! 💪"}
            </p>

            <div style={{ background: "#0f0f25", borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "left", border: "1px solid #1e1e3f" }}>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>📋 Answer Review:</p>
              {answers.map((a, i) => (
                <div key={i} style={{ marginBottom: 10, borderBottom: "1px solid #111", paddingBottom: 10 }}>
                  <p style={{ fontSize: 13, margin: 0, color: "#ddd" }}>{i + 1}. {a.q.q}</p>
                  <p style={{ fontSize: 12, margin: "4px 0 0", color: a.ok ? "#10b981" : "#ef4444" }}>
                    {a.ok ? "✅" : "❌"} {a.q.options[a.sel]}
                    {!a.ok && <span style={{ color: "#10b981" }}> → ശരി: {a.q.options[a.q.answer]}</span>}
                  </p>
                  {a.q.explanation && <p style={{ fontSize: 11, color: "#666", margin: "2px 0 0" }}>💡 {a.q.explanation}</p>}
                </div>
              ))}
            </div>

            <button onClick={() => setScreen("home")} style={{ padding: "12px 32px", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: 14 }}>
              🏠 Home-ലേക്ക് പോകൂ
            </button>
          </div>
        )}

        {/* ─── ADMIN ─── */}
        {screen === "admin" && isAdmin && (
          <div>
            <h3 style={{ color: "#fbbf24", marginBottom: 14 }}>👑 Super Admin Panel</h3>

            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <button onClick={() => setAdminTab("fix")} style={{ flex: 1, padding: 9, background: adminTab === "fix" ? "#6366f1" : "#1a1a2e", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: adminTab === "fix" ? "bold" : "normal" }}>🛠 DB Fix</button>
              <button onClick={() => setAdminTab("ai")} style={{ flex: 1, padding: 9, background: adminTab === "ai" ? "#6366f1" : "#1a1a2e", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: adminTab === "ai" ? "bold" : "normal" }}>✨ AI Generator</button>
            </div>

            {adminTab === "fix" && (
              <div style={{ background: "#0f0f25", padding: 16, borderRadius: 12, border: "1px solid #ef4444" }}>
                <h4 style={{ marginTop: 0 }}>🛠 Live Data Debugger</h4>
                <p style={{ fontSize: 12, color: "#aaa" }}>Firebase DB-ൽ നിന്ന് ലോഡ് ചെയ്ത ചോദ്യങ്ങൾ: <strong style={{ color: "#10b981" }}>{fbQ.length}</strong></p>

                <div style={{ background: "#000", padding: 10, borderRadius: 8, maxHeight: 160, overflowY: "auto", fontSize: 11, fontFamily: "monospace", color: "#10b981", marginBottom: 12 }}>
                  {fbQ.length === 0 ? "Firebase-ൽ നിന്ന് ഡാറ്റ ലഭിച്ചിട്ടില്ല." : JSON.stringify(fbQ.slice(0, 2), null, 2)}
                </div>

                <button onClick={async () => {
                  if (fbQ.length === 0) { showNotif("തിരുത്താൻ ചോദ്യങ്ങളൊന്നുമില്ല!", "error"); return; }
                  showNotif("⏳ Fixing...");
                  for (let q of fbQ) {
                    if (q.id) {
                      const cleanCat = q.cat ? String(q.cat).toLowerCase().trim() : "ldc";
                      await update(ref(db, `questions/${q.id}`), { cat: cleanCat });
                    }
                  }
                  showNotif("✅ Categories sync ചെയ്തു!");
                }} style={{ width: "100%", padding: 10, background: "#10b981", border: "none", borderRadius: 8, color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                  🔀 Auto-Fix Category Formats
                </button>
              </div>
            )}

            {adminTab === "ai" && (
              <ClaudeQuizGenerator db={db} categories={categories} user={user} showNotif={showNotif} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
