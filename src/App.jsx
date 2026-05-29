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

// 🔴 ഏറ്റവും പ്രധാനപ്പെട്ട മാറ്റം: ഡാറ്റാബേസ് റീജിയൺ ലിങ്ക് നേരിട്ട് ഫോഴ്സ് ചെയ്യുന്നു 🔴
const DB_URL = "https://psc-quiz-kerala-default-rtdb.asia-southeast1.firebasedatabase.app";
const db = getDatabase(firebaseApp, DB_URL);
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
];

const FORUM_CATS = [
  { id:"general",    label:"General",       icon:"💬", color:"#6366f1" },
  { id:"ldc",        label:"LDC Tips",      icon:"📋", color:"#8b5cf6" },
  { id:"current",    label:"Current",       icon:"📰", color:"#ef4444" },
  { id:"doubt",      label:"Doubts",        icon:"🤔", color:"#f59e0b" },
];

const ICONS = ["📋","🏛️","👮","🔬","📜","🌍","📰","🎯","📚","✏️","🧪","⚖️","💡","🗺️","🏆","📖","🔭","🧮","🏅","📐"];
const COLORS = ["#6366f1","#8b5cf6","#3b82f6","#10b981","#f59e0b","#06b6d4","#ef4444","#ec4899","#84cc16","#f97316"];

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
      const mal = includeMalayalam ? `Provide Malayalam translation in "qm".` : `Leave "qm" empty.`;
      const prompt = `Create ${qCount} Kerala PSC MCQs about "${topic}". Difficulty: ${difficulty}. Category: ${targetCat}. Return ONLY a JSON array: [{"q":"Eng Q", "qm":"Mal Q", "options":["A","B","C","D"], "answer":0, "explanation":"Exp"}]`;
      const response = await Promise.race([
        window.puter.ai.chat(prompt),
        new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 30000))
      ]);
      let rawText = typeof response === 'string' ? response : response?.text || (Array.isArray(response?.message?.content) ? response.message.content.map(b=>b.text).join('') : response?.message?.content) || JSON.stringify(response);
      let cleaned = String(rawText).trim().replace(/^```json\s*/i, "").replace(/^
```\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned.match(/\[[\s\S]*\]/)[0]);
      
      const normalized = parsed.map((q, i) => {
        let ansIdx = typeof q.answer === "number" ? q.answer : 0;
        return {
          q: q.q || `Question ${i + 1}`, qm: q.qm || "", options: q.options || ["A", "B", "C", "D"], answer: ansIdx, explanation: q.explanation || "", 
          cat: targetCat.toLowerCase().trim(), _selected: true, // 🔴 Category is strictly formatted here
        };
      });
      const validQs = normalized.filter(q => q.q);
      setGeneratedQs(validQs); setGenStatus("done"); setGenMsg(`✅ ${validQs.length} questions generated!`);
    } catch (e) { setGenStatus("error"); setGenMsg(`❌ Error: ${e.message}`); }
  };

  const toggleSelect = (idx) => setGeneratedQs(prev => prev.map((q, i) => i === idx ? { ...q, _selected: !q._selected } : q));
  const selectAll = () => setGeneratedQs(prev => prev.map(q => ({ ...q, _selected: true })));
  const deselectAll = () => setGeneratedQs(prev => prev.map(q => ({ ...q, _selected: false })));

  const uploadSelected = async () => {
    const toUpload = generatedQs.filter(q => q._selected);
    if (!toUpload.length) return;
    setUploadStatus("⏳ Uploading to Asian DB...");
    let count = 0;
    try {
      for (const q of toUpload) {
        const { _selected, ...qData } = q;
        await push(ref(db, "questions"), { ...qData, addedBy: user.email, addedAt: serverTimestamp(), source: "puter_ai", topic: topic });
        count++;
      }
      showNotif(`🎉 ${count} questions uploaded successfully!`);
      setGeneratedQs(prev => prev.filter(q => !q._selected));
    } catch (err) { showNotif("Error: " + err.message, "error"); } finally { setTimeout(() => setUploadStatus(""), 4000); }
  };

  const Inp = { width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 14px", color:"#e2e8f0", fontSize:13, marginBottom:10, outline:"none" };
  const Btn = (bg, col="#fff") => ({ background:bg, color:col, border:"none", borderRadius:12, padding:"12px 16px", cursor:"pointer", fontWeight:700, fontSize:13, transition:"all 0.2s" });

  return (
    <div style={{background:"rgba(255,255,255,0.03)", borderRadius:16, padding:14, border:"1px solid rgba(255,255,255,0.1)"}}>
      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}><span style={{fontSize:24}}>🤖</span><div style={{fontWeight:800, color:"#6ee7b7"}}>AI Quiz Generator</div></div>
      <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic (e.g. Kerala History)" style={Inp} />
      <div style={{display:"flex", gap:8, marginBottom:10}}>
        <select value={targetCat} onChange={e => setTargetCat(e.target.value)} style={{...Inp, flex:1, marginBottom:0}}>{categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
        <select value={qCount} onChange={e => setQCount(Number(e.target.value))} style={{...Inp, flex:1, marginBottom:0}}>{[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} Questions</option>)}</select>
      </div>
      <button onClick={() => setIncludeMalayalam(!includeMalayalam)} style={{display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px", background:includeMalayalam?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.05)", border:`1px solid ${includeMalayalam?"#6366f1":"rgba(255,255,255,0.1)"}`, borderRadius:10, cursor:"pointer", marginBottom:14}}>
        <div style={{fontSize:13, fontWeight:700, color:includeMalayalam?"#a5b4fc":"#ccc"}}>🔤 Include Malayalam</div>
      </button>
      {genMsg && <div style={{fontSize:12, color:genStatus==="error"?"#ef4444":"#10b981", marginBottom:10}}>{genMsg}</div>}
      
      {!isPuterSignedIn ? ( <button onClick={handlePuterLogin} style={{...Btn("linear-gradient(135deg,#f59e0b,#d97706)"), width:"100%"}}>🔐 Login to Puter AI</button>
      ) : ( <button onClick={generateQuiz} disabled={genStatus==="loading"} style={{...Btn("linear-gradient(135deg,#10b981,#06b6d4)"), width:"100%"}}>{genStatus==="loading"?"⏳ Generating...":"🤖 Generate Questions"}</button> )}

      {generatedQs.length > 0 && (
        <div style={{marginTop:15}}>
          <div style={{display:"flex", gap:8, marginBottom:10}}>
            <button onClick={selectAll} style={{...Btn("rgba(99,102,241,0.2)", "#a5b4fc"), flex:1, padding:8}}>☑️ All</button>
            <button onClick={deselectAll} style={{...Btn("rgba(255,255,255,0.1)", "#aaa"), flex:1, padding:8}}>☐ None</button>
          </div>
          {generatedQs.map((q, idx) => (
            <div key={idx} style={{background:"rgba(255,255,255,0.05)", padding:10, borderRadius:8, marginBottom:8, display:"flex", gap:8}}>
              <input type="checkbox" checked={q._selected} onChange={() => toggleSelect(idx)} style={{marginTop:4}}/>
              <div><div style={{fontSize:12, fontWeight:"bold", color:"#fff"}}>{q.q}</div><div style={{fontSize:10, color:"#10b981", marginTop:4}}>Ans: {q.options[q.answer]}</div></div>
            </div>
          ))}
          <button onClick={uploadSelected} style={{...Btn("#6366f1"), width:"100%", marginTop:10}}>🚀 Upload Selected ({generatedQs.filter(q=>q._selected).length})</button>
          {uploadStatus && <div style={{fontSize:12, color:"#10b981", marginTop:10, textAlign:"center"}}>{uploadStatus}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Main App Component ────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("splash");
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [dn, setDn] = useState("");
  const [authErr, setAuthErr] = useState("");

  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [fbQ, setFbQ] = useState([]);
  const [allQ, setAllQ] = useState(BUILTIN_Q);
  const [pendingQ, setPendingQ] = useState([]);
  const [myContribs, setMyContribs] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [activeMembers, setActiveMembers] = useState(0);
  const [myStats, setMyStats] = useState({});

  const [selCat, setSelCat] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizCount, setQuizCount] = useState(10);
  const [curr, setCurr] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef(null);

  // Battle Mode States
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
  
  // Forum States
  const [forumPosts, setForumPosts] = useState([]);
  const [forumMsg, setForumMsg] = useState("");
  const [forumCat, setForumCat] = useState("general");
  const forumEndRef = useRef(null);

  // Admin States
  const [adminTab, setAdminTab] = useState("ai");
  const [newCat, setNewCat] = useState({ label:"", icon:"📋", color:"#6366f1" });
  const [newQ, setNewQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:"" });
  const [bulkText, setBulkText] = useState(""); const [bulkCat, setBulkCat] = useState("ldc");
  const [bulkPreview, setBulkPreview] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");

  const [cQ, setCQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:"" });
  const [notif, setNotif] = useState(null);
  const showNotif = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
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
  }, []);

  useEffect(() => { setAllQ([...BUILTIN_Q, ...fbQ]); }, [fbQ]);
  useEffect(() => { forumEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [forumPosts]);

  const loadData = (uid, admin) => {
    // 🔴 ഡാറ്റ ഫെച്ച് ചെയ്യുന്ന ലോജിക്: കൃത്യമായി എല്ലാ ഡാറ്റയും എടുക്കുന്നു 🔴
    onValue(ref(db,"questions"), snap => {
      if(!snap.exists()) { setFbQ([]); return; }
      const qs = []; 
      snap.forEach(c => {
        const val = c.val();
        if(val) qs.push({ id: c.key, ...val, cat: val.cat ? String(val.cat).toLowerCase().trim() : "ldc" });
      });
      setFbQ(qs);
    });

    onValue(ref(db,"categories"), snap => {
      if(snap.exists()) { const cs=[]; snap.forEach(c=>cs.push({id:c.key,...c.val()})); setCategories([...DEFAULT_CATS,...cs]); }
      else setCategories(DEFAULT_CATS);
    });

    onValue(ref(db,`users/${uid}/stats`), snap => { if(snap.exists()) setMyStats(snap.val()); });
    onValue(ref(db,`users/${uid}/contributions`), snap => { if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setMyContribs(d); } });
    onValue(ref(db,"online"), snap => { setActiveMembers(snap.exists() ? snap.size : 0); });
    onValue(query(ref(db,"forum"), orderByChild("time"), limitToLast(200)), snap => { if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setForumPosts(d); } else setForumPosts([]); });

    if(admin) {
      onValue(ref(db,"pending_questions"), snap => { const d=[]; if(snap.exists()) snap.forEach(c=>d.push({id:c.key,...c.val()})); setPendingQ(d); });
      onValue(ref(db,"adminEmails"), snap => { if(snap.exists()) { const d=[]; snap.forEach(c=>d.push({key:c.key,email:c.key.replace(/_/g,".")})); setAdminList(d); } });
    }
  };

  const loginGoogle = async () => { setAuthLoading(true); try { await signInWithPopup(auth, gProvider); } catch(e) { setAuthErr("Google login failed."); } setAuthLoading(false); };

  const loginEmail = async () => {
    setAuthLoading(true); setAuthErr("");
    try {
      if(authMode === "register") {
        if(!dn.trim() || pw.length < 6) { setAuthErr("Fill name and valid password!"); setAuthLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, em, pw);
        await updateProfile(cred.user, { displayName: dn });
        await set(ref(db,`users/${cred.user.uid}/profile`), { name:dn, email:em, createdAt:Date.now() });
      } else await signInWithEmailAndPassword(auth, em, pw);
    } catch(e) { setAuthErr(e.message); }
    setAuthLoading(false);
  };

  const logout = async () => { if(user) await remove(ref(db,`online/${user.uid}`)); await signOut(auth); setScreen("splash"); setTimeout(() => setScreen("auth"), 500); };

  // --- Quiz Logic ---
  useEffect(() => {
    if(screen !== "quiz" || picked !== null) return;
    setTimer(30); clearInterval(timerRef.current);
    timerRef.current = setInterval(() => { setTimer(t => { if(t<=1) { clearInterval(timerRef.current); handleAns(-1); return 0; } return t-1; }); }, 1000);
    return () => clearInterval(timerRef.current);
  }, [curr, screen]);

  const startQuiz = (cat) => {
    const pool = cat === "mock" ? [...allQ] : allQ.filter(q => String(q.cat).toLowerCase().trim() === String(cat).toLowerCase().trim());
    const qs = pool.sort(() => Math.random()-0.5).slice(0, quizCount);
    if(!qs.length) { showNotif("ഈ കാറ്റഗറിയിൽ ചോദ്യങ്ങൾ ലഭ്യമല്ല!", "error"); return; }
    setSelCat(cat); setQuestions(qs); setCurr(0); setPicked(null); setScore(0); setAnswers([]); setScreen("quiz");
  };

  const handleAns = (i) => {
    if(picked !== null) return;
    clearInterval(timerRef.current); setPicked(i);
    const ok = i === questions[curr].answer;
    if(ok) setScore(s => s+1);
    setAnswers(a => [...a, {q: questions[curr], sel:i, ok}]);
  };

  const nextQ = async () => { if(curr+1 >= questions.length) { await saveResult(); setScreen("result"); return; } setCurr(c => c+1); setPicked(null); };

  const saveResult = async () => {
    if(!user) return;
    const fs = answers.filter(a => a.ok).length;
    const catLabel = categories.find(c=>c.id===selCat)?.label || selCat || "Mock";
    await push(ref(db,"leaderboard"), { uid:user.uid, name:user.displayName||user.email.split("@")[0], score:fs, total:questions.length, category:selCat||"mock", categoryLabel:catLabel, timestamp:serverTimestamp() });
    const sRef = ref(db,`users/${user.uid}/stats/${selCat||"mock"}`);
    const snap = await get(sRef); const prev = snap.exists() ? snap.val() : {attempts:0,correct:0,best:0};
    await set(sRef, { attempts:prev.attempts+1, correct:prev.correct+fs, best:Math.max(prev.best||0,fs) });
  };

  // --- Battle Logic ---
  useEffect(() => {
    if(screen !== "battle" || !battleStarted || battlePicked !== null || battleQ.length === 0) return;
    setBattleTimer(20); clearInterval(battleTimerRef.current);
    battleTimerRef.current = setInterval(() => { setBattleTimer(t => { if(t<=1) { clearInterval(battleTimerRef.current); handleBattleAns(-1); return 0; } return t-1; }); }, 1000);
    return () => clearInterval(battleTimerRef.current);
  }, [battleCurr, battleStarted, screen]);

  useEffect(() => {
    if(!roomCode) return;
    battleStartedRef.current = false;
    const unsub = onValue(ref(db,`rooms/${roomCode}`), snap => {
      if(!snap.exists()) return;
      const room = snap.val(); setRoomData(room);
      if(room.status === "playing" && !battleStartedRef.current) {
        battleStartedRef.current = true;
        if(room.questions) setBattleQ(Object.values(room.questions));
        setBattleCurr(0); setBattlePicked(null); setBattleScore(0); setBattleStarted(true); setScreen("battle");
      }
    });
    return () => unsub();
  }, [roomCode]);

  const createRoom = async () => {
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    const maxP = battleType === "multi" ? 100 : 2;
    const qs = [...allQ].sort(()=>Math.random()-0.5).slice(0, quizCount);
    await set(ref(db,`rooms/${code}`), {
      host:user.displayName||user.email, hostUid:user.uid, code, type:battleType, status:"waiting", maxPlayers:maxP, createdAt:serverTimestamp(),
      questions:Object.fromEntries(qs.map((q,i)=>[i,{q:q.q,options:q.options,answer:q.answer,explanation:q.explanation||""}])),
      players:{ [user.uid]:{ name:user.displayName||user.email, score:0, avatar:(user.displayName||"U")[0].toUpperCase() } }
    });
    setRoomCode(code); setBattleQ(qs); setScreen("room");
  };

  const joinRoom = async () => {
    const code = joinCode.toUpperCase().trim(); if(!code) return;
    const snap = await get(ref(db,`rooms/${code}`));
    if(!snap.exists()) { setRoomErr("❌ Room കണ്ടില്ല!"); return; }
    const room = snap.val();
    if(Object.keys(room.players||{}).length >= room.maxPlayers) { setRoomErr("❌ Room full!"); return; }
    await set(ref(db,`rooms/${code}/players/${user.uid}`), { name:user.displayName||user.email, score:0, avatar:(user.displayName||"U")[0].toUpperCase() });
    setRoomCode(code); if(room.questions) setBattleQ(Object.values(room.questions)); setScreen("room");
  };

  const startBattle = async () => {
    if(!roomCode) return;
    await update(ref(db,`rooms/${roomCode}`), { status:"playing", startedAt:serverTimestamp() });
    battleStartedRef.current = true; setBattleCurr(0); setBattlePicked(null); setBattleScore(0); setBattleStarted(true); setScreen("battle");
  };

  const handleBattleAns = (i) => {
    if(battlePicked !== null) return;
    clearInterval(battleTimerRef.current); setBattlePicked(i);
    const q = battleQ[battleCurr]; if(!q) return;
    const ok = i === q.answer; const newScore = ok ? battleScore+1 : battleScore;
    if(ok) setBattleScore(newScore);
    set(ref(db,`rooms/${roomCode}/players/${user.uid}/score`), newScore);
  };
  const nextBattle = () => { if(battleCurr+1 >= battleQ.length) setScreen("battle_result"); else { setBattleCurr(c=>c+1); setBattlePicked(null); } };

  // --- Forum Logic ---
  const sendForumMsg = async () => {
    if(!forumMsg.trim()) return;
    const msg = forumMsg.trim(); setForumMsg("");
    await push(ref(db,"forum"), { uid:user.uid, name:user.displayName||user.email.split("@")[0], avatar:(user.displayName||user.email||"U")[0].toUpperCase(), msg, category:forumCat, time:Date.now(), likes:0 });
  };

  // --- Admin/Contribute Logic ---
  const submitContrib = async () => {
    if(!cQ.q||!cQ.o1) return showNotif("Fields fill ചെയ്യൂ!","error");
    await push(ref(db,"pending_questions"), { ...cQ, options:[cQ.o1,cQ.o2,cQ.o3,cQ.o4], answer:parseInt(cQ.answer), submittedBy:user.uid, submittedByName:user.displayName||user.email, status:"pending", submittedAt:serverTimestamp() });
    setCQ({q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:""}); showNotif("Question submitted! 🎉");
  };
  const approveQ = async (pq) => {
    await push(ref(db,"questions"), { q:pq.q, qm:pq.qm||"", options:pq.options, answer:pq.answer, cat:pq.cat, explanation:pq.explanation||"", approvedBy:user.email, approvedAt:serverTimestamp() });
    await remove(ref(db,`pending_questions/${pq.id}`)); showNotif("✅ Approved!");
  };
  const addDirectQ = async () => {
    await push(ref(db,"questions"), { q:newQ.q, qm:newQ.qm||"", options:[newQ.o1,newQ.o2,newQ.o3,newQ.o4], answer:parseInt(newQ.answer), cat:newQ.cat, explanation:newQ.explanation||"", addedBy:user.email, addedAt:serverTimestamp() });
    setNewQ({q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",explanation:""}); showNotif("Added! 🎉");
  };
  const addCategory = async () => {
    const id = newCat.label.toLowerCase().replace(/[^a-z0-9]/g,"_")+"_"+Date.now();
    await set(ref(db,`categories/${id}`), { label:newCat.label, icon:newCat.icon, color:newCat.color, createdAt:serverTimestamp() });
    setNewCat({label:"",icon:"📋",color:"#6366f1"}); showNotif("Category added! 🎉");
  };
  
  // Bulk Upload Logic
  const parseBulk = (text) => text.trim().split("\n").filter(l=>l.trim()).map(line=>{
    const cols = line.includes("\t") ? line.split("\t") : line.split(",");
    const g=(i)=>(cols[i]||"").trim().replace(/^"|"$/g,"");
    const ar=g(5).toUpperCase(); const ans=ar==="B"?1:ar==="C"?2:ar==="D"?3:parseInt(ar)||0;
    return { q:g(0),o1:g(1),o2:g(2),o3:g(3),o4:g(4),answer:ans,explanation:g(6)||"" };
  }).filter(r=>r.q&&r.o1);
  const previewBulk = () => setBulkPreview(parseBulk(bulkText));
  const uploadBulk = async () => {
    for(const q of bulkPreview) await push(ref(db,"questions"),{ q:q.q,qm:"",options:[q.o1,q.o2,q.o3,q.o4],answer:q.answer,cat:bulkCat,explanation:q.explanation,addedBy:user.email,addedAt:serverTimestamp() });
    setBulkText(""); setBulkPreview([]); showNotif(`🎉 ${bulkPreview.length} questions uploaded!`);
  };

  // UI STYLES
  const S = { minHeight:"100vh", background:"#05050f", color:"#e2e8f0", fontFamily:"'Segoe UI',sans-serif", paddingBottom:80 };
  const card = (ex={}) => ({ background:"rgba(255,255,255,0.045)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, ...ex });
  const Btn = (bg,col="#fff",ex={}) => ({ background:bg, color:col, border:"none", borderRadius:12, padding:"12px 16px", cursor:"pointer", fontWeight:700, fontSize:13, transition:"all 0.2s", ...ex });
  const Inp = { width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 14px", color:"#e2e8f0", fontSize:13, marginBottom:10, outline:"none" };

  if(screen === "splash") return <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}><div style={{fontSize:72}}>🎓</div><h1 style={{color:"#a5b4fc"}}>PSC Quiz Kerala</h1></div>;

  if(screen === "auth") return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:30}}><div style={{fontSize:60}}>🎓</div><h1 style={{color:"#a5b4fc"}}>PSC Quiz Kerala</h1></div>
        <button onClick={loginGoogle} style={{...Btn("#fff","#000"),width:"100%",marginBottom:20}}>G Continue with Google</button>
        <div style={{...card(),padding:20}}>
          <div style={{display:"flex",marginBottom:15}}>
            <button onClick={()=>setAuthMode("login")} style={{flex:1,padding:10,background:authMode==="login"?"#6366f1":"transparent",border:"none",color:"#fff",borderRadius:8}}>Login</button>
            <button onClick={()=>setAuthMode("register")} style={{flex:1,padding:10,background:authMode==="register"?"#6366f1":"transparent",border:"none",color:"#fff",borderRadius:8}}>Register</button>
          </div>
          {authMode==="register"&&<input value={dn} onChange={e=>setDn(e.target.value)} placeholder="Name" style={Inp}/>}
          <input value={em} onChange={e=>setEm(e.target.value)} placeholder="Email" type="email" style={Inp}/>
          <input value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" type="password" style={Inp}/>
          {authErr&&<div style={{color:"#ef4444",marginBottom:10,fontSize:12}}>{authErr}</div>}
          <button onClick={loginEmail} style={{...Btn("#6366f1"),width:"100%"}}>{authLoading?"Loading...":authMode==="login"?"Login":"Register"}</button>
        </div>
      </div>
    </div>
  );

  const Header = () => (
    <div style={{background:"rgba(19,16,58,0.9)",padding:"12px 16px",display:"flex",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(10px)",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
      <div onClick={()=>setScreen("home")} style={{fontWeight:"bold",color:"#a5b4fc",cursor:"pointer"}}>🎓 PSC Quiz Kerala</div>
      <div style={{display:"flex",gap:8}}>
        {isAdmin&&<button onClick={()=>setScreen("admin")} style={Btn("rgba(251,191,36,0.2)","#fbbf24",{padding:"5px 10px"})}>👑 Admin</button>}
        <button onClick={logout} style={Btn("rgba(255,255,255,0.1)","#fff",{padding:"5px 10px"})}>Logout</button>
      </div>
    </div>
  );

  const BottomNav = () => (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0a0a1a",borderTop:"1px solid #222",display:"flex",zIndex:100,paddingBottom:5}}>
      {[["home","🏠","Home"],["contribute","✍️","Contribute"],["battle_select","⚔️","Battle"],["forum","💬","Forum"],["myprogress","📊","Progress"]].map(([s,i,l])=>(
        <button key={s} onClick={()=>setScreen(s)} style={{flex:1,padding:"10px 0",background:"none",border:"none",color:screen===s?"#a5b4fc":"#666",display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer"}}><span style={{fontSize:20}}>{i}</span><span style={{fontSize:10}}>{l}</span></button>
      ))}
    </div>
  );

  return (
    <div style={S}>
      {notif&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:notif.type==="error"?"#ef4444":"#10b981",color:"#fff",padding:"10px 20px",borderRadius:30,zIndex:999,boxShadow:"0 4px 12px rgba(0,0,0,0.5)"}}>{notif.msg}</div>}
      <Header/>
      
      <div style={{maxWidth:500,margin:"0 auto",padding:"15px"}}>
        
        {screen==="home"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:20}}>
              <h1 style={{fontSize:22,color:"#e879f9",marginBottom:5}}>Kerala PSC Exam Prep</h1>
              <p style={{fontSize:12,color:"#10b981",background:"rgba(16,185,129,0.1)",display:"inline-block",padding:"4px 10px",borderRadius:10}}>Total Questions: {allQ.length} (From DB: {fbQ.length})</p>
            </div>
            
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <button onClick={()=>startQuiz("mock")} style={{...Btn("rgba(236,72,153,0.15)","#f0abfc",{border:"1px solid rgba(236,72,153,0.3)"}),flex:1,padding:20,fontSize:16}}>🎯 Mock Test</button>
              <button onClick={()=>setScreen("battle_select")} style={{...Btn("rgba(239,68,68,0.15)","#fca5a5",{border:"1px solid rgba(239,68,68,0.3)"}),flex:1,padding:20,fontSize:16}}>⚔️ Quiz Battle</button>
            </div>

            <h4 style={{color:"#888",marginBottom:10,fontSize:12,letterSpacing:1}}>CATEGORIES</h4>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {categories.map(cat=>{
                // 🔴 Robust match logic 🔴
                const qCount = allQ.filter(q => String(q.cat).toLowerCase().trim() === String(cat.id).toLowerCase().trim()).length;
                return (
                  <div key={cat.id} onClick={()=>startQuiz(cat.id)} style={{...card(),padding:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer",borderLeft:`4px solid ${cat.color}`}}>
                    <span style={{fontSize:24}}>{cat.icon}</span>
                    <div style={{flex:1}}><div style={{fontWeight:"bold",fontSize:15}}>{cat.label}</div></div>
                    <div style={{background:`${cat.color}20`,color:cat.color,padding:"4px 10px",borderRadius:8,fontSize:12,fontWeight:"bold"}}>{qCount} Qs</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {screen==="quiz"&&questions[curr]&&(
          <div>
            <div style={{...card(),padding:20,marginBottom:15,borderTop:"4px solid #6366f1"}}>
              <div style={{color:"#a5b4fc",marginBottom:10,fontWeight:"bold"}}>Question {curr+1} of {questions.length}</div>
              <div style={{fontSize:18,fontWeight:"bold"}}>{questions[curr].q}</div>
              {questions[curr].qm && <div style={{color:"#94a3b8",marginTop:8}}>{questions[curr].qm}</div>}
            </div>
            {questions[curr].options.map((opt,i)=>{
              let bg="rgba(255,255,255,0.05)", col="#fff", border="1px solid rgba(255,255,255,0.1)";
              if(picked!==null){ if(i===questions[curr].answer){bg="rgba(16,185,129,0.2)";col="#10b981";border="1px solid #10b981";} else if(i===picked){bg="rgba(239,68,68,0.2)";col="#ef4444";border="1px solid #ef4444";} }
              return <button key={i} onClick={()=>handleAns(i)} style={{width:"100%",padding:15,background:bg,color:col,border:border,borderRadius:12,textAlign:"left",marginBottom:10,fontSize:15}}>{opt}</button>;
            })}
            {picked!==null&&(
              <div style={{marginTop:15}}>
                {questions[curr].explanation&&<div style={{padding:12,background:"rgba(245,158,11,0.1)",color:"#fbbf24",borderRadius:10,marginBottom:15}}>💡 {questions[curr].explanation}</div>}
                <button onClick={nextQ} style={{...Btn("#6366f1"),width:"100%",padding:15,fontSize:16}}>{curr+1>=questions.length?"Show Results 🏆":"Next Question ➡️"}</button>
              </div>
            )}
          </div>
        )}

        {screen==="result"&&(
          <div style={{textAlign:"center",padding:30}}>
            <div style={{fontSize:80,marginBottom:10}}>🏆</div>
            <h2 style={{color:"#c7d2fe"}}>Quiz Completed!</h2>
            <div style={{fontSize:60,fontWeight:"bold",color:"#a855f7",margin:"20px 0"}}>{score}/{questions.length}</div>
            <button onClick={()=>setScreen("home")} style={{...Btn("#6366f1"),width:"100%",padding:15,fontSize:16}}>Go Home 🏠</button>
          </div>
        )}

        {/* ─── BATTLE SCREENS ─── */}
        {screen==="battle_select"&&(
          <div>
            <h2 style={{color:"#fca5a5",marginBottom:20}}>⚔️ Quiz Battle Modes</h2>
            {[{type:"1v1",i:"🤺",t:"1 vs 1 Battle",s:"Play with a friend"},{type:"multi",i:"👥",t:"Multiplayer",s:"Play with many"}].map(b=>(
              <div key={b.type} onClick={()=>{setBattleType(b.type);setScreen("battle_lobby");}} style={{...card(),padding:20,marginBottom:15,display:"flex",alignItems:"center",gap:15,cursor:"pointer"}}>
                <span style={{fontSize:30}}>{b.i}</span><div><div style={{fontSize:18,fontWeight:"bold"}}>{b.t}</div><div style={{color:"#888",fontSize:12}}>{b.s}</div></div>
              </div>
            ))}
          </div>
        )}

        {screen==="battle_lobby"&&(
          <div>
            <button onClick={()=>setScreen("battle_select")} style={{...Btn("rgba(255,255,255,0.1)"),marginBottom:20}}>← Back</button>
            <div style={{...card(),padding:20,marginBottom:20,borderLeft:"4px solid #6366f1"}}>
              <h3 style={{color:"#a5b4fc",marginBottom:15}}>Create a Room</h3>
              <button onClick={createRoom} style={{...Btn("#6366f1"),width:"100%"}}>Create New Game</button>
            </div>
            <div style={{...card(),padding:20,borderLeft:"4px solid #10b981"}}>
              <h3 style={{color:"#10b981",marginBottom:15}}>Join a Room</h3>
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ENTER 6 DIGIT CODE" style={{...Inp,textAlign:"center",fontSize:20,letterSpacing:5,fontWeight:"bold"}}/>
              {roomErr&&<p style={{color:"#ef4444",fontSize:12}}>{roomErr}</p>}
              <button onClick={joinRoom} style={{...Btn("#10b981"),width:"100%"}}>Join Game</button>
            </div>
          </div>
        )}

        {screen==="room"&&(
          <div style={{textAlign:"center"}}>
            <h2 style={{color:"#888"}}>Room Code</h2>
            <div style={{fontSize:50,fontWeight:"bold",color:"#a5b4fc",letterSpacing:10,margin:"20px 0"}}>{roomCode}</div>
            <div style={{...card(),padding:20,textAlign:"left",marginBottom:20}}>
              <h3 style={{marginBottom:15}}>Players ({Object.keys(roomData?.players||{}).length})</h3>
              {Object.values(roomData?.players||{}).map((p,i)=><div key={i} style={{padding:10,background:"rgba(255,255,255,0.05)",marginBottom:5,borderRadius:8}}>👤 {p.name}</div>)}
            </div>
            {roomData?.hostUid===user.uid ? <button onClick={startBattle} style={{...Btn("#10b981"),width:"100%",padding:15}}>Start Battle 🚀</button> : <p style={{color:"#f59e0b"}}>Waiting for host to start...</p>}
          </div>
        )}

        {screen==="battle"&&battleQ[battleCurr]&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:15}}>
              <span style={{color:"#a5b4fc",fontWeight:"bold"}}>Q {battleCurr+1}/{battleQ.length}</span>
              <span style={{color:battleTimer<=5?"#ef4444":"#10b981",fontWeight:"bold",fontSize:18}}>⏱ {battleTimer}s</span>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              {Object.values(roomData?.players||{}).map((p,i)=>(
                <div key={i} style={{...card(),flex:1,padding:10,textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:"bold",color:"#a5b4fc"}}>{p.score||0}</div><div style={{fontSize:10,color:"#888"}}>{p.name.split(" ")[0]}</div>
                </div>
              ))}
            </div>
            <div style={{...card(),padding:20,marginBottom:15,fontSize:18,fontWeight:"bold"}}>{battleQ[battleCurr].q}</div>
            {battleQ[battleCurr].options.map((opt,i)=>{
              let bg="rgba(255,255,255,0.05)", col="#fff";
              if(battlePicked!==null){if(i===battleQ[battleCurr].answer){bg="rgba(16,185,129,0.2)";col="#10b981";}else if(i===battlePicked){bg="rgba(239,68,68,0.2)";col="#ef4444";}}
              return <button key={i} onClick={()=>handleBattleAns(i)} style={{width:"100%",padding:15,background:bg,color:col,border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,textAlign:"left",marginBottom:10}}>{opt}</button>;
            })}
            {battlePicked!==null&&<button onClick={nextBattle} style={{...Btn("#6366f1"),width:"100%",marginTop:10,padding:15}}>Next</button>}
          </div>
        )}

        {screen==="battle_result"&&(
          <div style={{textAlign:"center",padding:30}}>
            <div style={{fontSize:80,marginBottom:20}}>🏆</div><h2 style={{color:"#c7d2fe",marginBottom:30}}>Battle Over!</h2>
            {Object.values(roomData?.players||{}).sort((a,b)=>b.score-a.score).map((p,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:15,background:i===0?"rgba(16,185,129,0.2)":"rgba(255,255,255,0.05)",borderRadius:10,marginBottom:10,fontWeight:"bold",color:i===0?"#10b981":"#fff"}}>
                <span>{i===0?"🥇 ":""}{p.name}</span><span>{p.score} pts</span>
              </div>
            ))}
            <button onClick={()=>setScreen("home")} style={{...Btn("#6366f1"),width:"100%",marginTop:20,padding:15}}>Exit to Home</button>
          </div>
        )}

        {/* ─── FORUM ─── */}
        {screen==="forum"&&(
          <div style={{display:"flex",flexDirection:"column",height:"80vh"}}>
            <h2 style={{color:"#a5b4fc",marginBottom:10}}>💬 Study Forum</h2>
            <div style={{flex:1,overflowY:"auto",background:"rgba(0,0,0,0.2)",borderRadius:12,padding:15,marginBottom:15}}>
              {forumPosts.map(p=>(
                <div key={p.id} style={{background:p.uid===user.uid?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.05)",padding:12,borderRadius:12,marginBottom:10,marginLeft:p.uid===user.uid?"auto":"0",marginRight:p.uid===user.uid?"0":"auto",maxWidth:"85%"}}>
                  <div style={{fontSize:10,color:p.uid===user.uid?"#a5b4fc":"#10b981",marginBottom:5,fontWeight:"bold"}}>{p.name}</div>
                  <div style={{fontSize:14}}>{p.msg}</div>
                </div>
              ))}
              <div ref={forumEndRef}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <input value={forumMsg} onChange={e=>setForumMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendForumMsg()} placeholder="Type a message..." style={{...Inp,marginBottom:0,flex:1}}/>
              <button onClick={sendForumMsg} style={Btn("#6366f1")}>Send</button>
            </div>
          </div>
        )}

        {/* ─── CONTRIBUTE & PROGRESS ─── */}
        {screen==="contribute"&&(
          <div style={{...card(),padding:20,borderTop:"4px solid #10b981"}}>
            <h2 style={{color:"#10b981",marginBottom:15}}>✍️ Add Question</h2>
            <input value={cQ.q} onChange={e=>setCQ({...cQ,q:e.target.value})} placeholder="Question" style={Inp}/>
            {["o1","o2","o3","o4"].map((k,i)=><input key={k} value={cQ[k]} onChange={e=>setCQ({...cQ,[k]:e.target.value})} placeholder={`Option ${i+1}`} style={Inp}/>)}
            <div style={{display:"flex",gap:10,marginBottom:15}}>
              <select value={cQ.answer} onChange={e=>setCQ({...cQ,answer:e.target.value})} style={{...Inp,marginBottom:0}}><option value="0">Ans: 1</option><option value="1">Ans: 2</option><option value="2">Ans: 3</option><option value="3">Ans: 4</option></select>
              <select value={cQ.cat} onChange={e=>setCQ({...cQ,cat:e.target.value})} style={{...Inp,marginBottom:0}}>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
            </div>
            <button onClick={submitContrib} style={{...Btn("#10b981"),width:"100%",padding:15}}>Submit to Admin</button>
          </div>
        )}

        {screen==="myprogress"&&(
          <div>
            <h2 style={{color:"#fca5a5",marginBottom:20}}>📊 My Progress</h2>
            {Object.keys(myStats).length===0?<p style={{color:"#888"}}>No quiz played yet!</p>:Object.entries(myStats).map(([k,v])=>(
              <div key={k} style={{...card(),padding:15,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontWeight:"bold",color:"#e2e8f0"}}>{categories.find(c=>c.id===k)?.label||k}</div>
                <div style={{textAlign:"right"}}><div style={{color:"#10b981",fontWeight:"bold"}}>Best: {v.best}</div><div style={{fontSize:10,color:"#888"}}>Attempts: {v.attempts}</div></div>
              </div>
            ))}
          </div>
        )}

        {/* ─── FULL ADMIN PANEL ─── */}
        {screen==="admin"&&isAdmin&&(
          <div>
            <h2 style={{color:"#fbbf24",marginBottom:15}}>👑 Super Admin Panel</h2>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
              {[["ai","🤖 AI Gen"],["pending",`⏳ Pend (${pendingQ.length})`],["bulk","📋 Bulk"],["addq","➕ Add"],["cats","📁 Cats"],["admins","👑 Admins"],["members","🟢 Users"],["fix","🛠️ Fix DB"]].map(([t,l])=>(
                <button key={t} onClick={()=>setAdminTab(t)} style={{padding:"8px 12px",background:adminTab===t?"#6366f1":"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,color:"#fff",fontSize:12,cursor:"pointer"}}>{l}</button>
              ))}
            </div>

            {adminTab==="pending"&&(
              <div>
                {pendingQ.length===0?<p style={{color:"#888",textAlign:"center",padding:20}}>No pending questions.</p>:pendingQ.map(pq=>(
                  <div key={pq.id} style={{...card(),padding:15,marginBottom:10,borderLeft:"4px solid #f59e0b"}}>
                    <div style={{fontSize:10,color:"#f59e0b",marginBottom:5}}>By: {pq.submittedByName} | Cat: {pq.cat}</div>
                    <div style={{fontWeight:"bold",marginBottom:10}}>{pq.q}</div>
                    {pq.options.map((o,i)=><div key={i} style={{fontSize:12,color:i===pq.answer?"#10b981":"#aaa"}}>{o} {i===pq.answer?"✓":""}</div>)}
                    <div style={{display:"flex",gap:10,marginTop:15}}>
                      <button onClick={()=>approveQ(pq)} style={{...Btn("#10b981"),flex:1}}>Approve</button>
                      <button onClick={()=>remove(ref(db,`pending_questions/${pq.id}`))} style={{...Btn("#ef4444"),flex:1}}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {adminTab==="ai"&&isSuperAdmin&&<PuterQuizGenerator db={db} categories={categories} user={user} showNotif={showNotif} />}

            {adminTab==="bulk"&&isSuperAdmin&&(
              <div style={{...card(),padding:20}}>
                <h3 style={{color:"#fca5a5",marginBottom:10}}>Bulk Upload</h3>
                <p style={{fontSize:10,color:"#888",marginBottom:10}}>Format: Question | OptA | OptB | OptC | OptD | Ans(A/B/C/D) | Expl</p>
                <select value={bulkCat} onChange={e=>setBulkCat(e.target.value)} style={Inp}>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
                <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} rows={6} style={{...Inp,resize:"vertical"}} placeholder="Paste tabular data here..."/>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={previewBulk} style={{...Btn("rgba(255,255,255,0.1)"),flex:1}}>Preview</button>
                  <button onClick={uploadBulk} disabled={!bulkPreview.length} style={{...Btn("#6366f1"),flex:1}}>Upload {bulkPreview.length}</button>
                </div>
              </div>
            )}

            {adminTab==="cats"&&isSuperAdmin&&(
              <div>
                <div style={{...card(),padding:20,marginBottom:15}}>
                  <h3 style={{color:"#a5b4fc",marginBottom:10}}>Add Category</h3>
                  <div style={{display:"flex",gap:10,marginBottom:10}}><input value={newCat.label} onChange={e=>setNewCat({...newCat,label:e.target.value})} placeholder="Name" style={{...Inp,marginBottom:0,flex:1}}/></div>
                  <button onClick={addCategory} style={{...Btn("#6366f1"),width:"100%"}}>Add Category</button>
                </div>
                {categories.map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:10,background:"rgba(255,255,255,0.05)",marginBottom:5,borderRadius:8}}><span>{c.icon} {c.label}</span><span onClick={()=>deleteCat(c.id)} style={{color:"#ef4444",cursor:"pointer"}}>🗑️</span></div>)}
              </div>
            )}

            {adminTab==="addq"&&isSuperAdmin&&(
              <div style={{...card(),padding:20}}>
                <h3 style={{color:"#10b981",marginBottom:10}}>Manual Add</h3>
                <input value={newQ.q} onChange={e=>setNewQ({...newQ,q:e.target.value})} placeholder="Question" style={Inp}/>
                {["o1","o2","o3","o4"].map((k,i)=><input key={k} value={newQ[k]} onChange={e=>setNewQ({...newQ,[k]:e.target.value})} placeholder={`Option ${i+1}`} style={Inp}/>)}
                <select value={newQ.answer} onChange={e=>setNewQ({...newQ,answer:e.target.value})} style={Inp}><option value="0">Ans: A</option><option value="1">Ans: B</option><option value="2">Ans: C</option><option value="3">Ans: D</option></select>
                <select value={newQ.cat} onChange={e=>setNewQ({...newQ,cat:e.target.value})} style={Inp}>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
                <button onClick={addDirectQ} style={{...Btn("#10b981"),width:"100%"}}>Add to DB</button>
              </div>
            )}

            {adminTab==="admins"&&isSuperAdmin&&(
              <div style={{...card(),padding:20}}>
                <h3 style={{color:"#f59e0b",marginBottom:10}}>Manage Admins</h3>
                <div style={{display:"flex",gap:10}}><input value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} placeholder="Admin Email" style={{...Inp,marginBottom:0}}/><button onClick={async()=>{await set(ref(db,`adminEmails/${newAdminEmail.replace(/\./g,"_")}`),{email:newAdminEmail});showNotif("Added!");}} style={Btn("#f59e0b")}>Add</button></div>
                <div style={{marginTop:15}}>{adminList.map(a=><div key={a.key} style={{padding:8,background:"rgba(255,255,255,0.05)",marginBottom:5}}>{a.email}</div>)}</div>
              </div>
            )}
            
            {adminTab==="members"&&isSuperAdmin&&(
              <div style={{...card(),padding:20}}>
                <h3 style={{color:"#10b981",marginBottom:10}}>🟢 Active Users Now: {activeMembers}</h3>
                <p style={{fontSize:12,color:"#888"}}>Real-time live presence counter.</p>
              </div>
            )}

            {/* 🔴 ഡാറ്റാബേസിൽ നിന്ന് എല്ലാ ചോദ്യങ്ങളെയും പുതിയ കാറ്റഗറികളിലേക്ക് തിരികെ കൊണ്ടുവരാനുള്ള പവർഫുൾ ടൂൾ 🔴 */}
            {adminTab==="fix"&&(
               <div style={{...card(),padding:16,borderLeft:"4px solid #ef4444", background:"rgba(239,68,68,0.05)"}}>
                 <h3 style={{color:"#fca5a5",marginBottom:10}}>🛠️ DB Diagnostics & Fixer</h3>
                 <p style={{fontSize:12, color:"#cbd5e1", marginBottom:10}}>Total Qs connected: {fbQ.length}</p>
                 
                 <div style={{background:"rgba(0,0,0,0.3)", padding:12, borderRadius:8, marginBottom:14}}>
                  <div style={{color:"#f59e0b", fontWeight:"bold", marginBottom:6}}>⚠ Orphaned / Hidden Questions</div>
                  <p style={{fontSize:11, color:"#94a3b8", marginBottom:10}}>കാറ്റഗറി ഡിലീറ്റ് ആയതുകൊണ്ട് അല്ലെങ്കിൽ പേര് മാറിയതുകൊണ്ട് ഹോം സ്ക്രീനിൽ കാണിക്കാത്ത ചോദ്യങ്ങൾ.</p>
                  
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
                      }} style={{...Btn("rgba(99,102,241,0.2)", "#a5b4fc"), padding:"6px 10px", fontSize:11, marginTop:8, width:"100%"}}>
                        Recover & Move to LDC Category 🚀
                      </button>
                    </div>
                  ))}
                  
                  {Object.keys(fbQ.reduce((acc, q) => { if(!categories.find(c=>String(c.id).toLowerCase().trim() === String(q.cat).toLowerCase().trim())) acc[q.cat]=1; return acc; }, {})).length === 0 && (
                    <div style={{fontSize:11, color:"#10b981", padding:10, textAlign:"center"}}>എല്ലാ ചോദ്യങ്ങൾക്കും കാറ്റഗറിയുണ്ട്! കുഴപ്പങ്ങളൊന്നുമില്ല.</div>
                  )}
                 </div>

                 <button onClick={() => window.location.reload(true)} style={{...Btn("rgba(255,255,255,0.1)", "#fff"), width:"100%"}}>🔄 Clear Browser Cache & Reload</button>
               </div>
            )}
          </div>
        )}

      </div>
      {(screen==="home"||screen==="admin"||screen==="contribute"||screen==="forum"||screen==="battle_select")&&<BottomNav/>}
    </div>
  );
}
