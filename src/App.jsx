import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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

// ─── Q Count Options ────────────────────────────────────────
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

// ─── Puter.js AI Quiz Generator ──────────────────────────────
function PuterQuizGenerator({ db, categories, user, showNotif }) {
  const [topic, setTopic] = useState("");
  const [targetCat, setTargetCat] = useState("ldc");
  const [qCount, setQCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [includeMalayalam, setIncludeMalayalam] = useState(false);
  const [generatedQs, setGeneratedQs] = useState([]);
  const [genStatus, setGenStatus] = useState("idle");
  const [genMsg, setGenMsg] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [editingIdx, setEditingIdx] = useState(null);
  const [editQ, setEditQ] = useState(null);
  const [isPuterSignedIn, setIsPuterSignedIn] = useState(false);

  useEffect(() => {
    if (window.puter && window.puter.auth && window.puter.auth.isSignedIn()) {
      setIsPuterSignedIn(true);
    }
  }, []);

  const handlePuterLogin = async () => {
    try {
      await window.puter.auth.signIn();
      setIsPuterSignedIn(true);
      showNotif("Puter Login Success!");
    } catch (error) {
      setGenMsg("❌ Puter login failed.");
    }
  };

  const generateQuiz = async () => {
    if (!topic.trim()) { setGenMsg("❌ Topic ഇടൂ!"); return; }
    setGenStatus("loading");
    setGenMsg(`🤖 Puter AI generating ${qCount} questions...`);
    try {
      const malayalamInstruction = includeMalayalam
        ? `Also provide a Malayalam translation in "qm" field.`
        : `Leave "qm" as "".`;
      const prompt = `Generate exactly ${qCount} MCQs about "${topic}". Category: ${targetCat}. Difficulty: ${difficulty}. ${malayalamInstruction} Return ONLY a JSON array: [{"q":"?", "qm":"", "options":["","","",""], "answer":0, "explanation":""}]`;
      const response = await window.puter.ai.chat(prompt);
      let rawText = typeof response === 'string' ? response : response?.text || JSON.stringify(response);
      let cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned.match(/\[[\s\S]*\]/)[0]);

      const normalized = parsed.map(q => ({
        q: q.q || q.question || "Untitled Question",
        qm: q.qm || "",
        options: q.options || ["A", "B", "C", "D"],
        answer: typeof q.answer === "number" ? q.answer : 0,
        explanation: q.explanation || "",
        cat: targetCat.toLowerCase().trim(),
        _selected: true
      }));
      setGeneratedQs(normalized);
      setGenStatus("done");
      setGenMsg(`✅ Generated ${normalized.length} questions!`);
    } catch (e) {
      setGenStatus("error");
      setGenMsg(`❌ Error: ${e.message}`);
    }
  };

  const uploadSelected = async () => {
    const toUpload = generatedQs.filter(q => q._selected);
    if (!toUpload.length) return;
    setUploadStatus("⏳ Uploading...");
    try {
      for (const q of toUpload) {
        const { _selected, ...qData } = q;
        await push(ref(db, "questions"), { ...qData, addedBy: user.email, addedAt: serverTimestamp() });
      }
      showNotif("🚀 Uploaded successfully!");
      setGeneratedQs([]);
    } catch (err) {
      showNotif("Upload failed: " + err.message, "error");
    } finally { setUploadStatus(""); }
  };

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

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 12, marginBottom: 15 }}>

      {/* Topic Input */}
      <input
        value={topic}
        onChange={e => setTopic(e.target.value)}
        placeholder="Enter Topic (e.g. India Rivers)"
        style={{ width: "100%", padding: 10, borderRadius: 8, background: "#111", color: "#fff", border: "1px solid #333", marginBottom: 8 }}
      />

      {/* Category Select */}
      <select value={targetCat} onChange={e => setTargetCat(e.target.value)} style={selectStyle}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>

      {/* ✅ Question Count Select — Updated with multiple options */}
      <label style={{ fontSize: 12, color: "#aaa", marginBottom: 4, display: "block" }}>
        📊 Number of Questions to Generate:
      </label>
      <select
        value={qCount}
        onChange={e => setQCount(Number(e.target.value))}
        style={{ ...selectStyle, borderColor: "#6366f1" }}
      >
        {Q_COUNT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Difficulty Select */}
      <label style={{ fontSize: 12, color: "#aaa", marginBottom: 4, display: "block" }}>
        🎯 Difficulty Level:
      </label>
      <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={selectStyle}>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      {/* Malayalam Toggle */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer", fontSize: 13, color: "#ccc" }}>
        <input
          type="checkbox"
          checked={includeMalayalam}
          onChange={e => setIncludeMalayalam(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        Include Malayalam Translation (qm)
      </label>

      {/* Status Message */}
      {genMsg && (
        <p style={{
          fontSize: 12,
          color: genStatus === "error" ? "#ef4444" : genStatus === "done" ? "#10b981" : "#f59e0b",
          marginBottom: 8,
          background: "rgba(0,0,0,0.3)",
          padding: "6px 10px",
          borderRadius: 6
        }}>
          {genMsg}
        </p>
      )}

      {/* Login / Generate Button */}
      {!isPuterSignedIn ? (
        <button
          onClick={handlePuterLogin}
          style={{ padding: 10, background: "#f59e0b", border: "none", borderRadius: 8, width: "100%", fontWeight: "bold", cursor: "pointer" }}
        >
          Login to Puter AI
        </button>
      ) : (
        <button
          onClick={generateQuiz}
          disabled={genStatus === "loading"}
          style={{
            padding: 10,
            background: genStatus === "loading" ? "#333" : "#10b981",
            border: "none",
            borderRadius: 8,
            width: "100%",
            fontWeight: "bold",
            color: "#fff",
            cursor: genStatus === "loading" ? "not-allowed" : "pointer",
            opacity: genStatus === "loading" ? 0.7 : 1
          }}
        >
          {genStatus === "loading" ? `⏳ Generating ${qCount} Questions...` : `🤖 Generate ${qCount} Questions`}
        </button>
      )}

      {/* Generated Questions Preview */}
      {generatedQs.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, color: "#aaa", marginBottom: 6 }}>
            📋 Preview ({generatedQs.filter(q => q._selected).length} selected):
          </p>
          <div style={{ maxHeight: 200, overflowY: "auto", background: "#000", borderRadius: 8, padding: 8 }}>
            {generatedQs.map((q, i) => (
              <label key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={q._selected}
                  onChange={() => {
                    const updated = [...generatedQs];
                    updated[i]._selected = !updated[i]._selected;
                    setGeneratedQs(updated);
                  }}
                  style={{ marginTop: 3 }}
                />
                <span style={{ fontSize: 11, color: "#ccc" }}>{i + 1}. {q.q}</span>
              </label>
            ))}
          </div>
          <button
            onClick={uploadSelected}
            style={{
              padding: 10,
              background: "#6366f1",
              border: "none",
              borderRadius: 8,
              width: "100%",
              fontWeight: "bold",
              color: "#fff",
              marginTop: 8,
              cursor: "pointer"
            }}
          >
            🚀 Upload {generatedQs.filter(q => q._selected).length} Qs to Firebase
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main App Component ────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("splash");
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [dn, setDn] = useState("");
  const [authErr, setAuthErr] = useState("");

  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [fbQ, setFbQ] = useState([]);
  const [allQ, setAllQ] = useState(BUILTIN_Q);
  const [myStats, setMyStats] = useState({});
  const [dbError, setDbError] = useState("");

  const [selCat, setSelCat] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizCount, setQuizCount] = useState(10);
  const [curr, setCurr] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [adminTab, setAdminTab] = useState("fix");

  const [newQ, setNewQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:"" });
  const [notif, setNotif] = useState(null);
  const showNotif = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const admin = u.email === SUPER_ADMIN;
        setIsAdmin(admin);
        loadData(u.uid);
        setScreen("home");
      } else {
        setUser(null); setScreen("auth");
      }
    });
  }, []);

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

    onValue(ref(db, `users/${uid}/stats`), snap => { if(snap.exists()) setMyStats(snap.val()); });
  };

  const loginGoogle = async () => {
    try { await signInWithPopup(auth, gProvider); } catch(e) { setAuthErr("Google login failed."); }
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
    } catch(e) { setAuthErr(e.message); }
    setAuthLoading(false);
  };

  const logout = () => { signOut(auth); setScreen("auth"); };

  const startQuiz = (cat) => {
    const pool = cat === "mock" ? [...allQ] : allQ.filter(q => String(q.cat).toLowerCase().trim() === String(cat).toLowerCase().trim());
    const qs = pool.sort(() => Math.random() - 0.5).slice(0, quizCount);
    if (!qs.length) {
      showNotif("ഈ കാറ്റഗറിയിൽ ചോദ്യങ്ങൾ ലഭ്യമല്ല!", "error");
      return;
    }
    setSelCat(cat); setQuestions(qs); setCurr(0); setPicked(null); setScore(0); setAnswers([]); setScreen("quiz");
  };

  const handleAns = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[curr].answer) setScore(s => s + 1);
    setAnswers(a => [...a, { q: questions[curr], sel: i, ok: i === questions[curr].answer }]);
  };

  const nextQ = () => {
    if (curr + 1 >= questions.length) setScreen("result");
    else { setCurr(c => c + 1); setPicked(null); }
  };

  const S = { minHeight:"100vh", background:"#05050f", color:"#e2e8f0", fontFamily:"sans-serif" };
  const Inp = { width:"100%", background:"#111", border:"1px solid #333", borderRadius:10, padding:12, color:"#fff", marginBottom:10 };

  if (screen === "auth") return (
    <div style={{...S, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div style={{width:"100%", maxWidth:400, background:"#0f0f25", padding:20, borderRadius:16, border:"1px solid #222"}}>
        <h2 style={{textAlign:"center", color:"#a5b4fc", marginBottom:20}}>🎓 PSC Quiz Kerala Login</h2>
        <button onClick={loginGoogle} style={{width:"100%", padding:12, background:"#fff", color:"#000", border:"none", borderRadius:8, fontWeight:"bold", marginBottom:15, cursor:"pointer"}}>Continue with Google</button>
        <div style={{display:"flex", marginBottom:10, gap:5}}>
          <button onClick={()=>setAuthMode("login")} style={{flex:1, padding:8, background:authMode==="login"?"#6366f1":"#222", border:"none", borderRadius:6, color:"#fff"}}>Login</button>
          <button onClick={()=>setAuthMode("register")} style={{flex:1, padding:8, background:authMode==="register"?"#6366f1":"#222", border:"none", borderRadius:6, color:"#fff"}}>Register</button>
        </div>
        {authMode==="register" && <input value={dn} onChange={e=>setDn(e.target.value)} placeholder="Full Name" style={Inp} />}
        <input value={em} onChange={e=>setEm(e.target.value)} placeholder="Email" style={Inp} />
        <input value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" type="password" style={Inp} />
        {authErr && <p style={{color:"#ef4444", fontSize:12}}>{authErr}</p>}
        <button onClick={loginEmail} style={{width:"100%", padding:12, background:"#6366f1", border:"none", borderRadius:8, color:"#fff", fontWeight:"bold", cursor:"pointer"}}>{authLoading?"Loading...":"Submit"}</button>
      </div>
    </div>
  );

  return (
    <div style={S}>
      {notif && <div style={{position:"fixed", top:10, left:"50%", transform:"translateX(-50%)", background:notif.type==="error"?"#ef4444":"#10b981", padding:"10px 20px", borderRadius:20, zIndex:9999}}>{notif.msg}</div>}

      <div style={{background:"#0f0f25", padding:15, display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #222"}}>
        <span onClick={()=>setScreen("home")} style={{fontWeight:"bold", color:"#a5b4fc", cursor:"pointer"}}>🎓 PSC Quiz Kerala</span>
        <div>
          {isAdmin && <button onClick={()=>setScreen("admin")} style={{background:"#fbbf24", color:"#000", border:"none", padding:"6px 12px", borderRadius:6, marginRight:5, fontWeight:"bold", cursor:"pointer"}}>👑 Admin</button>}
          <button onClick={logout} style={{background:"#ef4444", color:"#fff", border:"none", padding:"6px 12px", borderRadius:6, cursor:"pointer"}}>Logout</button>
        </div>
      </div>

      <div style={{maxWidth:500, margin:"0 auto", padding:15}}>

        {dbError && (
          <div style={{background:"rgba(239,68,68,0.2)", border:"1px solid #ef4444", padding:12, borderRadius:10, marginBottom:15, color:"#fca5a5"}}>
            <h4 style={{margin:0}}>⚠ Firebase Error Detected!</h4>
            <p style={{fontSize:12, margin:"4px 0 0"}}>{dbError}. (Firebase Console → Realtime Database → Rules → read, write: true ആക്കുക)</p>
          </div>
        )}

        {screen === "home" && (
          <div>
            <div style={{background:"#0f0f25", padding:15, borderRadius:12, textAlign:"center", marginBottom:15, border:"1px solid #222"}}>
              <h3 style={{margin:0, color:"#e879f9"}}>Welcome to Kerala PSC Prep</h3>
              <p style={{fontSize:12, color:"#888"}}>Total Questions: {allQ.length} (From DB: {fbQ.length})</p>
              <button onClick={()=>startQuiz("mock")} style={{width:"100%", padding:12, background:"#ec7293", border:"none", borderRadius:8, color:"#fff", fontWeight:"bold", marginTop:10, cursor:"pointer"}}>🎯 Start Full Mock Test</button>
            </div>

            <h4 style={{color:"#aaa", marginBottom:10}}>Categories</h4>
            {categories.map(cat => {
              const count = allQ.filter(q => String(q.cat).toLowerCase().trim() === String(cat.id).toLowerCase().trim()).length;
              return (
                <div key={cat.id} onClick={()=>startQuiz(cat.id)} style={{background:"#0f0f25", padding:12, borderRadius:10, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", borderLeft:`4px solid ${cat.color}`}}>
                  <span>{cat.icon} {cat.label}</span>
                  <span style={{background:"#222", padding:"4px 8px", borderRadius:6, fontSize:12, color:cat.color, fontWeight:"bold"}}>{count} Qs</span>
                </div>
              );
            })}
          </div>
        )}

        {screen === "quiz" && questions[curr] && (
          <div>
            <div style={{background:"#0f0f25", padding:15, borderRadius:12, marginBottom:15}}>
              <h4>Question {curr+1}/{questions.length}</h4>
              <p style={{fontSize:16, fontWeight:"bold"}}>{questions[curr].q}</p>
              {questions[curr].qm && <p style={{color:"#aaa", fontSize:14}}>{questions[curr].qm}</p>}
            </div>
            {questions[curr].options.map((opt, i) => {
              let bg = "#0f0f25";
              if (picked !== null) {
                if (i === questions[curr].answer) bg = "rgba(16,185,129,0.2)";
                else if (i === picked) bg = "rgba(239,68,68,0.2)";
              }
              return (
                <button key={i} onClick={()=>handleAns(i)} style={{width:"100%", padding:12, background:bg, color:"#fff", border:"1px solid #222", borderRadius:10, textAlign:"left", marginBottom:8, cursor:"pointer"}}>
                  {i+1}. {opt}
                </button>
              );
            })}
            {picked !== null && <button onClick={nextQ} style={{width:"100%", padding:12, background:"#6366f1", border:"none", borderRadius:8, color:"#fff", fontWeight:"bold", marginTop:10, cursor:"pointer"}}>Next</button>}
          </div>
        )}

        {screen === "result" && (
          <div style={{textAlign:"center", padding:20}}>
            <h2>🎉 Quiz Completed!</h2>
            <h1 style={{color:"#a855f7"}}>{score}/{questions.length}</h1>
            <p style={{color:"#aaa"}}>
              {score === questions.length ? "🏆 Perfect Score!" : score >= questions.length * 0.7 ? "👍 Good Job!" : "📚 Keep Practicing!"}
            </p>
            <div style={{background:"#0f0f25", borderRadius:12, padding:15, marginTop:15, textAlign:"left"}}>
              {answers.map((a, i) => (
                <div key={i} style={{marginBottom:8, borderBottom:"1px solid #222", paddingBottom:8}}>
                  <p style={{fontSize:13, margin:0, color:"#ccc"}}>{i+1}. {a.q.q}</p>
                  <p style={{fontSize:12, margin:"4px 0 0", color: a.ok ? "#10b981" : "#ef4444"}}>
                    {a.ok ? "✅" : "❌"} Your answer: {a.q.options[a.sel]}
                    {!a.ok && ` | Correct: ${a.q.options[a.q.answer]}`}
                  </p>
                  {a.q.explanation && <p style={{fontSize:11, color:"#888", margin:"2px 0 0"}}>💡 {a.q.explanation}</p>}
                </div>
              ))}
            </div>
            <button onClick={()=>setScreen("home")} style={{padding:"10px 20px", background:"#6366f1", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", marginTop:15}}>Go Home</button>
          </div>
        )}

        {screen === "admin" && isAdmin && (
          <div>
            <h3 style={{color:"#fbbf24"}}>👑 Super Admin Panel</h3>
            <div style={{display:"flex", gap:5, marginBottom:15}}>
              <button onClick={()=>setAdminTab("fix")} style={{flex:1, padding:8, background:adminTab==="fix"?"#6366f1":"#222", border:"none", borderRadius:6, color:"#fff"}}>Database Fix</button>
              <button onClick={()=>setAdminTab("ai")} style={{flex:1, padding:8, background:adminTab==="ai"?"#6366f1":"#222", border:"none", borderRadius:6, color:"#fff"}}>AI Generator</button>
            </div>

            {adminTab === "fix" && (
              <div style={{background:"#0f0f25", padding:15, borderRadius:12, border:"1px solid #ef4444"}}>
                <h4>🛠 Live Data Debugger</h4>
                <p style={{fontSize:12, color:"#aaa"}}>ആപ്പിലേക്ക് ലോഡ് ചെയ്ത ആകെ ഡാറ്റാബേസ് ചോദ്യങ്ങൾ: <strong>{fbQ.length}</strong></p>
                <div style={{background:"#000", padding:10, borderRadius:8, maxHeight:150, overflowY:"auto", fontSize:11, fontFamily:"monospace", color:"#10b981"}}>
                  {fbQ.length === 0 ? "No data fetched from Firebase yet." : JSON.stringify(fbQ.slice(0, 2), null, 2)}
                </div>
                <button onClick={async () => {
                  if (fbQ.length === 0) { showNotif("തിരുത്താൻ ചോദ്യങ്ങളൊന്നും ലഭിച്ചിട്ടില്ല!", "error"); return; }
                  showNotif("⏳ Fixing Category Formats...");
                  for (let q of fbQ) {
                    if (q.id) {
                      const cleanCat = q.cat ? String(q.cat).toLowerCase().trim() : "ldc";
                      await update(ref(db, `questions/${q.id}`), { cat: cleanCat });
                    }
                  }
                  showNotif("✅ All Database categories synchronized!");
                }} style={{width:"100%", padding:10, background:"#10b981", border:"none", borderRadius:8, color:"#fff", fontWeight:"bold", marginTop:10, cursor:"pointer"}}>
                  🔀 Auto-Fix & Sync Mismatched Categories
                </button>
              </div>
            )}

            {adminTab === "ai" && <PuterQuizGenerator db={db} categories={categories} user={user} showNotif={showNotif} />}
          </div>
        )}

      </div>
    </div>
  );
}
