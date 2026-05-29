import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
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

// 🔴 ഇതാണ് ഏറ്റവും പ്രധാനപ്പെട്ട വരി: ഏഷ്യൻ ഡാറ്റാബേസ് ലിങ്ക് നേരിട്ട് നൽകിയിരിക്കുന്നു 🔴
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
];

// ─── Puter.js AI Quiz Generator ──────────────────────────────
function PuterQuizGenerator({ db, categories, user, showNotif }) {
  const [topic, setTopic] = useState("");
  const [targetCat, setTargetCat] = useState("ldc");
  const [qCount, setQCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [generatedQs, setGeneratedQs] = useState([]);
  const [genStatus, setGenStatus] = useState("idle");
  const [genMsg, setGenMsg] = useState("");
  const [isPuterSignedIn, setIsPuterSignedIn] = useState(false);

  useEffect(() => {
    if (window.puter && window.puter.auth && window.puter.auth.isSignedIn()) setIsPuterSignedIn(true);
  }, []);

  const handlePuterLogin = async () => {
    try { await window.puter.auth.signIn(); setIsPuterSignedIn(true); showNotif("Puter Login Success!"); } 
    catch (e) { setGenMsg("❌ ലോഗിൻ പരാജയപ്പെട്ടു."); }
  };

  const generateQuiz = async () => {
    if (!topic.trim()) { setGenMsg("❌ Topic ഇടൂ!"); return; }
    setGenStatus("loading"); setGenMsg("🤖 Puter AI generating questions..."); setGeneratedQs([]);
    try {
      const prompt = `Create ${qCount} Kerala PSC MCQs about "${topic}". Difficulty: ${difficulty}. Category: ${targetCat}. Return ONLY a JSON array: [{"q":"Eng Q", "qm":"", "options":["A","B","C","D"], "answer":0, "explanation":"Exp"}]`;
      const response = await Promise.race([
        window.puter.ai.chat(prompt),
        new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 30000))
      ]);
      let rawText = typeof response === 'string' ? response : response?.text || (Array.isArray(response?.message?.content) ? response.message.content.map(b=>b.text).join('') : response?.message?.content) || JSON.stringify(response);
      let cleaned = String(rawText).trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned.match(/\[[\s\S]*\]/)[0]);
      
      const normalized = parsed.map((q, i) => {
        let ansIdx = typeof q.answer === "number" ? q.answer : 0;
        return {
          q: q.q || `Question ${i + 1}`, qm: q.qm || "", options: q.options || ["A", "B", "C", "D"], answer: ansIdx, explanation: q.explanation || "", cat: targetCat.toLowerCase().trim()
        };
      });
      setGeneratedQs(normalized); setGenStatus("done"); setGenMsg(`✅ ${normalized.length} questions generated!`);
    } catch (e) { setGenStatus("error"); setGenMsg(`❌ Error: ${e.message}`); }
  };

  const uploadSelected = async () => {
    if (!generatedQs.length) return;
    setGenMsg("⏳ Uploading...");
    try {
      for (const q of generatedQs) {
        await push(ref(db, "questions"), { ...q, addedBy: user.email, addedAt: serverTimestamp() });
      }
      showNotif(`🎉 Questions uploaded successfully!`);
      setGeneratedQs([]); setGenStatus("idle");
    } catch (err) { setGenMsg("Error: " + err.message); }
  };

  return (
    <div style={{background:"rgba(255,255,255,0.05)", padding:15, borderRadius:12, marginBottom:15}}>
      <h3 style={{color:"#10b981", marginBottom:10}}>🤖 AI Quiz Generator</h3>
      <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic (e.g. Kerala History)" style={{width:"100%", padding:10, borderRadius:8, background:"#111", color:"#fff", border:"1px solid #333", marginBottom:8}} />
      <div style={{display:"flex", gap:8, marginBottom:10}}>
        <select value={targetCat} onChange={e => setTargetCat(e.target.value)} style={{flex:1, padding:10, borderRadius:8, background:"#111", color:"#fff", border:"1px solid #333"}}>
          {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={qCount} onChange={e => setQCount(Number(e.target.value))} style={{flex:1, padding:10, borderRadius:8, background:"#111", color:"#fff", border:"1px solid #333"}}>
          {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} Questions</option>)}
        </select>
      </div>
      <p style={{fontSize:12, color:"#aaa"}}>{genMsg}</p>
      
      {!isPuterSignedIn ? ( <button onClick={handlePuterLogin} style={{padding:10, background:"#f59e0b", border:"none", borderRadius:8, width:"100%", fontWeight:"bold", cursor:"pointer"}}>Login to Puter AI</button>
      ) : ( <button onClick={generateQuiz} disabled={genStatus==="loading"} style={{padding:10, background:"#10b981", border:"none", borderRadius:8, width:"100%", fontWeight:"bold", color:"#fff", cursor:"pointer"}}>Generate Questions</button> )}

      {generatedQs.length > 0 && (
        <button onClick={uploadSelected} style={{padding:10, background:"#6366f1", border:"none", borderRadius:8, width:"100%", fontWeight:"bold", color:"#fff", marginTop:10, cursor:"pointer"}}>🚀 Upload {generatedQs.length} Qs to Firebase</button>
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
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [dn, setDn] = useState("");
  const [authErr, setAuthErr] = useState("");

  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [fbQ, setFbQ] = useState([]);
  const [allQ, setAllQ] = useState(BUILTIN_Q);
  const [dbError, setDbError] = useState("");

  const [selCat, setSelCat] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [curr, setCurr] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [adminTab, setAdminTab] = useState("fix");

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

  useEffect(() => { setAllQ([...BUILTIN_Q, ...fbQ]); }, [fbQ]);

  const loadData = (uid) => {
    setDbError("");
    onValue(ref(db, "questions"), snap => {
      const qs = [];
      if (snap.exists()) {
        snap.forEach(c => {
          const val = c.val();
          if (val) qs.push({ id: c.key, ...val, cat: val.cat ? String(val.cat).toLowerCase().trim() : "ldc" });
        });
      }
      setFbQ(qs);
    }, err => setDbError(err.message));

    onValue(ref(db, "categories"), snap => {
      if(snap.exists()) { 
        const cs=[]; snap.forEach(c=>cs.push({id:c.key,...c.val()})); 
        setCategories([...DEFAULT_CATS,...cs]); 
      } else setCategories(DEFAULT_CATS);
    });
  };

  const loginGoogle = async () => { try { await signInWithPopup(auth, gProvider); } catch(e) { setAuthErr("Google login failed."); } };
  const logout = () => { signOut(auth); setScreen("auth"); };

  const startQuiz = (cat) => {
    const pool = cat === "mock" ? [...allQ] : allQ.filter(q => String(q.cat).toLowerCase().trim() === String(cat).toLowerCase().trim());
    const qs = pool.sort(() => Math.random() - 0.5).slice(0, 10);
    if (!qs.length) return showNotif("ഈ കാറ്റഗറിയിൽ ചോദ്യങ്ങൾ ലഭ്യമല്ല!", "error");
    setSelCat(cat); setQuestions(qs); setCurr(0); setPicked(null); setScore(0); setScreen("quiz");
  };

  const handleAns = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[curr].answer) setScore(s => s + 1);
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
        <h2 style={{textAlign:"center", color:"#a5b4fc", marginBottom:20}}>🎓 PSC Quiz Kerala</h2>
        <button onClick={loginGoogle} style={{width:"100%", padding:12, background:"#fff", color:"#000", border:"none", borderRadius:8, fontWeight:"bold", marginBottom:15, cursor:"pointer"}}>Continue with Google</button>
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
            <h4 style={{margin:0}}>⚠ Firebase Error!</h4>
            <p style={{fontSize:12, margin:"4px 0 0"}}>{dbError}</p>
          </div>
        )}

        {screen === "home" && (
          <div>
            <div style={{background:"#0f0f25", padding:15, borderRadius:12, textAlign:"center", marginBottom:15, border:"1px solid #222"}}>
              <h3 style={{margin:0, color:"#e879f9"}}>Welcome to Kerala PSC Prep</h3>
              <p style={{fontSize:12, color:"#10b981", fontWeight:"bold", marginTop:5}}>Total Questions: {allQ.length} (From DB: {fbQ.length})</p>
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
            <button onClick={()=>setScreen("home")} style={{padding:"10px 20px", background:"#6366f1", border:"none", borderRadius:8, color:"#fff", cursor:"pointer"}}>Go Home</button>
          </div>
        )}

        {screen === "admin" && isAdmin && (
          <div>
            <button onClick={()=>setScreen("home")} style={{padding:"8px 12px", background:"#222", border:"none", borderRadius:6, color:"#fff", marginBottom:15}}>← Back</button>
            <h3 style={{color:"#fbbf24"}}>👑 Admin Panel</h3>
            <div style={{display:"flex", gap:5, marginBottom:15}}>
              <button onClick={()=>setAdminTab("fix")} style={{flex:1, padding:8, background:adminTab==="fix"?"#6366f1":"#222", border:"none", borderRadius:6, color:"#fff"}}>Database Fix</button>
              <button onClick={()=>setAdminTab("ai")} style={{flex:1, padding:8, background:adminTab==="ai"?"#6366f1":"#222", border:"none", borderRadius:6, color:"#fff"}}>AI Generator</button>
            </div>

            {adminTab === "fix" && (
              <div style={{background:"#0f0f25", padding:15, borderRadius:12, border:"1px solid #ef4444"}}>
                <h4>🛠 Live Data Debugger</h4>
                <p style={{fontSize:12, color:"#10b981", fontWeight:"bold"}}>Total DB Questions Fetched: {fbQ.length}</p>

                <div style={{background:"rgba(0,0,0,0.3)", padding:12, borderRadius:8, marginTop:10}}>
                  <div style={{color:"#f59e0b", fontWeight:"bold", marginBottom:6}}>⚠ Orphaned Questions</div>
                  <p style={{fontSize:11, color:"#94a3b8", marginBottom:10}}>കാറ്റഗറി ഡിലീറ്റ് ആയതുകൊണ്ട് വഴിതെറ്റിയ ചോദ്യങ്ങൾ.</p>
                  
                  {Object.entries(fbQ.reduce((acc, q) => { 
                    if(!categories.find(c=>String(c.id).toLowerCase().trim() === String(q.cat).toLowerCase().trim())){ 
                      acc[q.cat]=(acc[q.cat]||0)+1;
                    } 
                    return acc; 
                  }, {})).map(([catId, count]) => (
                    <div key={catId} style={{background:"rgba(255,255,255,0.05)", padding:8, borderRadius:6, marginBottom:6}}>
                      <div style={{fontSize:12, color:"#e2e8f0"}}>Category Name: <strong style={{color:"#ef4444"}}>{catId}</strong> ({count} Qs)</div>
                      
                      <button onClick={async () => {
                        if(window.confirm(`ഈ ${count} ചോദ്യങ്ങളെല്ലാം LDC കാറ്റഗറിയിലേക്ക് മാറ്റട്ടേ?`)) {
                          showNotif("⏳ Fixing questions...");
                          const orphanedQs = fbQ.filter(q => String(q.cat).toLowerCase().trim() === String(catId).toLowerCase().trim());
                          for(let q of orphanedQs) {
                            await update(ref(db, `questions/${q.id}`), { cat: "ldc" });
                          }
                          showNotif("✅ Fixed successfully!");
                        }
                      }} style={{background:"#6366f1", color:"#fff", border:"none", padding:"6px 10px", borderRadius:6, fontSize:11, marginTop:8, width:"100%"}}>
                        Recover to LDC Category 🚀
                      </button>
                    </div>
                  ))}
                  {Object.keys(fbQ.reduce((acc, q) => { if(!categories.find(c=>String(c.id).toLowerCase().trim() === String(q.cat).toLowerCase().trim())) acc[q.cat]=1; return acc; }, {})).length === 0 && (
                    <div style={{fontSize:11, color:"#10b981"}}>എല്ലാ ചോദ്യങ്ങൾക്കും കാറ്റഗറിയുണ്ട്! കുഴപ്പങ്ങളൊന്നുമില്ല.</div>
                  )}
                </div>

                <button onClick={async () => {
                  showNotif("⏳ Syncing from Firebase...");
                  const snap = await get(ref(db, "questions"));
                  const qs = []; if(snap.exists()) snap.forEach(c => qs.push({id:c.key,...c.val()}));
                  setFbQ(qs);
                  showNotif(`✅ Sync Done! Fetched ${qs.length} questions.`);
                }} style={{width:"100%", padding:10, background:"#10b981", border:"none", borderRadius:8, color:"#fff", fontWeight:"bold", marginTop:10, cursor:"pointer"}}>
                  🔄 Force Fetch Database
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
