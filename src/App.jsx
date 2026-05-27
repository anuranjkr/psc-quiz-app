import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getDatabase, ref, set, get, onValue, push, serverTimestamp, query, orderByChild, limitToLast, remove, update, increment } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyArFo7B3M7lSfbOzUSycMUsnke8YSck74k",
  authDomain: "psc-quiz-kerala.firebaseapp.com",
  databaseURL: "https://psc-quiz-kerala-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "psc-quiz-kerala",
  storageBucket: "psc-quiz-kerala.firebasestorage.app",
  messagingSenderId: "100637065162",
  appId: "1:100637065162:web:d492ed8ff24718ca215933",
};

const SUPER_ADMIN = "anuranjkr45@gmail.com";
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);
const gProvider = new GoogleAuthProvider();

const DEFAULT_CATS = [
  { id:"ldc", label:"LDC / LGS", icon:"📋", color:"#6366f1" },
  { id:"psc", label:"PSC General", icon:"🏛️", color:"#8b5cf6" },
  { id:"police", label:"Police / SI", icon:"👮", color:"#3b82f6" },
  { id:"science", label:"Science", icon:"🔬", color:"#10b981" },
  { id:"history", label:"History", icon:"📜", color:"#f59e0b" },
  { id:"geography", label:"Geography", icon:"🌍", color:"#06b6d4" },
  { id:"current", label:"Current Affairs", icon:"📰", color:"#ef4444" },
];

const BUILTIN_Q = [
  { id:"b1", q:"Kerala formed on?", qm:"കേരളം രൂപീകരിച്ചത്?", options:["Nov 1, 1956","Aug 15, 1947","Jan 26, 1950","Nov 1, 1960"], answer:0, cat:"ldc", difficulty:"easy", explanation:"Kerala was formed on November 1, 1956 as part of the States Reorganisation Act." },
  { id:"b2", q:"Longest river in Kerala?", qm:"കേരളത്തിലെ ഏറ്റവും നീളം?", options:["Periyar","Bharathapuzha","Pamba","Chaliyar"], answer:1, cat:"ldc", difficulty:"easy", explanation:"Bharathapuzha (312 km) is the longest river in Kerala." },
  { id:"b3", q:"Capital of Kerala?", qm:"കേരളത്തിന്റെ തലസ്ഥാനം?", options:["Kochi","Kozhikode","Thiruvananthapuram","Thrissur"], answer:2, cat:"ldc", difficulty:"easy", explanation:"Thiruvananthapuram is the capital of Kerala." },
  { id:"b4", q:"National game of India?", qm:"ഇന്ത്യയുടെ ദേശീയ കായിക വിനോദം?", options:["Cricket","Football","Hockey","Kabaddi"], answer:2, cat:"psc", difficulty:"easy", explanation:"Field Hockey is the national game of India." },
  { id:"b5", q:"Chemical symbol of Gold?", qm:"സ്വർണ്ണത്തിന്റെ രാസ ചിഹ്നം?", options:["Go","Gd","Au","Ag"], answer:2, cat:"science", difficulty:"easy", explanation:"Au comes from the Latin word 'Aurum' meaning gold." },
  { id:"b6", q:"Chandrayaan-3 year?", qm:"ചന്ദ്രയാൻ-3 വർഷം?", options:["2022","2023","2024","2021"], answer:1, cat:"current", difficulty:"easy", explanation:"Chandrayaan-3 successfully landed on the Moon's south pole on August 23, 2023." },
  { id:"b7", q:"Battle of Plassey year?", qm:"പ്ലാസി യുദ്ധം?", options:["1757","1764","1799","1857"], answer:0, cat:"history", difficulty:"medium", explanation:"The Battle of Plassey was fought on June 23, 1757." },
  { id:"b8", q:"Largest state by area?", qm:"ഏറ്റവും വലിയ സംസ്ഥാനം?", options:["MP","Rajasthan","Maharashtra","UP"], answer:1, cat:"geography", difficulty:"easy", explanation:"Rajasthan is the largest state in India by area." },
  { id:"b9", q:"IPC stands for?", qm:"IPC-യുടെ പൂർണ്ണ രൂപം?", options:["Indian Penal Code","Indian Police Code","Indian Penal Court","Indian Public Code"], answer:0, cat:"police", difficulty:"easy", explanation:"IPC - Indian Penal Code, enacted in 1860." },
  { id:"b10", q:"Speed of light?", qm:"പ്രകാശ വേഗത?", options:["3×10⁸ m/s","3×10⁶ m/s","3×10⁵ m/s","3×10⁴ m/s"], answer:0, cat:"science", difficulty:"medium", explanation:"Speed of light in vacuum is approximately 3×10⁸ m/s." },
  { id:"b11", q:"Highest peak in Kerala?", qm:"കേരളത്തിലെ ഏറ്റവും ഉയർന്ന കൊടുമുടി?", options:["Chembra","Anamudi","Meesapulimala","Agasthyamala"], answer:1, cat:"ldc", difficulty:"easy", explanation:"Anamudi (2695m) is the highest peak in Kerala and South India." },
  { id:"b12", q:"Father of Indian Constitution?", qm:"ഭരണഘടനയുടെ പിതാവ്?", options:["Nehru","Sardar Patel","BR Ambedkar","Rajendra Prasad"], answer:2, cat:"psc", difficulty:"easy", explanation:"Dr. BR Ambedkar is known as the Father of the Indian Constitution." },
];

const ICONS = ["📋","🏛️","👮","🔬","📜","🌍","📰","🎯","📚","✏️","🧪","⚖️","💡","🗺️","🏆","📖","🔭","🧮","🏅","📐","🎓","🔑","⚡","🌟","🏫"];
const COLORS = ["#6366f1","#8b5cf6","#3b82f6","#10b981","#f59e0b","#06b6d4","#ef4444","#ec4899","#84cc16","#f97316","#14b8a6","#a855f7","#0ea5e9","#d946ef"];

// Computer AI answers
const computerAnswer = (q) => Math.random() < 0.65 ? q.answer : (q.answer + 1 + Math.floor(Math.random()*3)) % 4;

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [history, setHistory] = useState(["home"]);
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [dn, setDn] = useState(""); const [authErr, setAuthErr] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [fbQ, setFbQ] = useState([]); const [allQ, setAllQ] = useState(BUILTIN_Q);
  const [pendingQ, setPendingQ] = useState([]);
  const [myContributions, setMyContributions] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [activeMembers, setActiveMembers] = useState(0);
  const [expandedCat, setExpandedCat] = useState(null);
  // Quiz
  const [questions, setQuestions] = useState([]); const [selCat, setSelCat] = useState(null);
  const [quizCount, setQuizCount] = useState(10);
  const [curr, setCurr] = useState(0); const [picked, setPicked] = useState(null); const [score, setScore] = useState(0); const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(30); const timerRef = useRef(null);
  const [leaderboard, setLeaderboard] = useState([]); const [myStats, setMyStats] = useState({});
  // Admin
  const [adminTab, setAdminTab] = useState("pending");
  const [newCat, setNewCat] = useState({ label:"", icon:"📋", color:"#6366f1" });
  const [newQ, setNewQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",difficulty:"easy",explanation:"" });
  const [addQStatus, setAddQStatus] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState(""); const [adminStatus, setAdminStatus] = useState("");
  const [sheetId, setSheetId] = useState(""); const [sheetStatus, setSheetStatus] = useState("idle"); const [sheetCat, setSheetCat] = useState("ldc");
  // Contribute
  const [contributeQ, setContributeQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",difficulty:"easy",explanation:"" });
  const [contribStatus, setContribStatus] = useState("");
  // Battle
  const [battleType, setBattleType] = useState(null); // "1v1"|"multi"|"random"
  const [roomCode, setRoomCode] = useState(""); const [joinCode, setJoinCode] = useState("");
  const [roomData, setRoomData] = useState(null); const [roomErr, setRoomErr] = useState("");
  const [battleQ, setBattleQ] = useState([]); const [battleCurr, setBattleCurr] = useState(0);
  const [battlePicked, setBattlePicked] = useState(null); const [battleScore, setBattleScore] = useState(0);
  const [battleTimer, setBattleTimer] = useState(20); const battleTimerRef = useRef(null);
  const [chatMsg, setChatMsg] = useState(""); const [chatMessages, setChatMessages] = useState([]);
  const [battleStarted, setBattleStarted] = useState(false);
  const [waitingRandom, setWaitingRandom] = useState(false);
  // Notification
  const [notif, setNotif] = useState(null);
  const showNotif = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };

  const goTo = (s) => { setScreen(s); setHistory(h=>[...h,s]); };
  const goBack = () => {
    if (history.length > 1) {
      const newH = [...history]; newH.pop();
      setHistory(newH); setScreen(newH[newH.length-1]);
    } else { setScreen("home"); }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const superAdmin = u.email === SUPER_ADMIN;
        setIsSuperAdmin(superAdmin);
        const adminSnap = await get(ref(db,`adminEmails/${u.email.replace(/\./g,"_")}`));
        setIsAdmin(superAdmin || adminSnap.exists());
        // Set online
        await set(ref(db,`online/${u.uid}`), { name:u.displayName||u.email, lastSeen:serverTimestamp(), online:true });
        loadAll(u.uid, superAdmin || adminSnap.exists());
        setScreen("home"); setHistory(["home"]);
      } else { setTimeout(()=>setScreen("auth"),1500); }
    });
    return () => unsub();
  }, []);

  useEffect(() => { setAllQ([...BUILTIN_Q,...fbQ]); }, [fbQ]);

  const loadAll = (uid, admin) => {
    onValue(ref(db,"questions"),(snap)=>{ const qs=[]; if(snap.exists()) snap.forEach(c=>qs.push({id:c.key,...c.val()})); setFbQ(qs); });
    onValue(ref(db,"categories"),(snap)=>{ if(snap.exists()){ const cats=[]; snap.forEach(c=>cats.push({id:c.key,...c.val()})); setCategories([...DEFAULT_CATS,...cats]); } });
    const lb = query(ref(db,"leaderboard"),orderByChild("score"),limitToLast(20));
    onValue(lb,(snap)=>{ if(snap.exists()){ const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setLeaderboard(d.reverse()); } });
    onValue(ref(db,`users/${uid}/stats`),(snap)=>{ if(snap.exists()) setMyStats(snap.val()); });
    onValue(ref(db,`users/${uid}/contributions`),(snap)=>{ if(snap.exists()){ const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setMyContributions(d); } });
    // Active members count
    onValue(ref(db,"online"),(snap)=>{ setActiveMembers(snap.exists()?snap.size:0); });
    if (admin) {
      onValue(ref(db,"pending_questions"),(snap)=>{ const d=[]; if(snap.exists()) snap.forEach(c=>d.push({id:c.key,...c.val()})); setPendingQ(d); });
      onValue(ref(db,"adminEmails"),(snap)=>{ if(snap.exists()){ const d=[]; snap.forEach(c=>d.push({key:c.key,email:c.key.replace(/_/g,".")})); setAdminList(d); } });
    }
  };

  // Auth
  const loginGoogle = async () => { setAuthLoading(true); setAuthErr(""); try { await signInWithPopup(auth,gProvider); } catch { setAuthErr("Google login failed!"); } setAuthLoading(false); };
  const loginEmail = async () => {
    setAuthLoading(true); setAuthErr("");
    try {
      if (authMode==="register") {
        if (!dn.trim()) { setAuthErr("പേര് ഇടൂ!"); setAuthLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth,em,pw);
        await updateProfile(cred.user,{displayName:dn});
        await set(ref(db,`users/${cred.user.uid}/profile`),{name:dn,email:em,createdAt:Date.now()});
      } else { await signInWithEmailAndPassword(auth,em,pw); }
    } catch(e) { setAuthErr(e.code==="auth/wrong-password"?"❌ Password തെറ്റ്!":e.code==="auth/user-not-found"?"❌ User ഇല്ല!":e.code==="auth/email-already-in-use"?"❌ Email used!":"❌ "+e.message); }
    setAuthLoading(false);
  };
  const logout = async () => { if(user) await remove(ref(db,`online/${user.uid}`)); await signOut(auth); };

  // Quiz Timer
  useEffect(() => {
    if (screen!=="quiz"||picked!==null) return;
    setTimer(30); clearInterval(timerRef.current);
    timerRef.current = setInterval(()=>{ setTimer(t=>{ if(t<=1){ clearInterval(timerRef.current); handleAns(-1); return 0; } return t-1; }); },1000);
    return ()=>clearInterval(timerRef.current);
  },[curr,screen]);

  // Battle Timer
  useEffect(() => {
    if (screen!=="battle"||battlePicked!==null||!battleStarted) return;
    setBattleTimer(20); clearInterval(battleTimerRef.current);
    battleTimerRef.current = setInterval(()=>{ setBattleTimer(t=>{ if(t<=1){ clearInterval(battleTimerRef.current); handleBattleAns(-1); return 0; } return t-1; }); },1000);
    return ()=>clearInterval(battleTimerRef.current);
  },[battleCurr,screen,battleStarted]);

  const startQuiz = (cat) => {
    const qs = (cat==="mock"?allQ:[...allQ].filter(q=>q.cat===cat)).sort(()=>Math.random()-0.5).slice(0,quizCount);
    if (!qs.length) { showNotif("Questions ഇല്ല!","error"); return; }
    setSelCat(cat); setQuestions(qs); setCurr(0); setPicked(null); setScore(0); setAnswers([]);
    setScreen("quiz"); setHistory(h=>[...h,"quiz"]);
  };

  const handleAns = (i) => {
    if (picked!==null) return; clearInterval(timerRef.current);
    setPicked(i); const q=questions[curr]; const ok=i===q.answer;
    if(ok) setScore(s=>s+1); setAnswers(a=>[...a,{q,sel:i,ok}]);
  };

  const nextQ = async () => {
    if (curr+1>=questions.length) { await saveResult(); setScreen("result"); setHistory(h=>[...h,"result"]); return; }
    setCurr(c=>c+1); setPicked(null);
  };

  const saveResult = async () => {
    if (!user) return;
    const fs = answers.filter(a=>a.ok).length;
    const catLabel = categories.find(c=>c.id===selCat)?.label||selCat||"Mock";
    await push(ref(db,"leaderboard"),{ uid:user.uid, name:user.displayName||user.email.split("@")[0], score:fs, total:questions.length, category:selCat||"mock", categoryLabel:catLabel, accuracy:Math.round((fs/questions.length)*100), timestamp:serverTimestamp() });
    const statsRef = ref(db,`users/${user.uid}/stats/${selCat||"mock"}`);
    const snap = await get(statsRef); const prev = snap.exists()?snap.val():{attempts:0,correct:0,best:0};
    await set(statsRef,{attempts:prev.attempts+1,correct:prev.correct+fs,best:Math.max(prev.best||0,fs)});
  };

  // Battle
  const startBattle = (type) => { setBattleType(type); goTo("battle_lobby"); };

  const createRoom = async (type) => {
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    const maxP = type==="multi"?100:2;
    const qs = allQ.sort(()=>Math.random()-0.5).slice(0,quizCount);
    await set(ref(db,`rooms/${code}`),{
      host:user.displayName||user.email, hostUid:user.uid, code, type,
      status:"waiting", maxPlayers:maxP, createdAt:serverTimestamp(),
      questions: qs.map(q=>({id:q.id,q:q.q,options:q.options,answer:q.answer,explanation:q.explanation||""})),
      players:{[user.uid]:{name:user.displayName||user.email,score:0,ready:false,avatar:user.displayName?user.displayName[0].toUpperCase():"U"}}
    });
    setRoomCode(code);
    onValue(ref(db,`rooms/${code}`),(snap)=>{ if(snap.exists()){ setRoomData(snap.val()); if(snap.val().questions) setBattleQ(Object.values(snap.val().questions)); } });
    onValue(ref(db,`rooms/${code}/chat`),(snap)=>{ if(snap.exists()){ const msgs=[]; snap.forEach(c=>msgs.push({id:c.key,...c.val()})); setChatMessages(msgs.slice(-50)); } });
    goTo("room");
  };

  const joinRoom = async () => {
    const code = joinCode.toUpperCase().trim();
    if (!code) return;
    const snap = await get(ref(db,`rooms/${code}`));
    if (!snap.exists()) { setRoomErr("❌ Room കണ്ടില്ല!"); return; }
    const room = snap.val();
    const playerCount = Object.keys(room.players||{}).length;
    if (playerCount >= room.maxPlayers) { setRoomErr("❌ Room full!"); return; }
    await set(ref(db,`rooms/${code}/players/${user.uid}`),{ name:user.displayName||user.email, score:0, ready:false, avatar:user.displayName?user.displayName[0].toUpperCase():"U" });
    setRoomCode(code);
    onValue(ref(db,`rooms/${code}`),(snap)=>{ if(snap.exists()){ setRoomData(snap.val()); if(snap.val().questions) setBattleQ(Object.values(snap.val().questions)); } });
    onValue(ref(db,`rooms/${code}/chat`),(snap)=>{ if(snap.exists()){ const msgs=[]; snap.forEach(c=>msgs.push({id:c.key,...c.val()})); setChatMessages(msgs.slice(-50)); } });
    goTo("room");
  };

  const findRandom = async () => {
    setWaitingRandom(true);
    // Look for waiting room
    const snap = await get(ref(db,"random_queue"));
    if (snap.exists()) {
      const entries = []; snap.forEach(c=>entries.push({key:c.key,...c.val()}));
      const available = entries.find(e=>e.uid!==user.uid&&e.status==="waiting");
      if (available) {
        // Join existing random game
        await remove(ref(db,`random_queue/${available.key}`));
        await joinRoomById(available.roomCode);
        setWaitingRandom(false);
        return;
      }
    }
    // Create new random room
    const code = "R"+Math.random().toString(36).substring(2,6).toUpperCase();
    await createRoom("1v1");
    const qRef = await push(ref(db,"random_queue"),{ uid:user.uid, roomCode:code, status:"waiting", createdAt:serverTimestamp() });
    // Wait 10 seconds, then play vs computer
    setTimeout(async ()=>{
      const qSnap = await get(ref(db,`random_queue/${qRef.key}`));
      if (qSnap.exists()) {
        await remove(ref(db,`random_queue/${qRef.key}`));
        // Add computer opponent
        await set(ref(db,`rooms/${roomCode}/players/computer`),{ name:"🤖 AI Opponent", score:0, ready:true, isComputer:true, avatar:"🤖" });
        setWaitingRandom(false);
        showNotif("No players found — Playing vs AI! 🤖");
      }
    }, 10000);
  };

  const joinRoomById = async (code) => {
    await set(ref(db,`rooms/${code}/players/${user.uid}`),{ name:user.displayName||user.email, score:0, ready:false, avatar:user.displayName?user.displayName[0].toUpperCase():"U" });
    setRoomCode(code);
    onValue(ref(db,`rooms/${code}`),(snap)=>{ if(snap.exists()){ setRoomData(snap.val()); if(snap.val().questions) setBattleQ(Object.values(snap.val().questions)); } });
    goTo("room");
  };

  const startBattleGame = async () => {
    if (!roomCode) return;
    await update(ref(db,`rooms/${roomCode}`),{ status:"playing", startedAt:serverTimestamp() });
    setBattleCurr(0); setBattlePicked(null); setBattleScore(0); setBattleStarted(true);
    goTo("battle");
  };

  const handleBattleAns = async (i) => {
    if (battlePicked!==null) return; clearInterval(battleTimerRef.current);
    setBattlePicked(i);
    const q = battleQ[battleCurr];
    const ok = q && i===q.answer;
    if (ok) { setBattleScore(s=>s+1); await update(ref(db,`rooms/${roomCode}/players/${user.uid}`),{ score: increment(1) }); }
    // Computer AI answer
    if (roomData?.players?.computer && q) {
      const compAns = computerAnswer(q);
      setTimeout(async()=>{ await update(ref(db,`rooms/${roomCode}/players/computer`),{ score: compAns===q.answer?increment(1):increment(0) }); },800+Math.random()*1200);
    }
  };

  const nextBattle = () => {
    if (battleCurr+1>=battleQ.length) { goTo("battle_result"); return; }
    setBattleCurr(c=>c+1); setBattlePicked(null);
  };

  const sendChat = async () => {
    if (!chatMsg.trim()||!roomCode) return;
    await push(ref(db,`rooms/${roomCode}/chat`),{ uid:user.uid, name:user.displayName||user.email.split("@")[0], msg:chatMsg.trim(), time:Date.now() });
    setChatMsg("");
  };

  // Report question
  const reportQ = async (qId, qText) => {
    const reason = window.prompt(`"${qText.substring(0,50)}..."\n\nഎന്ത് പ്രശ്നം? (Reason ഇടൂ):`);
    if (!reason) return;
    await push(ref(db,"reports"),{ qId, qText, reason, reportedBy:user.uid, reportedByName:user.displayName||user.email, reportedAt:serverTimestamp(), status:"pending" });
    showNotif("✅ Report submitted! Admins-ൽ reach ആകും!");
  };

  // Contribute
  const submitContribution = async () => {
    const q = contributeQ;
    if (!q.q||!q.o1||!q.o2||!q.o3||!q.o4) { setContribStatus("❌ Fields fill ചെയ്യൂ!"); return; }
    setContribStatus("⏳ Submitting...");
    try {
      const r = await push(ref(db,"pending_questions"),{ q:q.q, qm:q.qm, options:[q.o1,q.o2,q.o3,q.o4], answer:parseInt(q.answer), cat:q.cat, difficulty:q.difficulty, explanation:q.explanation, submittedBy:user.uid, submittedByName:user.displayName||user.email, submittedByEmail:user.email, status:"pending", submittedAt:serverTimestamp() });
      await set(ref(db,`users/${user.uid}/contributions/${r.key}`),{ q:q.q, cat:q.cat, status:"pending", submittedAt:Date.now() });
      setContributeQ({q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",difficulty:"easy",explanation:""});
      setContribStatus("✅ Submitted! Admin approval-ന് കാത്തിരിക്കൂ.");
      showNotif("Question submitted! 🎉");
    } catch { setContribStatus("❌ Error!"); }
  };

  // Admin actions
  const approveQ = async (pq) => {
    await push(ref(db,"questions"),{ q:pq.q, qm:pq.qm||"", options:pq.options, answer:pq.answer, cat:pq.cat, difficulty:pq.difficulty, explanation:pq.explanation||"", approvedBy:user.email, approvedAt:serverTimestamp(), contributedBy:pq.submittedByName });
    await remove(ref(db,`pending_questions/${pq.id}`));
    if(pq.submittedBy) await update(ref(db,`users/${pq.submittedBy}/contributions/${pq.id}`),{status:"approved"});
    showNotif("✅ Question approved!");
  };

  const rejectQ = async (pq) => {
    await remove(ref(db,`pending_questions/${pq.id}`));
    if(pq.submittedBy) await update(ref(db,`users/${pq.submittedBy}/contributions/${pq.id}`),{status:"rejected"});
    showNotif("Question rejected.","error");
  };

  const deleteQ = async (id) => { if(window.confirm("Delete?")) { await remove(ref(db,`questions/${id}`)); showNotif("Deleted!","error"); } };

  const addDirectQ = async () => {
    if (!newQ.q||!newQ.o1||!newQ.o2||!newQ.o3||!newQ.o4) { setAddQStatus("❌ Fields fill ചെയ്യൂ!"); return; }
    setAddQStatus("⏳");
    try {
      await push(ref(db,"questions"),{ q:newQ.q, qm:newQ.qm, options:[newQ.o1,newQ.o2,newQ.o3,newQ.o4], answer:parseInt(newQ.answer), cat:newQ.cat, difficulty:newQ.difficulty, explanation:newQ.explanation, addedBy:user.email, addedAt:serverTimestamp() });
      setNewQ({q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",difficulty:"easy",explanation:""});
      setAddQStatus("✅ Added!"); setTimeout(()=>setAddQStatus(""),2000);
    } catch { setAddQStatus("❌ Error!"); }
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()||!newAdminEmail.includes("@")) { setAdminStatus("❌ Valid email!"); return; }
    const key = newAdminEmail.trim().replace(/\./g,"_");
    await set(ref(db,`adminEmails/${key}`),{ email:newAdminEmail.trim(), addedBy:user.email, addedAt:serverTimestamp() });
    setNewAdminEmail(""); setAdminStatus("✅ Admin added!");
    showNotif(`${newAdminEmail} is now an Admin! 👑`);
    setTimeout(()=>setAdminStatus(""),3000);
  };

  const removeAdmin = async (key) => { await remove(ref(db,`adminEmails/${key}`)); showNotif("Admin removed.","error"); };

  const addCategory = async () => {
    if (!newCat.label.trim()) { showNotif("Name ഇടൂ!","error"); return; }
    const id = newCat.label.toLowerCase().replace(/[^a-z0-9]/g,"_")+"_"+Date.now();
    await set(ref(db,`categories/${id}`),{ label:newCat.label, icon:newCat.icon, color:newCat.color, createdAt:serverTimestamp() });
    setNewCat({label:"",icon:"📋",color:"#6366f1"});
    showNotif(`"${newCat.label}" category added! 🎉`);
  };

  const deleteCat = async (id) => { if(window.confirm("Delete category?")) { await remove(ref(db,`categories/${id}`)); showNotif("Category deleted!","error"); } };

  // Sheet import — new simple format
  const importSheet = async () => {
    if (!sheetId.trim()) { showNotif("Sheet ID ഇടൂ!","error"); return; }
    setSheetStatus("loading");
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
      const res = await fetch(url); const raw = await res.text();
      const json = JSON.parse(raw.replace(/.*?({.*})/s,"$1"));
      let count = 0;
      for (const row of json.table.rows) {
        const c = row.c;
        const g = (i) => c[i]?.v!=null?String(c[i].v).trim():"";
        if (!g(0)) continue;
        // Format: A=Question, B=Opt1, C=Opt2, D=Opt3, E=Opt4, F=CorrectAnswer(B/C/D/E or 0/1/2/3), G=Explanation
        const opts = [g(1),g(2),g(3),g(4)];
        const ansRaw = g(5).toUpperCase();
        let ans = 0;
        if (ansRaw==="B"||ansRaw==="1") ans=0;
        else if (ansRaw==="C"||ansRaw==="2") ans=1;
        else if (ansRaw==="D"||ansRaw==="3") ans=2;
        else if (ansRaw==="E"||ansRaw==="4") ans=3;
        else ans = parseInt(ansRaw)||0;
        if (!g(0)||!g(1)) continue;
        await push(ref(db,"questions"),{ q:g(0), qm:"", options:opts, answer:ans, cat:sheetCat, difficulty:"medium", explanation:g(6)||"", addedBy:"sheet_import", addedAt:serverTimestamp() });
        count++;
      }
      setSheetStatus("success"); showNotif(`✅ ${count} questions imported!`);
    } catch(e) { setSheetStatus("error"); showNotif("❌ Import failed! Sheet public ആണോ?","error"); }
  };

  // Styles
  const S = {minHeight:"100vh",background:"#05050f",color:"#e2e8f0",fontFamily:"'Segoe UI',sans-serif"};
  const card = (ex={}) => ({background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:16,...ex});
  const glass = (ex={}) => ({background:"rgba(255,255,255,0.06)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,...ex});
  const Btn = (bg,col="#fff",ex={}) => ({background:bg,color:col,border:"none",borderRadius:12,padding:"12px 16px",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit",transition:"all 0.2s",...ex});
  const Inp = {width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"12px 14px",color:"#e2e8f0",fontSize:13,marginBottom:10,fontFamily:"inherit",outline:"none"};
  const Sel = {...Inp,background:"#0f0f1e"};

  // SPLASH
  if (screen==="splash") return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:72,filter:"drop-shadow(0 0 30px rgba(99,102,241,0.8))"}}>🎓</div>
      <h1 style={{fontSize:26,fontWeight:900,background:"linear-gradient(135deg,#a5b4fc,#e879f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>PSC Quiz Kerala</h1>
      <p style={{color:"#475569",fontSize:14}}>Loading...</p>
      <div style={{width:40,height:3,background:"linear-gradient(90deg,#6366f1,#a855f7)",borderRadius:3,animation:"load 1.5s ease infinite"}}/>
      <style>{`@keyframes load{0%{width:40px}50%{width:120px}100%{width:40px}}`}</style>
    </div>
  );

  // AUTH
  if (screen==="auth") return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center",padding:20,minHeight:"100vh"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input,select{font-family:inherit}input:focus{border-color:#6366f1!important;outline:none}`}</style>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:60,marginBottom:12,filter:"drop-shadow(0 0 20px rgba(99,102,241,0.6))"}}>🎓</div>
          <h1 style={{fontSize:24,fontWeight:900,background:"linear-gradient(135deg,#a5b4fc,#e879f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:6}}>PSC Quiz Kerala</h1>
          <p style={{color:"#475569",fontSize:13}}>Kerala's #1 PSC Exam Preparation App</p>
        </div>
        <button onClick={loginGoogle} disabled={authLoading} style={{...Btn("rgba(255,255,255,0.08)","#e2e8f0"),width:"100%",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:12,border:"1px solid rgba(255,255,255,0.15)",padding:16,fontSize:15,borderRadius:14}}>
          <div style={{width:24,height:24,background:"#fff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#4285f4"}}>G</div>
          Continue with Google
        </button>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}}/>
          <span style={{color:"#334155",fontSize:12}}>OR</span>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}}/>
        </div>
        <div style={{...glass(),padding:22}}>
          <div style={{display:"flex",marginBottom:16,background:"rgba(255,255,255,0.05)",borderRadius:12,padding:4}}>
            {["login","register"].map(m=><button key={m} onClick={()=>setAuthMode(m)} style={{flex:1,padding:"9px 0",background:authMode===m?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",border:"none",borderRadius:10,color:authMode===m?"#fff":"#64748b",cursor:"pointer",fontWeight:700,fontSize:13,transition:"all 0.2s"}}>{m==="login"?"🔐 Login":"📝 Register"}</button>)}
          </div>
          {authMode==="register"&&<input value={dn} onChange={e=>setDn(e.target.value)} placeholder="നിങ്ങളുടെ പേര്" style={Inp}/>}
          <input value={em} onChange={e=>setEm(e.target.value)} placeholder="Email address" type="email" style={Inp}/>
          <input value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password (minimum 6 characters)" type="password" style={Inp}/>
          {authErr&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"10px 12px",color:"#ef4444",fontSize:13,marginBottom:10}}>{authErr}</div>}
          <button onClick={loginEmail} disabled={authLoading} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",padding:14,fontSize:14,borderRadius:12}}>{authLoading?"⏳ Please wait...":authMode==="login"?"🔐 Sign In":"✅ Create Account"}</button>
        </div>
      </div>
    </div>
  );

  // Bottom Nav
  const BottomNav = () => (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(5,5,15,0.95)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-around",padding:"8px 0 12px",zIndex:100}}>
      {[["home","🏠","Home"],["contribute","✍️","Contribute"],["battle_select","⚔️","Battle"],["leaderboard","🏆","Ranks"],["myprogress","📊","Progress"]].map(([s,icon,label])=>(
        <button key={s} onClick={()=>goTo(s)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 12px",background:"none",border:"none",cursor:"pointer",color:screen===s?"#a5b4fc":"#475569",transition:"color 0.2s"}}>
          <span style={{fontSize:20}}>{icon}</span>
          <span style={{fontSize:9,fontWeight:700,letterSpacing:0.5}}>{label}</span>
        </button>
      ))}
    </div>
  );

  // Back Button
  const BackBtn = ({label="← Back"}) => (
    <button onClick={goBack} style={{...Btn("rgba(255,255,255,0.06)","#94a3b8"),padding:"8px 14px",fontSize:12,marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
      ← {label}
    </button>
  );

  // Header
  const Header = () => (
    <div style={{background:"linear-gradient(135deg,rgba(19,16,58,0.95),rgba(30,27,75,0.95))",backdropFilter:"blur(20px)",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(99,102,241,0.2)",position:"sticky",top:0,zIndex:100}}>
      <div onClick={()=>goTo("home")} style={{cursor:"pointer"}}>
        <div style={{fontSize:15,fontWeight:800,background:"linear-gradient(135deg,#a5b4fc,#e879f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>🎓 PSC Quiz Kerala</div>
        <div style={{fontSize:10,color:"#4f46e5",marginTop:1}}>Hi, {user?.displayName||user?.email?.split("@")[0]}! {isSuperAdmin?"👑":isAdmin?"🛡️":""} • 🟢 {activeMembers} Online</div>
      </div>
      <div style={{display:"flex",gap:5}}>
        {isAdmin&&<button onClick={()=>goTo("admin")} style={{...Btn("rgba(251,191,36,0.15)","#fbbf24"),padding:"6px 10px",fontSize:12,position:"relative"}}>
          👑{pendingQ.length>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{pendingQ.length}</span>}
        </button>}
        <button onClick={logout} style={{...Btn("rgba(255,255,255,0.06)","#94a3b8"),padding:"6px 10px",fontSize:12}}>🚪</button>
      </div>
    </div>
  );

  return (
    <div style={S}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes pop{from{transform:scale(0.93);opacity:0}to{transform:scale(1);opacity:1}}.pop{animation:pop 0.25s cubic-bezier(.34,1.56,.64,1)}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}.blink{animation:blink 0.7s infinite}@keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}.slideDown{animation:slideDown 0.3s ease}input,select,textarea{font-family:inherit}input:focus,select:focus{outline:none;border-color:#6366f1!important}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#4f46e5;border-radius:3px}`}</style>

      {notif&&<div className="slideDown" style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:999,background:notif.type==="error"?"linear-gradient(135deg,#ef4444,#dc2626)":"linear-gradient(135deg,#10b981,#059669)",color:"#fff",padding:"10px 22px",borderRadius:30,fontSize:13,fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>{notif.msg}</div>}

      <Header/>
      <div style={{maxWidth:500,margin:"0 auto",padding:"0 14px 90px"}}>

        {/* ── HOME ── */}
        {screen==="home"&&(
          <div className="pop">
            {/* Hero */}
            <div style={{textAlign:"center",padding:"20px 0 16px"}}>
              <div style={{fontSize:48,marginBottom:8,filter:"drop-shadow(0 0 20px rgba(99,102,241,0.5))"}}>🎯</div>
              <h1 style={{fontSize:20,fontWeight:900,background:"linear-gradient(135deg,#c7d2fe,#e879f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4}}>Kerala PSC Exam Prep</h1>
              <p style={{color:"#475569",fontSize:12}}>{allQ.length} Questions • {categories.length} Categories • Community Powered 🔥</p>
            </div>

            {/* Stats */}
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[{l:"Questions",v:allQ.length,i:"📝",c:"#6366f1"},{l:"Online",v:activeMembers,i:"🟢",c:"#10b981"},{l:"My Best",v:Object.values(myStats).reduce((a,s)=>Math.max(a,s.best||0),0),i:"🏆",c:"#f59e0b"}].map((x,i)=>(
                <div key={i} style={{...card(),flex:1,padding:"12px 6px",textAlign:"center",borderTop:`2px solid ${x.c}`}}>
                  <div style={{fontSize:20,marginBottom:2}}>{x.i}</div>
                  <div style={{fontSize:22,fontWeight:900,color:x.c}}>{x.v}</div>
                  <div style={{fontSize:10,color:"#475569",marginTop:1}}>{x.l}</div>
                </div>
              ))}
            </div>

            {/* Quiz Count Selector */}
            <div style={{...glass(),padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:12,color:"#64748b",marginBottom:8,fontWeight:600}}>📊 Questions per Quiz:</div>
              <div style={{display:"flex",gap:6}}>
                {[5,10,15,20].map(n=>(
                  <button key={n} onClick={()=>setQuizCount(n)} style={{flex:1,padding:"8px 0",background:quizCount===n?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.05)",border:`1px solid ${quizCount===n?"#6366f1":"rgba(255,255,255,0.1)"}`,borderRadius:10,color:quizCount===n?"#fff":"#64748b",cursor:"pointer",fontWeight:800,fontSize:14,transition:"all 0.2s"}}>{n}</button>
                ))}
              </div>
            </div>

            {/* Action Cards */}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button onClick={()=>startQuiz("mock")} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"16px 10px",background:"linear-gradient(135deg,rgba(236,72,153,0.15),rgba(139,92,246,0.1))",border:"1px solid rgba(236,72,153,0.25)",borderRadius:14,cursor:"pointer"}}>
                <span style={{fontSize:28}}>🎯</span>
                <span style={{fontWeight:700,color:"#f0abfc",fontSize:13}}>Mock Test</span>
                <span style={{color:"#475569",fontSize:10}}>{quizCount} Random Q</span>
              </button>
              <button onClick={()=>goTo("battle_select")} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"16px 10px",background:"linear-gradient(135deg,rgba(239,68,68,0.15),rgba(245,158,11,0.1))",border:"1px solid rgba(239,68,68,0.25)",borderRadius:14,cursor:"pointer"}}>
                <span style={{fontSize:28}}>⚔️</span>
                <span style={{fontWeight:700,color:"#fca5a5",fontSize:13}}>Quiz Battle</span>
                <span style={{color:"#475569",fontSize:10}}>1v1 • Multi • Random</span>
              </button>
            </div>

            {/* Categories */}
            <div style={{fontSize:12,color:"#475569",marginBottom:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>📚 Categories</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {categories.map(cat=>{
                const qCount=allQ.filter(q=>q.cat===cat.id).length;
                const best = myStats[cat.id]?.best||0;
                return (
                  <button key={cat.id} onClick={()=>startQuiz(cat.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",background:"rgba(255,255,255,0.03)",border:`1px solid rgba(255,255,255,0.07)`,borderLeft:`3px solid ${cat.color}`,borderRadius:13,cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}>
                    <span style={{fontSize:22,width:36,height:36,background:`${cat.color}20`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{cat.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:"#e2e8f0",fontSize:14}}>{cat.label}</div>
                      {best>0&&<div style={{fontSize:10,color:"#475569",marginTop:2}}>Best: {best}/{quizCount} • {myStats[cat.id]?.attempts||0}x played</div>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{background:`${cat.color}25`,color:cat.color,borderRadius:8,padding:"3px 9px",fontSize:11,fontWeight:700}}>{qCount}Q</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── QUIZ ── */}
        {screen==="quiz"&&questions[curr]&&(()=>{
          const q=questions[curr];
          const catInfo=categories.find(c=>c.id===q.cat)||{label:q.cat,icon:"📋",color:"#6366f1"};
          const pct = Math.round(((curr)/questions.length)*100);
          return (
            <div className="pop" style={{paddingTop:14}}>
              {/* Progress */}
              <div style={{...glass(),padding:"12px 14px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <span style={{color:"#a5b4fc",fontWeight:700,fontSize:13}}>{curr+1}</span>
                    <span style={{color:"#475569",fontSize:13}}>/{questions.length}</span>
                    <span style={{color:"#64748b",fontSize:11,marginLeft:6}}>{catInfo.icon} {catInfo.label}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:20,padding:"3px 10px",color:"#10b981",fontWeight:700,fontSize:12}}>✅ {score}</div>
                    <div className={timer<=5?"blink":""} style={{background:timer<=5?"rgba(239,68,68,0.12)":"rgba(99,102,241,0.12)",border:`1px solid ${timer<=5?"rgba(239,68,68,0.3)":"rgba(99,102,241,0.3)"}`,borderRadius:20,padding:"3px 10px",color:timer<=5?"#ef4444":"#a5b4fc",fontWeight:800,fontSize:13}}>⏱{timer}</div>
                  </div>
                </div>
                <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:5}}>
                  <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${catInfo.color},#a855f7)`,borderRadius:5,transition:"width 0.5s ease"}}/>
                </div>
              </div>

              {/* Question */}
              <div style={{...card(),padding:18,marginBottom:12,background:`linear-gradient(135deg,${catInfo.color}12,rgba(168,85,247,0.06))`,borderColor:`${catInfo.color}25`}}>
                <div style={{fontSize:10,color:catInfo.color,marginBottom:8,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700}}>{catInfo.icon} {catInfo.label} • {q.difficulty||"medium"}</div>
                <p style={{fontSize:16,fontWeight:700,color:"#f1f5f9",lineHeight:1.65}}>{q.q}</p>
                {q.qm&&<p style={{fontSize:13,color:"#64748b",marginTop:7,lineHeight:1.55}}>{q.qm}</p>}
              </div>

              {/* Options */}
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                {q.options.map((opt,i)=>{
                  let bg="rgba(255,255,255,0.04)",bdr="rgba(255,255,255,0.09)",col="#e2e8f0",icon="";
                  if(picked!==null){
                    if(i===q.answer){bg="rgba(16,185,129,0.14)";bdr="#10b981";col="#10b981";icon="✅";}
                    else if(i===picked&&picked!==q.answer){bg="rgba(239,68,68,0.14)";bdr="#ef4444";col="#ef4444";icon="❌";}
                    else{bg="rgba(255,255,255,0.02)";col="#64748b";}
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
                    <button onClick={nextQ} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),flex:1,padding:12}}>{curr+1>=questions.length?"📊 See Result →":"Next Question →"}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── RESULT ── */}
        {screen==="result"&&(
          <div className="pop" style={{paddingTop:18}}>
            <BackBtn label="Home"/>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:64,marginBottom:8,filter:`drop-shadow(0 0 30px ${score>=questions.length*0.8?"#f59e0b":score>=questions.length*0.5?"#10b981":"#6366f1"})`}}>{score>=questions.length*0.8?"🏆":score>=questions.length*0.5?"🎉":"💪"}</div>
              <h2 style={{fontSize:22,fontWeight:900,color:"#c7d2fe",marginBottom:8}}>Quiz Complete!</h2>
              <div style={{fontSize:52,fontWeight:900,background:"linear-gradient(135deg,#6366f1,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"8px 0"}}>{score}<span style={{fontSize:24,opacity:0.5}}>/{questions.length}</span></div>
              <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:20,padding:"5px 16px",color:"#10b981",fontWeight:700,fontSize:13}}>Accuracy: {Math.round((score/questions.length)*100)}%</div>
              </div>
            </div>
            <h3 style={{fontSize:11,color:"#475569",marginBottom:8,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Answer Review</h3>
            {answers.map((a,i)=>(
              <div key={i} style={{...card(),padding:11,marginBottom:6,borderLeft:`3px solid ${a.ok?"#10b981":"#ef4444"}`}}>
                <div style={{fontSize:11,color:"#64748b",marginBottom:3}}>Q{i+1}: {a.q.q}</div>
                <div style={{fontSize:12,color:a.ok?"#10b981":"#ef4444",marginBottom:a.q.explanation&&!a.ok?4:0}}>{a.ok?"✅":"❌"} {a.sel===-1?"⏱ Time out":a.q.options[a.sel]}{!a.ok&&a.sel!==-1&&<span style={{color:"#10b981"}}> → {a.q.options[a.q.answer]}</span>}</div>
                {a.q.explanation&&!a.ok&&<div style={{fontSize:11,color:"#475569"}}>💡 {a.q.explanation}</div>}
                <button onClick={()=>reportQ(a.q.id,a.q.q)} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,marginTop:4}}>🚩 Report</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:14}}>
              <button onClick={()=>startQuiz(selCat)} style={{...Btn("rgba(99,102,241,0.15)","#a5b4fc"),flex:1}}>🔄 Again</button>
              <button onClick={()=>{setScreen("home");setHistory(["home"]);}} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),flex:1}}>🏠 Home</button>
            </div>
          </div>
        )}

        {/* ── BATTLE SELECT ── */}
        {screen==="battle_select"&&(
          <div className="pop" style={{paddingTop:18}}>
            <BackBtn/>
            <h2 style={{fontSize:20,fontWeight:900,background:"linear-gradient(135deg,#fca5a5,#f87171)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4}}>⚔️ Quiz Battle</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:20}}>Choose your battle mode!</p>

            {/* Quiz Count */}
            <div style={{...glass(),padding:"12px 14px",marginBottom:16}}>
              <div style={{fontSize:12,color:"#64748b",marginBottom:8,fontWeight:600}}>📊 Questions per Battle:</div>
              <div style={{display:"flex",gap:6}}>
                {[5,10,15,20].map(n=><button key={n} onClick={()=>setQuizCount(n)} style={{flex:1,padding:"8px 0",background:quizCount===n?"linear-gradient(135deg,#ef4444,#f97316)":"rgba(255,255,255,0.05)",border:`1px solid ${quizCount===n?"#ef4444":"rgba(255,255,255,0.1)"}`,borderRadius:10,color:quizCount===n?"#fff":"#64748b",cursor:"pointer",fontWeight:800,fontSize:14}}>{n}</button>)}
              </div>
            </div>

            {[
              {type:"1v1",icon:"🤺",title:"1 vs 1",subtitle:"Room code share ചെയ്ത് friend-നെ challenge",color:"#6366f1",desc:"Private Battle"},
              {type:"multi",icon:"👥",title:"Multiplayer",subtitle:"Up to 100 players ഒരേ സമയം!",color:"#10b981",desc:"Up to 100 Players"},
              {type:"random",icon:"🎲",title:"Random Match",subtitle:"Online players-ൽ നിന്ന് opponent കിട്ടും",color:"#f59e0b",desc:"vs AI if no players"},
            ].map(b=>(
              <button key={b.type} onClick={()=>{setBattleType(b.type);goTo("battle_lobby");}} style={{display:"flex",alignItems:"center",gap:14,padding:"18px 16px",background:`linear-gradient(135deg,${b.color}15,${b.color}08)`,border:`1px solid ${b.color}30`,borderRadius:16,cursor:"pointer",textAlign:"left",width:"100%",marginBottom:10,transition:"all 0.2s"}}>
                <div style={{width:52,height:52,background:`${b.color}20`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{b.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,color:"#f1f5f9",fontSize:16,marginBottom:3}}>{b.title}</div>
                  <div style={{color:"#64748b",fontSize:12,lineHeight:1.4}}>{b.subtitle}</div>
                </div>
                <div style={{background:`${b.color}20`,color:b.color,borderRadius:20,padding:"4px 10px",fontSize:10,fontWeight:700}}>{b.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* ── BATTLE LOBBY ── */}
        {screen==="battle_lobby"&&(
          <div className="pop" style={{paddingTop:18}}>
            <BackBtn/>
            <h2 style={{fontSize:19,fontWeight:900,color:"#c7d2fe",marginBottom:4}}>⚔️ {battleType==="1v1"?"1 vs 1":battleType==="multi"?"Multiplayer":"Random Match"}</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:16}}>{battleType==="random"?"Random opponent-നെ find ചെയ്യൂ":"Room create or join ചെയ്യൂ"}</p>

            {battleType!=="random"&&(
              <>
                <div style={{...card(),padding:16,marginBottom:10,borderLeft:"3px solid #6366f1"}}>
                  <div style={{fontWeight:700,color:"#a5b4fc",marginBottom:8}}>🆕 Create Room</div>
                  <button onClick={()=>createRoom(battleType)} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%"}}>🎮 Create Room</button>
                </div>
                <div style={{...card(),padding:16,borderLeft:"3px solid #10b981"}}>
                  <div style={{fontWeight:700,color:"#10b981",marginBottom:8}}>🔗 Join Room</div>
                  <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" style={{...Inp,textTransform:"uppercase",letterSpacing:6,textAlign:"center",fontSize:22,fontWeight:900}}/>
                  {roomErr&&<div style={{color:"#ef4444",fontSize:12,marginBottom:8}}>{roomErr}</div>}
                  <button onClick={joinRoom} style={{...Btn("#10b981"),width:"100%"}}>🚀 Join</button>
                </div>
              </>
            )}

            {battleType==="random"&&(
              <div style={{...card(),padding:24,textAlign:"center"}}>
                {waitingRandom?(
                  <>
                    <div style={{fontSize:48,marginBottom:12}}>🔍</div>
                    <h3 style={{color:"#a5b4fc",marginBottom:8}}>Searching for opponent...</h3>
                    <p style={{color:"#475569",fontSize:13,marginBottom:16}}>10 seconds-ൽ player കിട്ടിയില്ലെങ്കിൽ AI opponent-ൽ play ചെയ്യാം!</p>
                    <div style={{width:60,height:4,background:"linear-gradient(90deg,#6366f1,#a855f7)",borderRadius:4,margin:"0 auto",animation:"load 1.5s ease infinite"}}/>
                    <style>{`@keyframes load{0%{width:40px}50%{width:120px}100%{width:40px}}`}</style>
                  </>
                ):(
                  <>
                    <div style={{fontSize:48,marginBottom:12}}>🎲</div>
                    <h3 style={{color:"#c7d2fe",marginBottom:8}}>Random Match</h3>
                    <p style={{color:"#475569",fontSize:13,marginBottom:16}}>Online players-ൽ നിന്ന് random opponent-നെ find ചെയ്യും. Player ഇല്ലെങ്കിൽ AI opponent!</p>
                    <button onClick={findRandom} style={{...Btn("linear-gradient(135deg,#f59e0b,#ef4444)"),width:"100%",padding:14,fontSize:15}}>🎲 Find Opponent!</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ROOM ── */}
        {screen==="room"&&(
          <div className="pop" style={{paddingTop:14}}>
            <BackBtn label="Leave Room"/>
            <div style={{...glass(),padding:20,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:2,fontWeight:700}}>Room Code</div>
              <div style={{fontSize:36,fontWeight:900,background:"linear-gradient(135deg,#a5b4fc,#e879f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:8,margin:"4px 0"}}>{roomCode}</div>
              <div style={{fontSize:11,color:"#475569"}}>Share this code with friends!</div>
            </div>

            {/* Players */}
            <div style={{...card(),padding:14,marginBottom:12}}>
              <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:10,fontSize:13}}>
                Players ({Object.keys(roomData?.players||{}).length}/{roomData?.maxPlayers||2})
              </div>
              {Object.entries(roomData?.players||{}).map(([uid,p])=>(
                <div key={uid} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,#6366f1,#8b5cf6)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14}}>{p.isComputer?"🤖":p.avatar||"U"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:uid===user?.uid?"#a5b4fc":"#e2e8f0"}}>{p.name} {uid===user?.uid?"(You)":""}</div>
                    {p.isComputer&&<div style={{fontSize:10,color:"#f59e0b"}}>AI Opponent • 65% accuracy</div>}
                  </div>
                  <div style={{width:10,height:10,borderRadius:"50%",background:"#10b981"}}/>
                </div>
              ))}
            </div>

            {(roomData?.hostUid===user?.uid)&&(
              <button onClick={startBattleGame} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",padding:14,fontSize:15,marginBottom:10}}>
                🚀 Start Battle! ({Object.keys(roomData?.players||{}).length} players)
              </button>
            )}
            {roomData?.hostUid!==user?.uid&&<div style={{textAlign:"center",color:"#475569",fontSize:13,padding:14}}>⏳ Host-ന് start ചെയ്യാൻ കാത്തിരിക്കൂ...</div>}
          </div>
        )}

        {/* ── BATTLE ── */}
        {screen==="battle"&&battleQ[battleCurr]&&(()=>{
          const q=battleQ[battleCurr];
          const players = roomData?.players||{};
          return (
            <div className="pop" style={{paddingTop:10}}>
              {/* Battle Header */}
              <div style={{...glass(),padding:"10px 12px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:12,color:"#a5b4fc",fontWeight:700}}>Q{battleCurr+1}/{battleQ.length}</div>
                <div className={battleTimer<=5?"blink":""} style={{background:battleTimer<=5?"rgba(239,68,68,0.15)":"rgba(99,102,241,0.15)",border:`1px solid ${battleTimer<=5?"rgba(239,68,68,0.4)":"rgba(99,102,241,0.3)"}`,borderRadius:20,padding:"4px 14px",color:battleTimer<=5?"#ef4444":"#a5b4fc",fontWeight:900,fontSize:16}}>⏱ {battleTimer}</div>
                <div style={{fontSize:12,color:"#10b981",fontWeight:700}}>Score: {battleScore}</div>
              </div>

              {/* Live Scores */}
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {Object.entries(players).slice(0,4).map(([uid,p])=>(
                  <div key={uid} style={{flex:1,...card(),padding:"8px 6px",textAlign:"center",borderTop:`2px solid ${uid===user?.uid?"#6366f1":"#ef4444"}`}}>
                    <div style={{fontSize:16,marginBottom:2}}>{p.isComputer?"🤖":p.avatar||"👤"}</div>
                    <div style={{fontSize:16,fontWeight:900,color:uid===user?.uid?"#a5b4fc":"#e2e8f0"}}>{p.score||0}</div>
                    <div style={{fontSize:9,color:"#475569",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{uid===user?.uid?"You":p.name.split(" ")[0]}</div>
                  </div>
                ))}
              </div>

              {/* Question */}
              <div style={{...card(),padding:16,marginBottom:10,background:"rgba(99,102,241,0.07)",borderColor:"rgba(99,102,241,0.15)"}}>
                <p style={{fontSize:15,fontWeight:700,color:"#f1f5f9",lineHeight:1.6}}>{q.q}</p>
              </div>

              {/* Options */}
              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:10}}>
                {q.options.map((opt,i)=>{
                  let bg="rgba(255,255,255,0.04)",bdr="rgba(255,255,255,0.09)",col="#e2e8f0";
                  if(battlePicked!==null){ if(i===q.answer){bg="rgba(16,185,129,0.14)";bdr="#10b981";col="#10b981";} else if(i===battlePicked){bg="rgba(239,68,68,0.14)";bdr="#ef4444";col="#ef4444";} }
                  return <button key={i} onClick={()=>handleBattleAns(i)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:bg,border:`1.5px solid ${bdr}`,borderRadius:12,color:col,textAlign:"left",fontSize:13,cursor:battlePicked===null?"pointer":"default",transition:"all 0.2s"}}>
                    <span style={{width:26,height:26,borderRadius:8,background:`${bdr}30`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11,flexShrink:0}}>{["A","B","C","D"][i]}</span>{opt}
                  </button>;
                })}
              </div>

              {battlePicked!==null&&<button onClick={nextBattle} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",padding:12,marginBottom:10}}>{battleCurr+1>=battleQ.length?"🏆 See Results":"Next →"}</button>}

              {/* Chat Box */}
              <div style={{...card(),padding:12}}>
                <div style={{fontWeight:700,color:"#64748b",fontSize:11,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>💬 Battle Chat</div>
                <div style={{height:80,overflowY:"auto",marginBottom:8}}>
                  {chatMessages.length===0&&<div style={{color:"#334155",fontSize:11,textAlign:"center",padding:"10px 0"}}>No messages yet...</div>}
                  {chatMessages.map((m,i)=>(
                    <div key={i} style={{fontSize:11,marginBottom:4,color:m.uid===user?.uid?"#a5b4fc":"#94a3b8"}}>
                      <strong>{m.uid===user?.uid?"You":m.name}:</strong> {m.msg}
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Message..." style={{...Inp,marginBottom:0,flex:1,padding:"8px 12px",fontSize:12}}/>
                  <button onClick={sendChat} style={{...Btn("rgba(99,102,241,0.2)","#a5b4fc"),padding:"8px 12px",fontSize:12}}>Send</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── BATTLE RESULT ── */}
        {screen==="battle_result"&&(
          <div className="pop" style={{paddingTop:18,textAlign:"center"}}>
            <div style={{fontSize:64,marginBottom:12}}>🏆</div>
            <h2 style={{fontSize:22,fontWeight:900,color:"#c7d2fe",marginBottom:16}}>Battle Over!</h2>
            <div style={{...card(),padding:16,marginBottom:16}}>
              <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:12}}>Final Scores</div>
              {Object.entries(roomData?.players||{}).sort((a,b)=>b[1].score-a[1].score).map(([uid,p],i)=>(
                <div key={uid} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:20,width:28}}>{i===0?"🥇":i===1?"🥈":"🥉"}</span>
                  <div style={{flex:1,textAlign:"left",fontWeight:700,color:uid===user?.uid?"#a5b4fc":"#e2e8f0"}}>{p.name} {uid===user?.uid?"(You)":""}</div>
                  <div style={{fontWeight:900,color:"#6366f1",fontSize:20}}>{p.score||0}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>goTo("battle_select")} style={{...Btn("rgba(99,102,241,0.15)","#a5b4fc"),flex:1}}>🔄 Play Again</button>
              <button onClick={()=>{setScreen("home");setHistory(["home"]);}} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),flex:1}}>🏠 Home</button>
            </div>
          </div>
        )}

        {/* ── CONTRIBUTE ── */}
        {screen==="contribute"&&(
          <div className="pop" style={{paddingTop:16}}>
            <BackBtn/>
            <h2 style={{fontSize:19,fontWeight:900,color:"#10b981",marginBottom:4}}>✍️ Contribute a Question</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:14}}>Submit → Admin reviews → Published to all users! 🎉</p>

            {myContributions.length>0&&(
              <div style={{...glass(),padding:12,marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:12,color:"#e2e8f0",marginBottom:8}}>My Submissions ({myContributions.length})</div>
                {myContributions.slice(0,3).map((c,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{flex:1,fontSize:12,color:"#94a3b8"}}>{c.q?.substring(0,35)}...</div>
                    <div style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:c.status==="approved"?"rgba(16,185,129,0.15)":c.status==="rejected"?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.15)",color:c.status==="approved"?"#10b981":c.status==="rejected"?"#ef4444":"#f59e0b"}}>
                      {c.status==="approved"?"✅":c.status==="rejected"?"❌":"⏳"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{...card(),padding:16,borderLeft:"3px solid #10b981"}}>
              <input value={contributeQ.q} onChange={e=>setContributeQ({...contributeQ,q:e.target.value})} placeholder="Question (English) *" style={Inp}/>
              <input value={contributeQ.qm} onChange={e=>setContributeQ({...contributeQ,qm:e.target.value})} placeholder="Question (Malayalam) — Optional" style={Inp}/>
              {["o1","o2","o3","o4"].map((k,i)=><input key={k} value={contributeQ[k]} onChange={e=>setContributeQ({...contributeQ,[k]:e.target.value})} placeholder={`Option ${["A","B","C","D"][i]} *`} style={Inp}/>)}
              <input value={contributeQ.explanation} onChange={e=>setContributeQ({...contributeQ,explanation:e.target.value})} placeholder="💡 Explanation (Why is this the answer?)" style={Inp}/>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                <select value={contributeQ.answer} onChange={e=>setContributeQ({...contributeQ,answer:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}>
                  <option value="0">✅ Answer: A</option><option value="1">✅ Answer: B</option><option value="2">✅ Answer: C</option><option value="3">✅ Answer: D</option>
                </select>
                <select value={contributeQ.cat} onChange={e=>setContributeQ({...contributeQ,cat:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
                <select value={contributeQ.difficulty} onChange={e=>setContributeQ({...contributeQ,difficulty:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}><option value="easy">🟢 Easy</option><option value="medium">🟡 Medium</option><option value="hard">🔴 Hard</option></select>
              </div>
              {contribStatus&&<div style={{fontSize:13,marginBottom:10,color:contribStatus.includes("✅")?"#10b981":"#ef4444"}}>{contribStatus}</div>}
              <button onClick={submitContribution} style={{...Btn("linear-gradient(135deg,#10b981,#06b6d4)"),width:"100%",padding:13,fontSize:14}}>✍️ Submit for Review</button>
            </div>
          </div>
        )}

        {/* ── ADMIN ── */}
        {screen==="admin"&&isAdmin&&(
          <div className="pop" style={{paddingTop:16}}>
            <BackBtn/>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{fontSize:28}}>👑</div>
              <div>
                <h2 style={{fontSize:18,fontWeight:900,color:"#fbbf24",marginBottom:2}}>Admin Panel</h2>
                <p style={{color:"#475569",fontSize:11}}>{isSuperAdmin?"Super Admin — Full Access":"Admin — Approve/Reject Only"}</p>
              </div>
            </div>

            {/* Tab Buttons */}
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
              {[["pending",`⏳ Pending (${pendingQ.length})`],["reports","🚩 Reports"],isSuperAdmin&&["addq","➕ Add Q"],isSuperAdmin&&["cats","📁 Categories"],isSuperAdmin&&["sheet","📊 Sheet"],isSuperAdmin&&["admins","👑 Admins"],isSuperAdmin&&["members","🟢 Members"]].filter(Boolean).map(([t,l])=>(
                <button key={t} onClick={()=>setAdminTab(t)} style={{padding:"7px 12px",background:adminTab===t?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.06)",border:`1px solid ${adminTab===t?"#6366f1":"rgba(255,255,255,0.1)"}`,borderRadius:20,color:adminTab===t?"#fff":"#64748b",cursor:"pointer",fontWeight:700,fontSize:11,transition:"all 0.2s"}}>{l}</button>
              ))}
            </div>

            {/* PENDING */}
            {adminTab==="pending"&&(
              <div>
                {pendingQ.length===0
                  ?<div style={{...card(),padding:40,textAlign:"center",color:"#475569"}}><div style={{fontSize:40}}>✅</div><p style={{marginTop:10}}>No pending questions!</p></div>
                  :pendingQ.map(pq=>(
                    <div key={pq.id} style={{...card(),padding:14,marginBottom:10,borderLeft:"3px solid #f59e0b"}}>
                      <div style={{fontSize:10,color:"#f59e0b",marginBottom:6,fontWeight:700}}>⏳ By: {pq.submittedByName} • {categories.find(c=>c.id===pq.cat)?.label||pq.cat} • {pq.difficulty}</div>
                      <p style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:8}}>{pq.q}</p>
                      {pq.qm&&<p style={{fontSize:12,color:"#64748b",marginBottom:8}}>{pq.qm}</p>}
                      {pq.options.map((o,i)=><div key={i} style={{fontSize:12,color:i===pq.answer?"#10b981":"#94a3b8",padding:"3px 0"}}>{["A","B","C","D"][i]}. {o} {i===pq.answer?"✅":""}</div>)}
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

            {/* REPORTS */}
            {adminTab==="reports"&&(
              <div>
                <ReportsPanel db={db} categories={categories} showNotif={showNotif} deleteQ={deleteQ}/>
              </div>
            )}

            {/* ADD Q */}
            {adminTab==="addq"&&isSuperAdmin&&(
              <div style={{...card(),padding:14,borderLeft:"3px solid #6366f1"}}>
                <div style={{fontWeight:700,color:"#a5b4fc",marginBottom:10}}>➕ Add Question Directly</div>
                <input value={newQ.q} onChange={e=>setNewQ({...newQ,q:e.target.value})} placeholder="Question (English) *" style={Inp}/>
                <input value={newQ.qm} onChange={e=>setNewQ({...newQ,qm:e.target.value})} placeholder="Question (Malayalam)" style={Inp}/>
                {["o1","o2","o3","o4"].map((k,i)=><input key={k} value={newQ[k]} onChange={e=>setNewQ({...newQ,[k]:e.target.value})} placeholder={`Option ${["A","B","C","D"][i]} *`} style={Inp}/>)}
                <input value={newQ.explanation} onChange={e=>setNewQ({...newQ,explanation:e.target.value})} placeholder="Explanation" style={Inp}/>
                <div style={{display:"flex",gap:6,marginBottom:10}}>
                  <select value={newQ.answer} onChange={e=>setNewQ({...newQ,answer:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select>
                  <select value={newQ.cat} onChange={e=>setNewQ({...newQ,cat:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
                  <select value={newQ.difficulty} onChange={e=>setNewQ({...newQ,difficulty:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
                </div>
                {addQStatus&&<div style={{color:addQStatus.includes("✅")?"#10b981":"#ef4444",fontSize:13,marginBottom:8}}>{addQStatus}</div>}
                <button onClick={addDirectQ} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%"}}>➕ Add to Firebase</button>
              </div>
            )}

            {/* CATEGORIES */}
            {adminTab==="cats"&&isSuperAdmin&&(
              <div>
                <div style={{...card(),padding:14,marginBottom:10,borderLeft:"3px solid #6366f1"}}>
                  <div style={{fontWeight:700,color:"#a5b4fc",marginBottom:10}}>➕ Add New Category</div>
                  <input value={newCat.label} onChange={e=>setNewCat({...newCat,label:e.target.value})} placeholder="Category Name *" style={Inp}/>
                  <div style={{fontSize:11,color:"#475569",marginBottom:6}}>Icon:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>{ICONS.map(ic=><button key={ic} onClick={()=>setNewCat({...newCat,icon:ic})} style={{width:34,height:34,fontSize:17,background:newCat.icon===ic?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.05)",border:`1px solid ${newCat.icon===ic?"#6366f1":"rgba(255,255,255,0.1)"}`,borderRadius:8,cursor:"pointer"}}>{ic}</button>)}</div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:6}}>Color:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>{COLORS.map(cl=><button key={cl} onClick={()=>setNewCat({...newCat,color:cl})} style={{width:28,height:28,background:cl,borderRadius:"50%",border:`3px solid ${newCat.color===cl?"#fff":"transparent"}`,cursor:"pointer"}}/>)}</div>
                  <button onClick={addCategory} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%"}}>➕ Add Category</button>
                </div>
                <div style={{...card(),padding:14}}>
                  <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:10}}>Firebase Categories</div>
                  {categories.filter(c=>!DEFAULT_CATS.find(d=>d.id===c.id)).map(cat=>(
                    <div key={cat.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <span style={{fontSize:22,width:36,height:36,background:`${cat.color}20`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{cat.icon}</span>
                      <div style={{flex:1}}><div style={{fontWeight:700,color:"#e2e8f0"}}>{cat.label}</div><div style={{fontSize:10,color:"#475569"}}>{allQ.filter(q=>q.cat===cat.id).length} questions</div></div>
                      <button onClick={()=>deleteCat(cat.id)} style={{...Btn("rgba(239,68,68,0.1)","#ef4444"),padding:"5px 9px",fontSize:12}}>🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SHEET IMPORT */}
            {adminTab==="sheet"&&isSuperAdmin&&(
              <div style={{...card(),padding:16,borderLeft:"3px solid #10b981"}}>
                <div style={{fontWeight:700,color:"#10b981",marginBottom:10}}>📊 Google Sheets Import</div>
                <div style={{...glass(),padding:12,marginBottom:14,borderRadius:12}}>
                  <div style={{fontWeight:700,color:"#e2e8f0",fontSize:12,marginBottom:8}}>📋 Sheet Format (Simple!):</div>
                  {[["A","Question text"],["B","Option 1 (First option)"],["C","Option 2"],["D","Option 3"],["E","Option 4"],["F","Correct Answer → B / C / D / E"],["G","Explanation (Optional)"]].map(([col,desc])=>(
                    <div key={col} style={{display:"flex",gap:8,padding:"4px 0",fontSize:12}}>
                      <span style={{color:"#6366f1",fontWeight:700,width:20}}>{col}</span>
                      <span style={{color:"#94a3b8"}}>{desc}</span>
                    </div>
                  ))}
                </div>
                <input value={sheetId} onChange={e=>setSheetId(e.target.value)} placeholder="Google Sheet ID..." style={Inp}/>
                <select value={sheetCat} onChange={e=>setSheetCat(e.target.value)} style={Sel}>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
                <button onClick={importSheet} style={{...Btn(sheetStatus==="success"?"#10b981":sheetStatus==="error"?"#ef4444":"linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",padding:13}}>{sheetStatus==="loading"?"⏳ Importing...":sheetStatus==="success"?"✅ Import Success!":sheetStatus==="error"?"❌ Failed — Retry":"📥 Import Questions"}</button>
              </div>
            )}

            {/* ADMINS */}
            {adminTab==="admins"&&isSuperAdmin&&(
              <div>
                <div style={{...card(),padding:14,marginBottom:10,borderLeft:"3px solid #fbbf24"}}>
                  <div style={{fontWeight:700,color:"#fbbf24",marginBottom:8}}>👑 Add New Admin</div>
                  <p style={{color:"#64748b",fontSize:12,marginBottom:10}}>ഈ email-ൽ login ചെയ്ത user-ന് pending questions approve/reject ചെയ്യാം. (Super Admin features ഇല്ല)</p>
                  <input value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} placeholder="admin@email.com" type="email" style={Inp}/>
                  {adminStatus&&<div style={{color:adminStatus.includes("✅")?"#10b981":"#ef4444",fontSize:13,marginBottom:8}}>{adminStatus}</div>}
                  <button onClick={addAdmin} style={{...Btn("linear-gradient(135deg,#f59e0b,#fbbf24)","#000"),width:"100%"}}>👑 Make Admin</button>
                </div>
                <div style={{...card(),padding:14}}>
                  <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:10}}>Current Admins</div>
                  <div style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{fontSize:13,color:"#fbbf24",fontWeight:700}}>👑 {SUPER_ADMIN}</div>
                    <div style={{fontSize:10,color:"#475569"}}>Super Admin — Cannot be removed</div>
                  </div>
                  {adminList.map(a=>(
                    <div key={a.key} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <div style={{flex:1}}><div style={{fontSize:13,color:"#e2e8f0",fontWeight:600}}>🛡️ {a.email}</div><div style={{fontSize:10,color:"#475569"}}>Can approve/reject questions only</div></div>
                      <button onClick={()=>removeAdmin(a.key)} style={{...Btn("rgba(239,68,68,0.1)","#ef4444"),padding:"5px 9px",fontSize:11}}>Remove</button>
                    </div>
                  ))}
                  {adminList.length===0&&<p style={{color:"#475569",fontSize:12,marginTop:8}}>No additional admins yet.</p>}
                </div>
              </div>
            )}

            {/* MEMBERS */}
            {adminTab==="members"&&isSuperAdmin&&(
              <MembersPanel db={db} activeMembers={activeMembers}/>
            )}
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {screen==="leaderboard"&&(
          <div className="pop" style={{paddingTop:16}}>
            <h2 style={{fontSize:19,fontWeight:900,background:"linear-gradient(135deg,#fbbf24,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4}}>🏆 Global Leaderboard</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:14}}>Real-time • Firebase powered 🔥</p>
            {leaderboard.length===0
              ?<div style={{...card(),padding:40,textAlign:"center",color:"#475569"}}><div style={{fontSize:40}}>🏆</div><p style={{marginTop:10}}>No scores yet!</p></div>
              :leaderboard.map((e,i)=>(
                <div key={e.id} style={{...card(),display:"flex",alignItems:"center",gap:10,padding:12,marginBottom:7,borderLeft:`3px solid ${i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7c2f":"#334155"}`,background:e.uid===user?.uid?"rgba(99,102,241,0.08)":"rgba(255,255,255,0.03)"}}>
                  <span style={{fontSize:20,width:28,textAlign:"center"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:e.uid===user?.uid?"#a5b4fc":"#e2e8f0",fontSize:13}}>{e.name} {e.uid===user?.uid?"(You)":""}</div>
                    <div style={{fontSize:10,color:"#475569"}}>{e.categoryLabel||e.category} • {e.accuracy}% accuracy</div>
                  </div>
                  <div style={{fontWeight:900,color:"#6366f1",fontSize:18}}>{e.score}<span style={{fontSize:12,color:"#475569"}}>/{e.total}</span></div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── MY PROGRESS ── */}
        {screen==="myprogress"&&(
          <div className="pop" style={{paddingTop:16}}>
            <h2 style={{fontSize:19,fontWeight:900,color:"#c7d2fe",marginBottom:4}}>📊 My Progress</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:14}}>{user?.displayName||user?.email}</p>
            <div style={{display:"flex",gap:7,marginBottom:14}}>
              {[{l:"Submitted",v:myContributions.length,i:"✍️"},{l:"Approved",v:myContributions.filter(c=>c.status==="approved").length,i:"✅"},{l:"Pending",v:myContributions.filter(c=>c.status==="pending").length,i:"⏳"}].map((x,i)=>(
                <div key={i} style={{...card(),flex:1,padding:"10px 5px",textAlign:"center",borderTop:`2px solid ${i===0?"#6366f1":i===1?"#10b981":"#f59e0b"}`}}>
                  <div style={{fontSize:18}}>{x.i}</div>
                  <div style={{fontSize:20,fontWeight:900,color:i===0?"#a5b4fc":i===1?"#10b981":"#f59e0b"}}>{x.v}</div>
                  <div style={{fontSize:10,color:"#475569"}}>{x.l}</div>
                </div>
              ))}
            </div>
            {Object.keys(myStats).length===0
              ?<div style={{...card(),padding:36,textAlign:"center",color:"#475569"}}><div style={{fontSize:36}}>📊</div><p style={{marginTop:8}}>No quiz history yet!</p></div>
              :Object.entries(myStats).map(([catId,data])=>{
                const catInfo=categories.find(c=>c.id===catId)||{label:catId,icon:"📋",color:"#6366f1"};
                const total = data.attempts*quizCount;
                const pct = total>0?Math.round((data.correct/total)*100):0;
                return (
                  <div key={catId} style={{...card(),padding:14,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontWeight:700,fontSize:13}}>{catInfo.icon} {catInfo.label}</span>
                      <span style={{color:pct>=80?"#10b981":pct>=50?"#f59e0b":"#ef4444",fontWeight:800,fontSize:14}}>{pct}%</span>
                    </div>
                    <div style={{height:6,background:"rgba(255,255,255,0.06)",borderRadius:6,marginBottom:7}}>
                      <div style={{height:"100%",width:`${pct}%`,background:pct>=80?"linear-gradient(90deg,#10b981,#059669)":pct>=50?"linear-gradient(90deg,#f59e0b,#d97706)":"linear-gradient(90deg,#ef4444,#dc2626)",borderRadius:6,transition:"width 0.5s ease"}}/>
                    </div>
                    <div style={{display:"flex",gap:12,fontSize:11,color:"#475569"}}>
                      <span>🎮 {data.attempts}x played</span><span>🏆 Best: {data.best}</span><span>✅ {data.correct} correct</span>
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

      </div>
      <BottomNav/>
    </div>
  );
}

// Reports Panel Component
function ReportsPanel({ db, categories, showNotif, deleteQ }) {
  const [reports, setReports] = useState([]);
  useEffect(() => {
    onValue(ref(db,"reports"),(snap)=>{ if(snap.exists()){ const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setReports(d.filter(r=>r.status==="pending")); } });
  },[]);
  const resolveReport = async (r) => { await update(ref(db,`reports/${r.id}`),{status:"resolved"}); showNotif("Report resolved!"); };
  const deleteReportedQ = async (r) => { await deleteQ(r.qId); await update(ref(db,`reports/${r.id}`),{status:"deleted"}); };
  return (
    <div>
      {reports.length===0
        ?<div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:40,textAlign:"center",color:"#475569"}}><div style={{fontSize:40}}>✅</div><p style={{marginTop:10}}>No pending reports!</p></div>
        :reports.map(r=>(
          <div key={r.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:14,padding:14,marginBottom:10,borderLeft:"3px solid #ef4444"}}>
            <div style={{fontSize:10,color:"#ef4444",marginBottom:6,fontWeight:700}}>🚩 Reported by: {r.reportedByName}</div>
            <p style={{fontSize:13,color:"#e2e8f0",marginBottom:6}}>{r.qText?.substring(0,60)}...</p>
            <p style={{fontSize:12,color:"#94a3b8",marginBottom:10}}>Reason: {r.reason}</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>resolveReport(r)} style={{flex:1,background:"rgba(16,185,129,0.15)",color:"#10b981",border:"1px solid rgba(16,185,129,0.3)",borderRadius:10,padding:"8px 0",cursor:"pointer",fontWeight:700,fontSize:12}}>✅ Resolve</button>
              <button onClick={()=>deleteReportedQ(r)} style={{flex:1,background:"rgba(239,68,68,0.15)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"8px 0",cursor:"pointer",fontWeight:700,fontSize:12}}>🗑️ Delete Q</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// Members Panel
function MembersPanel({ db, activeMembers }) {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    onValue(ref(db,"online"),(snap)=>{ if(snap.exists()){ const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setMembers(d); } });
  },[]);
  return (
    <div>
      <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:14,padding:16,marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:48,fontWeight:900,color:"#10b981"}}>{activeMembers}</div>
        <div style={{color:"#475569",fontSize:13}}>Active Members Online 🟢</div>
      </div>
      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:14}}>
        <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:10,fontSize:13}}>Online Users</div>
        {members.map((m,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#10b981"}}/>
            <div style={{fontWeight:600,fontSize:13,color:"#e2e8f0",flex:1}}>{m.name}</div>
          </div>
        ))}
        {members.length===0&&<p style={{color:"#475569",fontSize:12}}>No active users.</p>}
      </div>
    </div>
  );
}
