import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getDatabase, ref, set, get, onValue, push, serverTimestamp, query, orderByChild, limitToLast } from "firebase/database";

// ============================================================
// FIREBASE CONFIG
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyArFo7B3M7lSfbOzUSycMUsnke8YSck74k",
  authDomain: "psc-quiz-kerala.firebaseapp.com",
  databaseURL: "https://psc-quiz-kerala-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "psc-quiz-kerala",
  storageBucket: "psc-quiz-kerala.firebasestorage.app",
  messagingSenderId: "100637065162",
  appId: "1:100637065162:web:d492ed8ff24718ca215933",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// ============================================================
// QUESTIONS
// ============================================================
const QUESTIONS = [
  { id:1, q:"Kerala formed on?", qm:"കേരളം രൂപീകരിച്ചത്?", options:["Nov 1, 1956","Aug 15, 1947","Jan 26, 1950","Nov 1, 1960"], answer:0, topic:"ldc", difficulty:"easy" },
  { id:2, q:"Longest river in Kerala?", qm:"കേരളത്തിലെ ഏറ്റവും നീളമേറിയ നദി?", options:["Periyar","Bharathapuzha","Pamba","Chaliyar"], answer:1, topic:"ldc", difficulty:"easy" },
  { id:3, q:"Capital of Kerala?", qm:"കേരളത്തിന്റെ തലസ്ഥാനം?", options:["Kochi","Kozhikode","Thiruvananthapuram","Thrissur"], answer:2, topic:"ldc", difficulty:"easy" },
  { id:4, q:"First CM of Kerala?", qm:"കേരളത്തിന്റെ ആദ്യ മുഖ്യമന്ത്രി?", options:["C Achutha Menon","K Karunakaran","EMS Namboodiripad","Pattom Thanu Pillai"], answer:2, topic:"ldc", difficulty:"medium" },
  { id:5, q:"Kerala High Court located in?", qm:"കേരള ഹൈക്കോടതി?", options:["Thiruvananthapuram","Thrissur","Kochi","Kozhikode"], answer:2, topic:"ldc", difficulty:"easy" },
  { id:6, q:"Silent Valley district?", qm:"സൈലന്റ് വാലി ജില്ല?", options:["Wayanad","Idukki","Palakkad","Malappuram"], answer:2, topic:"psc", difficulty:"medium" },
  { id:7, q:"Highest peak in Kerala?", qm:"കേരളത്തിലെ ഏറ്റവും ഉയർന്ന കൊടുമുടി?", options:["Chembra","Anamudi","Meesapulimala","Agasthyamala"], answer:1, topic:"psc", difficulty:"easy" },
  { id:8, q:"National game of India?", qm:"ഇന്ത്യയുടെ ദേശീയ കായിക വിനോദം?", options:["Cricket","Football","Hockey","Kabaddi"], answer:2, topic:"psc", difficulty:"easy" },
  { id:9, q:"Father of Indian Constitution?", qm:"ഇന്ത്യൻ ഭരണഘടനയുടെ പിതാവ്?", options:["Nehru","Sardar Patel","BR Ambedkar","Rajendra Prasad"], answer:2, topic:"psc", difficulty:"easy" },
  { id:10, q:"IPC stands for?", qm:"IPC-യുടെ പൂർണ്ണ രൂപം?", options:["Indian Penal Code","Indian Police Code","Indian Penal Court","Indian Public Code"], answer:0, topic:"police", difficulty:"easy" },
  { id:11, q:"First woman IPS officer?", qm:"ആദ്യ വനിതാ IPS?", options:["Kiran Bedi","Anjana Srivastava","Kanchan Bhattacharya","Revathi"], answer:0, topic:"police", difficulty:"medium" },
  { id:12, q:"Chemical symbol of Gold?", qm:"സ്വർണ്ണത്തിന്റെ രാസ ചിഹ്നം?", options:["Go","Gd","Au","Ag"], answer:2, topic:"science", difficulty:"easy" },
  { id:13, q:"Speed of light?", qm:"പ്രകാശ വേഗത?", options:["3×10⁸ m/s","3×10⁶ m/s","3×10⁵ m/s","3×10⁴ m/s"], answer:0, topic:"science", difficulty:"medium" },
  { id:14, q:"Vitamin from sunlight?", qm:"സൂര്യപ്രകാശ വിറ്റാമിൻ?", options:["A","B","C","D"], answer:3, topic:"science", difficulty:"easy" },
  { id:15, q:"Chandrayaan-3 year?", qm:"ചന്ദ്രയാൻ-3 വർഷം?", options:["2022","2023","2024","2021"], answer:1, topic:"current", difficulty:"easy" },
  { id:16, q:"President of India 2024?", qm:"ഇന്ത്യൻ രാഷ്ട്രപതി 2024?", options:["Ram Nath Kovind","Droupadi Murmu","Pranab Mukherjee","APJ Abdul Kalam"], answer:1, topic:"current", difficulty:"easy" },
  { id:17, q:"Battle of Plassey year?", qm:"പ്ലാസി യുദ്ധം?", options:["1757","1764","1799","1857"], answer:0, topic:"history", difficulty:"medium" },
  { id:18, q:"Quit India Movement year?", qm:"ക്വിറ്റ് ഇന്ത്യ?", options:["1940","1942","1945","1947"], answer:1, topic:"history", difficulty:"medium" },
  { id:19, q:"Largest state in India by area?", qm:"ഏറ്റവും വലിയ സംസ്ഥാനം?", options:["MP","Rajasthan","Maharashtra","UP"], answer:1, topic:"geography", difficulty:"easy" },
  { id:20, q:"Ganga originates from?", qm:"ഗംഗ ഉദ്ഭവം?", options:["Yamunotri","Gangotri","Kedarnath","Badrinath"], answer:1, topic:"geography", difficulty:"medium" },
];

const CATEGORIES = {
  ldc:       { label:"LDC / LGS",       icon:"📋", color:"#6366f1" },
  psc:       { label:"PSC General",     icon:"🏛️", color:"#8b5cf6" },
  police:    { label:"Police / SI",     icon:"👮", color:"#3b82f6" },
  science:   { label:"Science",         icon:"🔬", color:"#10b981" },
  history:   { label:"History",         icon:"📜", color:"#f59e0b" },
  geography: { label:"Geography",       icon:"🌍", color:"#06b6d4" },
  current:   { label:"Current Affairs", icon:"📰", color:"#ef4444" },
  mock:      { label:"Mock Test (20Q)", icon:"🎯", color:"#ec4899" },
};

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [category, setCategory] = useState(null);
  const [curr, setCurr] = useState(0);
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(30);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState({});
  const [rooms, setRooms] = useState([]);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomError, setRoomError] = useState("");
  const timerRef = useRef(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setScreen(u ? "home" : "auth");
      if (u) {
        loadLeaderboard();
        loadMyStats(u.uid);
      }
    });
    setTimeout(() => { if (!auth.currentUser) setScreen("auth"); }, 2000);
    return () => unsub();
  }, []);

  const loadLeaderboard = () => {
    const lb = query(ref(db, "leaderboard"), orderByChild("score"), limitToLast(20));
    onValue(lb, (snap) => {
      if (snap.exists()) {
        const data = [];
        snap.forEach(child => data.push({ id: child.key, ...child.val() }));
        setLeaderboard(data.reverse());
      }
    });
  };

  const loadMyStats = (uid) => {
    onValue(ref(db, `users/${uid}/stats`), (snap) => {
      if (snap.exists()) setMyStats(snap.val());
    });
  };

  // Google Login
  const loginGoogle = async () => {
    setAuthLoading(true); setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) { setAuthError("Google login failed. Try again."); }
    setAuthLoading(false);
  };

  // Email Login
  const loginEmail = async () => {
    setAuthLoading(true); setAuthError("");
    try {
      if (authMode === "register") {
        if (!displayName.trim()) { setAuthError("പേര് ഇടൂ!"); setAuthLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        await set(ref(db, `users/${cred.user.uid}/profile`), { name: displayName, email, createdAt: Date.now() });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setAuthError(e.code === "auth/wrong-password" ? "Password തെറ്റ്!" : e.code === "auth/user-not-found" ? "User ഇല്ല!" : e.code === "auth/email-already-in-use" ? "Email already registered!" : e.message);
    }
    setAuthLoading(false);
  };

  const logout = async () => { await signOut(auth); setScreen("auth"); };

  // Timer
  useEffect(() => {
    if (screen !== "quiz" || sel !== null) return;
    setTimer(30);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); handleAns(-1); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [curr, screen]);

  const startQuiz = (cat) => {
    let qs = cat === "mock" ? [...QUESTIONS].sort(() => Math.random()-0.5).slice(0,20)
      : QUESTIONS.filter(q => q.topic === cat).sort(() => Math.random()-0.5).slice(0,10);
    if (!qs.length) { alert("Questions ഇല്ല!"); return; }
    setCategory(cat); setQuestions(qs); setCurr(0); setSel(null); setScore(0); setAnswers([]);
    setScreen("quiz");
  };

  const handleAns = (i) => {
    if (sel !== null) return;
    clearInterval(timerRef.current);
    setSel(i);
    const q = questions[curr];
    const ok = i === q.answer;
    if (ok) setScore(s => s+1);
    setAnswers(a => [...a, { q, sel:i, ok }]);
  };

  const nextQ = () => {
    if (curr+1 >= questions.length) { saveResult(); setScreen("result"); return; }
    setCurr(c => c+1); setSel(null);
  };

  const saveResult = async () => {
    if (!user) return;
    const finalScore = answers.filter(a => a.ok).length;
    // Save to leaderboard
    await push(ref(db, "leaderboard"), {
      uid: user.uid, name: user.displayName || user.email.split("@")[0],
      score: finalScore, total: questions.length, category,
      accuracy: Math.round((finalScore/questions.length)*100),
      timestamp: serverTimestamp(),
    });
    // Save user stats
    const statsRef = ref(db, `users/${user.uid}/stats/${category}`);
    const snap = await get(statsRef);
    const prev = snap.exists() ? snap.val() : { attempts:0, correct:0, best:0 };
    await set(statsRef, {
      attempts: prev.attempts + 1,
      correct: prev.correct + finalScore,
      best: Math.max(prev.best || 0, finalScore),
    });
  };

  // Competition Rooms
  const createRoom = async () => {
    if (!user) return;
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    await set(ref(db, `rooms/${code}`), {
      host: user.displayName || user.email,
      hostUid: user.uid, code, status:"waiting",
      category: "psc", createdAt: serverTimestamp(),
      players: { [user.uid]: { name: user.displayName || user.email, score:0, ready:false } }
    });
    setRoomCode(code);
    setScreen("room");
    // Listen to room
    onValue(ref(db, `rooms/${code}`), (snap) => {
      if (snap.exists()) setRooms(snap.val());
    });
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    const snap = await get(ref(db, `rooms/${joinCode.toUpperCase()}`));
    if (!snap.exists()) { setRoomError("Room കണ്ടില്ല!"); return; }
    await set(ref(db, `rooms/${joinCode.toUpperCase()}/players/${user.uid}`), {
      name: user.displayName || user.email, score:0, ready:false
    });
    setRoomCode(joinCode.toUpperCase());
    setScreen("room");
    onValue(ref(db, `rooms/${joinCode.toUpperCase()}`), (snap) => {
      if (snap.exists()) setRooms(snap.val());
    });
  };

  const c = { minHeight:"100vh", background:"#080812", color:"#e2e8f0", fontFamily:"'Segoe UI',sans-serif" };
  const card = (extra={}) => ({ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, ...extra });
  const btn = (bg, col="#fff", extra={}) => ({ background:bg, color:col, border:"none", borderRadius:10, padding:"12px 16px", cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"inherit", ...extra });
  const inp = { width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:14, marginBottom:10, fontFamily:"inherit" };

  // SPLASH
  if (screen === "splash") return (
    <div style={{ ...c, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
      <div style={{ fontSize:64 }}>🎓</div>
      <h1 style={{ color:"#a5b4fc", fontSize:24, marginTop:12 }}>PSC Quiz Kerala</h1>
      <div style={{ color:"#475569", marginTop:8 }}>Loading...</div>
    </div>
  );

  // AUTH
  if (screen === "auth") return (
    <div style={{ ...c, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:52 }}>🎓</div>
          <h1 style={{ color:"#a5b4fc", fontSize:22, marginTop:8 }}>PSC Quiz Kerala</h1>
          <p style={{ color:"#475569", fontSize:13 }}>Login ചെയ്ത് Quiz കളിക്കൂ!</p>
        </div>

        {/* Google Login */}
        <button onClick={loginGoogle} disabled={authLoading} style={{ ...btn("rgba(255,255,255,0.08)","#e2e8f0"), width:"100%", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center", gap:10, border:"1px solid rgba(255,255,255,0.15)", padding:14 }}>
          <span style={{ fontSize:20 }}>G</span> Google-കൊണ്ട് Login ചെയ്യൂ
        </button>

        <div style={{ textAlign:"center", color:"#334155", marginBottom:16, fontSize:13 }}>— അല്ലെങ്കിൽ —</div>

        {/* Email Auth */}
        <div style={{ ...card(), padding:20 }}>
          <div style={{ display:"flex", marginBottom:16 }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => setAuthMode(m)} style={{ flex:1, padding:"8px 0", background:authMode===m?"#6366f1":"transparent", border:"none", borderRadius:8, color:authMode===m?"#fff":"#64748b", cursor:"pointer", fontWeight:700, fontSize:13 }}>
                {m==="login"?"Login":"Register"}
              </button>
            ))}
          </div>

          {authMode === "register" && <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="പേര് (Display Name)" style={inp} />}
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={inp} />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={inp} />

          {authError && <div style={{ color:"#ef4444", fontSize:13, marginBottom:10 }}>⚠️ {authError}</div>}

          <button onClick={loginEmail} disabled={authLoading} style={{ ...btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width:"100%", padding:13 }}>
            {authLoading ? "⏳ Loading..." : authMode==="login" ? "🔐 Login" : "✅ Register"}
          </button>
        </div>
      </div>
    </div>
  );

  // HEADER
  const Header = () => (
    <div style={{ background:"linear-gradient(135deg,#13103a,#1e1b4b)", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(99,102,241,0.25)", position:"sticky", top:0, zIndex:100 }}>
      <div onClick={() => setScreen("home")} style={{ cursor:"pointer" }}>
        <div style={{ fontSize:16, fontWeight:800, color:"#a5b4fc" }}>🎓 PSC Quiz</div>
        <div style={{ fontSize:10, color:"#4f46e5" }}>Hi, {user?.displayName || user?.email?.split("@")[0]}!</div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => setScreen("leaderboard")} style={{ ...btn("rgba(245,158,11,0.15)","#fbbf24"), padding:"6px 10px", fontSize:12 }}>🏆</button>
        <button onClick={() => setScreen("stats")} style={{ ...btn("rgba(16,185,129,0.15)","#10b981"), padding:"6px 10px", fontSize:12 }}>📊</button>
        <button onClick={() => setScreen("competition")} style={{ ...btn("rgba(239,68,68,0.15)","#f87171"), padding:"6px 10px", fontSize:12 }}>⚔️</button>
        <button onClick={logout} style={{ ...btn("rgba(255,255,255,0.08)","#94a3b8"), padding:"6px 10px", fontSize:12 }}>🚪</button>
      </div>
    </div>
  );

  return (
    <div style={c}>
      <style>{`* { box-sizing:border-box; margin:0; padding:0; } @keyframes pop{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}} .pop{animation:pop 0.25s ease} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}} .blink{animation:blink 0.8s infinite} input{font-family:inherit}`}</style>
      <Header />
      <div style={{ maxWidth:500, margin:"0 auto", padding:"0 14px 80px" }}>

        {/* HOME */}
        {screen === "home" && (
          <div className="pop">
            <div style={{ textAlign:"center", padding:"20px 0 16px" }}>
              <div style={{ fontSize:46 }}>🎯</div>
              <h1 style={{ fontSize:20, fontWeight:800, color:"#c7d2fe", marginTop:6 }}>Kerala PSC Exam Prep</h1>
              <p style={{ color:"#475569", fontSize:12, marginTop:4 }}>{QUESTIONS.length} Questions • 7 Categories • Live Leaderboard</p>
            </div>

            <div style={{ display:"flex", gap:8, marginBottom:18 }}>
              {[{l:"Questions",v:QUESTIONS.length,i:"📝"},{l:"Categories",v:7,i:"📚"},{l:"My Best",v:Object.values(myStats).reduce((a,s)=>Math.max(a,s.best||0),0),i:"🏆"}].map((x,i) => (
                <div key={i} style={{ ...card(), flex:1, padding:"10px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:18 }}>{x.i}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:"#818cf8" }}>{x.v}</div>
                  <div style={{ fontSize:10, color:"#475569" }}>{x.l}</div>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize:12, color:"#475569", marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Category തിരഞ്ഞെടുക്കൂ</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {Object.entries(CATEGORIES).map(([key, meta]) => {
                const count = key==="mock" ? 20 : QUESTIONS.filter(q=>q.topic===key).length;
                return (
                  <button key={key} onClick={() => startQuiz(key)} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 15px", background:"rgba(255,255,255,0.03)", border:`1px solid rgba(255,255,255,0.07)`, borderLeft:`3px solid ${meta.color}`, borderRadius:12, cursor:"pointer", textAlign:"left" }}>
                    <span style={{ fontSize:22 }}>{meta.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:"#e2e8f0", fontSize:14 }}>{meta.label}</div>
                      {myStats[key] && <div style={{ color:"#475569", fontSize:11 }}>Best: {myStats[key].best} • Attempts: {myStats[key].attempts}</div>}
                    </div>
                    <div style={{ background:meta.color+"22", color:meta.color, borderRadius:8, padding:"3px 9px", fontSize:12, fontWeight:700 }}>{count}Q</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* QUIZ */}
        {screen === "quiz" && questions[curr] && (() => {
          const q = questions[curr];
          return (
            <div className="pop" style={{ paddingTop:14 }}>
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ color:"#475569", fontSize:13 }}>{curr+1}/{questions.length}</span>
                  <span className={timer<=5?"blink":""} style={{ color:timer<=5?"#ef4444":"#10b981", fontWeight:800, background:timer<=5?"rgba(239,68,68,0.1)":"rgba(16,185,129,0.08)", padding:"3px 12px", borderRadius:20 }}>⏱{timer}s</span>
                </div>
                <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:4 }}>
                  <div style={{ height:"100%", width:`${(curr/questions.length)*100}%`, background:"linear-gradient(90deg,#6366f1,#a855f7)", borderRadius:4, transition:"width 0.4s" }} />
                </div>
              </div>

              <div style={{ ...card(), padding:16, marginBottom:12, background:"rgba(99,102,241,0.07)", borderColor:"rgba(99,102,241,0.15)" }}>
                <div style={{ fontSize:11, color:"#6366f1", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>{CATEGORIES[q.topic]?.icon} {CATEGORIES[q.topic]?.label}</div>
                <p style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", lineHeight:1.6 }}>{q.q}</p>
                {q.qm && <p style={{ fontSize:13, color:"#64748b", marginTop:5 }}>{q.qm}</p>}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
                {q.options.map((opt,i) => {
                  let bg="rgba(255,255,255,0.03)", bdr="rgba(255,255,255,0.08)", col="#e2e8f0";
                  if (sel!==null) {
                    if (i===q.answer) { bg="rgba(16,185,129,0.12)"; bdr="#10b981"; col="#10b981"; }
                    else if (i===sel) { bg="rgba(239,68,68,0.12)"; bdr="#ef4444"; col="#ef4444"; }
                  }
                  return (
                    <button key={i} onClick={() => handleAns(i)} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:bg, border:`1.5px solid ${bdr}`, borderRadius:11, color:col, textAlign:"left", fontSize:14, cursor:"pointer" }}>
                      <span style={{ width:26, height:26, borderRadius:"50%", background:"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, flexShrink:0 }}>{["A","B","C","D"][i]}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {sel!==null && (
                <div className="pop">
                  <div style={{ ...card(), padding:12, marginBottom:10, borderLeft:`3px solid ${sel===q.answer?"#10b981":"#ef4444"}` }}>
                    <div style={{ fontWeight:700, color:sel===q.answer?"#10b981":"#ef4444" }}>{sel===q.answer?"✅ ശരിയാണ്!":"❌ തെറ്റ്!"}</div>
                    {sel!==q.answer && <div style={{ color:"#94a3b8", fontSize:13, marginTop:4 }}>✔ ഉത്തരം: <strong style={{ color:"#a5b4fc" }}>{q.options[q.answer]}</strong></div>}
                  </div>
                  <button onClick={nextQ} style={{ ...btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width:"100%", padding:13 }}>
                    {curr+1>=questions.length?"📊 Result കാണുക":"അടുത്ത ചോദ്യം →"}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* RESULT */}
        {screen === "result" && (
          <div className="pop" style={{ paddingTop:20 }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:56 }}>{score>=questions.length*0.8?"🏆":score>=questions.length*0.5?"😊":"💪"}</div>
              <h2 style={{ fontSize:22, fontWeight:800, color:"#c7d2fe", marginTop:8 }}>Quiz Complete!</h2>
              <div style={{ fontSize:48, fontWeight:900, color:"#6366f1", margin:"10px 0" }}>{score}<span style={{ fontSize:22, color:"#475569" }}>/{questions.length}</span></div>
              <div style={{ color:"#10b981", fontSize:14 }}>Accuracy: {Math.round((score/questions.length)*100)}%</div>
              <div style={{ color:"#475569", fontSize:13, marginTop:4 }}>Score Firebase-ൽ save ആയി! 🔥</div>
            </div>

            <h3 style={{ fontSize:12, color:"#475569", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Review</h3>
            {answers.map((a,i) => (
              <div key={i} style={{ ...card(), padding:10, marginBottom:7, borderLeft:`3px solid ${a.ok?"#10b981":"#ef4444"}` }}>
                <div style={{ fontSize:12, color:"#64748b", marginBottom:3 }}>Q{i+1}: {a.q.q}</div>
                <div style={{ fontSize:13, color:a.ok?"#10b981":"#ef4444" }}>
                  {a.ok?"✅":"❌"} {a.sel===-1?"⏱ Time out":a.q.options[a.sel]}
                  {!a.ok && <span style={{ color:"#10b981" }}> → {a.q.options[a.q.answer]}</span>}
                </div>
              </div>
            ))}

            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button onClick={() => startQuiz(category)} style={{ ...btn("rgba(99,102,241,0.15)","#a5b4fc"), flex:1 }}>🔄 വീണ്ടും</button>
              <button onClick={() => setScreen("home")} style={{ ...btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), flex:1 }}>🏠 Home</button>
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {screen === "leaderboard" && (
          <div className="pop" style={{ paddingTop:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#c7d2fe", marginBottom:4 }}>🏆 Global Leaderboard</h2>
            <p style={{ color:"#475569", fontSize:13, marginBottom:18 }}>Real-time • Firebase Powered</p>
            {leaderboard.length === 0
              ? <div style={{ ...card(), padding:36, textAlign:"center", color:"#475569" }}><div style={{ fontSize:36 }}>🏆</div><p style={{ marginTop:10 }}>ഇതുവരെ scores ഇല്ല!</p></div>
              : leaderboard.map((e,i) => (
                <div key={e.id} style={{ ...card(), display:"flex", alignItems:"center", gap:10, padding:12, marginBottom:7, borderLeft:`3px solid ${i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7c2f":"#334155"}`, background:e.uid===user?.uid?"rgba(99,102,241,0.08)":"rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize:20, width:28, textAlign:"center" }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:e.uid===user?.uid?"#a5b4fc":"#e2e8f0" }}>{e.name} {e.uid===user?.uid?"(You)":""}</div>
                    <div style={{ fontSize:11, color:"#475569" }}>{CATEGORIES[e.category]?.label} • {e.accuracy}% accuracy</div>
                  </div>
                  <div style={{ fontWeight:800, color:"#6366f1", fontSize:18 }}>{e.score}/{e.total}</div>
                </div>
              ))
            }
            <button onClick={() => setScreen("home")} style={{ ...btn("rgba(99,102,241,0.1)","#a5b4fc"), width:"100%", marginTop:14 }}>← Back</button>
          </div>
        )}

        {/* STATS */}
        {screen === "stats" && (
          <div className="pop" style={{ paddingTop:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#c7d2fe", marginBottom:4 }}>📊 My Statistics</h2>
            <p style={{ color:"#475569", fontSize:13, marginBottom:18 }}>{user?.displayName || user?.email}</p>
            {Object.keys(myStats).length === 0
              ? <div style={{ ...card(), padding:36, textAlign:"center", color:"#475569" }}><div style={{ fontSize:36 }}>📊</div><p style={{ marginTop:10 }}>ഇതുവരെ Quiz കളിച്ചിട്ടില്ല!</p></div>
              : Object.entries(myStats).map(([topic, data]) => {
                  const pct = Math.round((data.correct/(data.attempts*10))*100);
                  return (
                    <div key={topic} style={{ ...card(), padding:14, marginBottom:8 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontWeight:700 }}>{CATEGORIES[topic]?.icon} {CATEGORIES[topic]?.label}</span>
                        <span style={{ color:pct>=80?"#10b981":pct>=50?"#f59e0b":"#ef4444", fontWeight:700 }}>{pct}%</span>
                      </div>
                      <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:4, marginBottom:6 }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:pct>=80?"#10b981":pct>=50?"#f59e0b":"#ef4444", borderRadius:4 }} />
                      </div>
                      <div style={{ display:"flex", gap:12, fontSize:12, color:"#475569" }}>
                        <span>Attempts: {data.attempts}</span>
                        <span>Best: {data.best}/10</span>
                        <span>Total correct: {data.correct}</span>
                      </div>
                    </div>
                  );
                })
            }
            <button onClick={() => setScreen("home")} style={{ ...btn("rgba(99,102,241,0.1)","#a5b4fc"), width:"100%", marginTop:14 }}>← Back</button>
          </div>
        )}

        {/* COMPETITION */}
        {screen === "competition" && (
          <div className="pop" style={{ paddingTop:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#c7d2fe", marginBottom:4 }}>⚔️ Quiz Battle</h2>
            <p style={{ color:"#475569", fontSize:13, marginBottom:18 }}>Friends-നെ Challenge ചെയ്യൂ!</p>

            <div style={{ ...card(), padding:16, marginBottom:12, borderLeft:"3px solid #6366f1" }}>
              <div style={{ fontWeight:700, color:"#a5b4fc", marginBottom:8 }}>🆕 New Room ഉണ്ടാക്കൂ</div>
              <p style={{ color:"#64748b", fontSize:13, marginBottom:12 }}>Room code share ചെയ്ത് friends-നെ invite ചെയ്യൂ!</p>
              <button onClick={createRoom} style={{ ...btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width:"100%" }}>🎮 Create Room</button>
            </div>

            <div style={{ ...card(), padding:16, marginBottom:12, borderLeft:"3px solid #10b981" }}>
              <div style={{ fontWeight:700, color:"#10b981", marginBottom:8 }}>🔗 Room Join ചെയ്യൂ</div>
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Room Code ഇടൂ..." style={{ ...inp, marginBottom:8, textTransform:"uppercase", letterSpacing:3, textAlign:"center", fontSize:18, fontWeight:700 }} />
              {roomError && <div style={{ color:"#ef4444", fontSize:13, marginBottom:8 }}>{roomError}</div>}
              <button onClick={joinRoom} style={{ ...btn("#10b981"), width:"100%" }}>🚀 Join Room</button>
            </div>

            <button onClick={() => setScreen("home")} style={{ ...btn("rgba(99,102,241,0.1)","#a5b4fc"), width:"100%" }}>← Back</button>
          </div>
        )}

        {/* ROOM */}
        {screen === "room" && (
          <div className="pop" style={{ paddingTop:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#c7d2fe", marginBottom:4 }}>🎮 Quiz Room</h2>
            <div style={{ ...card(), padding:20, marginBottom:16, textAlign:"center", background:"rgba(99,102,241,0.08)" }}>
              <p style={{ color:"#64748b", fontSize:13 }}>Room Code</p>
              <div style={{ fontSize:36, fontWeight:900, color:"#a5b4fc", letterSpacing:6, margin:"8px 0" }}>{roomCode}</div>
              <p style={{ color:"#475569", fontSize:12 }}>Friends-നോട് ഈ code share ചെയ്യൂ!</p>
            </div>

            {rooms.players && (
              <div style={{ ...card(), padding:16, marginBottom:16 }}>
                <div style={{ fontWeight:700, color:"#e2e8f0", marginBottom:10 }}>Players ({Object.keys(rooms.players).length})</div>
                {Object.entries(rooms.players).map(([uid, player]) => (
                  <div key={uid} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
                      {player.name[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, fontWeight:600 }}>{player.name} {uid===user?.uid?"(You)":""}</div>
                    <div style={{ color:"#6366f1", fontWeight:700 }}>Score: {player.score}</div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => startQuiz("psc")} style={{ ...btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width:"100%", marginBottom:10, padding:14 }}>🚀 Quiz Start ചെയ്യൂ!</button>
            <button onClick={() => setScreen("home")} style={{ ...btn("rgba(99,102,241,0.1)","#a5b4fc"), width:"100%" }}>← Back</button>
          </div>
        )}

      </div>
    </div>
  );
}
