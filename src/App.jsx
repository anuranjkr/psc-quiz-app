import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getDatabase, ref, set, get, onValue, push, serverTimestamp, query, orderByChild, limitToLast, remove, update } from "firebase/database";

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
  { id:"ldc", label:"LDC / LGS", icon:"📋", color:"#6366f1", sub:[] },
  { id:"psc", label:"PSC General", icon:"🏛️", color:"#8b5cf6", sub:[] },
  { id:"police", label:"Police / SI", icon:"👮", color:"#3b82f6", sub:[] },
  { id:"science", label:"Science", icon:"🔬", color:"#10b981", sub:[] },
  { id:"history", label:"History", icon:"📜", color:"#f59e0b", sub:[] },
  { id:"geography", label:"Geography", icon:"🌍", color:"#06b6d4", sub:[] },
  { id:"current", label:"Current Affairs", icon:"📰", color:"#ef4444", sub:[] },
];

const BUILTIN_Q = [
  { id:"b1", q:"Kerala formed on?", qm:"കേരളം രൂപീകരിച്ചത്?", options:["Nov 1, 1956","Aug 15, 1947","Jan 26, 1950","Nov 1, 1960"], answer:0, cat:"ldc", difficulty:"easy" },
  { id:"b2", q:"Longest river in Kerala?", qm:"കേരളത്തിലെ ഏറ്റവും നീളം?", options:["Periyar","Bharathapuzha","Pamba","Chaliyar"], answer:1, cat:"ldc", difficulty:"easy" },
  { id:"b3", q:"Capital of Kerala?", qm:"കേരളത്തിന്റെ തലസ്ഥാനം?", options:["Kochi","Kozhikode","Thiruvananthapuram","Thrissur"], answer:2, cat:"ldc", difficulty:"easy" },
  { id:"b4", q:"National game of India?", qm:"ഇന്ത്യയുടെ ദേശീയ കായിക വിനോദം?", options:["Cricket","Football","Hockey","Kabaddi"], answer:2, cat:"psc", difficulty:"easy" },
  { id:"b5", q:"Chemical symbol of Gold?", qm:"സ്വർണ്ണത്തിന്റെ രാസ ചിഹ്നം?", options:["Go","Gd","Au","Ag"], answer:2, cat:"science", difficulty:"easy" },
  { id:"b6", q:"Chandrayaan-3 year?", qm:"ചന്ദ്രയാൻ-3 വർഷം?", options:["2022","2023","2024","2021"], answer:1, cat:"current", difficulty:"easy" },
  { id:"b7", q:"Battle of Plassey year?", qm:"പ്ലാസി യുദ്ധം?", options:["1757","1764","1799","1857"], answer:0, cat:"history", difficulty:"medium" },
  { id:"b8", q:"Largest state by area?", qm:"ഏറ്റവും വലിയ സംസ്ഥാനം?", options:["MP","Rajasthan","Maharashtra","UP"], answer:1, cat:"geography", difficulty:"easy" },
  { id:"b9", q:"IPC stands for?", qm:"IPC-യുടെ പൂർണ്ണ രൂപം?", options:["Indian Penal Code","Indian Police Code","Indian Penal Court","Indian Public Code"], answer:0, cat:"police", difficulty:"easy" },
  { id:"b10", q:"Speed of light?", qm:"പ്രകാശ വേഗത?", options:["3×10⁸ m/s","3×10⁶ m/s","3×10⁵ m/s","3×10⁴ m/s"], answer:0, cat:"science", difficulty:"medium" },
];

const ICONS = ["📋","🏛️","👮","🔬","📜","🌍","📰","🎯","📚","✏️","🧪","⚖️","💡","🗺️","🏆","📖","🔭","🧮","🏅","📐"];
const COLORS = ["#6366f1","#8b5cf6","#3b82f6","#10b981","#f59e0b","#06b6d4","#ef4444","#ec4899","#84cc16","#f97316","#14b8a6","#a855f7"];

export default function App() {
  const [screen, setScreen] = useState("splash");
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
  const [expandedCat, setExpandedCat] = useState(null);
  const [questions, setQuestions] = useState([]); const [selCat, setSelCat] = useState(null); const [selSub, setSelSub] = useState(null);
  const [curr, setCurr] = useState(0); const [picked, setPicked] = useState(null); const [score, setScore] = useState(0); const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(30); const timerRef = useRef(null);
  const [leaderboard, setLeaderboard] = useState([]); const [myStats, setMyStats] = useState({});
  const [adminTab, setAdminTab] = useState("pending");
  const [newCat, setNewCat] = useState({ label:"", icon:"📋", color:"#6366f1" });
  const [newSub, setNewSub] = useState({ catId:"", label:"", icon:"📖", color:"#6366f1" });
  const [newQ, setNewQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",subcat:"",difficulty:"easy" });
  const [addQStatus, setAddQStatus] = useState("");
  const [contributeQ, setContributeQ] = useState({ q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",subcat:"",difficulty:"easy",explanation:"" });
  const [contribStatus, setContribStatus] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState(""); const [adminStatus, setAdminStatus] = useState("");
  const [sheetId, setSheetId] = useState(""); const [sheetStatus, setSheetStatus] = useState("idle"); const [sheetCat, setSheetCat] = useState("ldc");
  const [roomCode, setRoomCode] = useState(""); const [joinCode, setJoinCode] = useState(""); const [roomData, setRoomData] = useState(null); const [roomErr, setRoomErr] = useState("");
  const [notification, setNotification] = useState(null);

  const showNotif = (msg, type="success") => { setNotification({msg,type}); setTimeout(()=>setNotification(null),3000); };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const superAdmin = u.email === SUPER_ADMIN;
        setIsSuperAdmin(superAdmin);
        // Check admin status
        const adminSnap = await get(ref(db,`admins/${u.uid}`));
        const adminByEmail = await get(ref(db,`adminEmails/${u.email.replace(/\./g,"_")}`));
        const admin = superAdmin || adminSnap.exists() || adminByEmail.exists();
        setIsAdmin(admin);
        loadAll(u.uid, admin);
        setScreen("home");
      } else { setTimeout(()=>setScreen("auth"),1500); }
    });
    return () => unsub();
  }, []);

  useEffect(() => { setAllQ([...BUILTIN_Q,...fbQ]); }, [fbQ]);

  const loadAll = (uid, admin) => {
    // Approved questions
    onValue(ref(db,"questions"),(snap)=>{ if(snap.exists()){ const qs=[]; snap.forEach(c=>qs.push({id:c.key,...c.val()})); setFbQ(qs); } });
    // Categories
    onValue(ref(db,"categories"),(snap)=>{ if(snap.exists()){ const cats=[]; snap.forEach(c=>cats.push({id:c.key,...c.val(),sub:c.val().sub||[]})); setCategories([...DEFAULT_CATS,...cats]); } });
    // Leaderboard
    const lb = query(ref(db,"leaderboard"),orderByChild("score"),limitToLast(20));
    onValue(lb,(snap)=>{ if(snap.exists()){ const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setLeaderboard(d.reverse()); } });
    // My stats
    onValue(ref(db,`users/${uid}/stats`),(snap)=>{ if(snap.exists()) setMyStats(snap.val()); });
    // My contributions
    onValue(ref(db,`users/${uid}/contributions`),(snap)=>{ if(snap.exists()){ const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setMyContributions(d); } });
    // Pending (admin only)
    if (admin) {
      onValue(ref(db,"pending_questions"),(snap)=>{ if(snap.exists()){ const d=[]; snap.forEach(c=>d.push({id:c.key,...c.val()})); setPendingQ(d); } else setPendingQ([]); });
      onValue(ref(db,"adminEmails"),(snap)=>{ if(snap.exists()){ const d=[]; snap.forEach(c=>d.push({key:c.key,email:c.key.replace(/_/g,"."),name:c.val().name})); setAdminList(d); } });
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
    } catch(e) { setAuthErr(e.code==="auth/wrong-password"?"Password തെറ്റ്!":e.code==="auth/user-not-found"?"User ഇല്ല!":e.code==="auth/email-already-in-use"?"Email used!":e.message); }
    setAuthLoading(false);
  };
  const logout = () => signOut(auth);

  // Timer
  useEffect(() => {
    if (screen!=="quiz"||picked!==null) return;
    setTimer(30); clearInterval(timerRef.current);
    timerRef.current = setInterval(()=>{ setTimer(t=>{ if(t<=1){ clearInterval(timerRef.current); handleAns(-1); return 0; } return t-1; }); },1000);
    return ()=>clearInterval(timerRef.current);
  },[curr,screen]);

  const startQuiz = (cat,sub=null) => {
    let qs = allQ.filter(q=>cat==="mock"?true:sub?q.cat===cat&&q.subcat===sub:q.cat===cat).sort(()=>Math.random()-0.5).slice(0,cat==="mock"?20:10);
    if (!qs.length) { showNotif("Questions ഇല്ല! Admin-ൽ add ചെയ്യൂ.","error"); return; }
    setSelCat(cat); setSelSub(sub); setQuestions(qs); setCurr(0); setPicked(null); setScore(0); setAnswers([]); setScreen("quiz");
  };

  const handleAns = (i) => {
    if (picked!==null) return; clearInterval(timerRef.current);
    setPicked(i); const q=questions[curr]; const ok=i===q.answer;
    if(ok) setScore(s=>s+1); setAnswers(a=>[...a,{q,sel:i,ok}]);
  };

  const nextQ = async () => {
    if (curr+1>=questions.length) { await saveResult(); setScreen("result"); return; }
    setCurr(c=>c+1); setPicked(null);
  };

  const saveResult = async () => {
    if (!user) return;
    const fs = answers.filter(a=>a.ok).length;
    const catLabel = categories.find(c=>c.id===selCat)?.label||selCat;
    await push(ref(db,"leaderboard"),{ uid:user.uid, name:user.displayName||user.email.split("@")[0], score:fs, total:questions.length, category:selCat, categoryLabel:catLabel, accuracy:Math.round((fs/questions.length)*100), timestamp:serverTimestamp() });
    const statsRef = ref(db,`users/${user.uid}/stats/${selCat}`);
    const snap = await get(statsRef); const prev = snap.exists()?snap.val():{attempts:0,correct:0,best:0};
    await set(statsRef,{attempts:prev.attempts+1,correct:prev.correct+fs,best:Math.max(prev.best||0,fs)});
  };

  // User contribute question
  const submitContribution = async () => {
    const q = contributeQ;
    if (!q.q||!q.o1||!q.o2||!q.o3||!q.o4) { setContribStatus("❌ എല്ലാ fields fill ചെയ്യൂ!"); return; }
    setContribStatus("⏳ Submitting...");
    try {
      const newRef = await push(ref(db,"pending_questions"),{
        q:q.q, qm:q.qm, options:[q.o1,q.o2,q.o3,q.o4], answer:parseInt(q.answer),
        cat:q.cat, subcat:q.subcat, difficulty:q.difficulty, explanation:q.explanation,
        submittedBy:user.uid, submittedByName:user.displayName||user.email, submittedByEmail:user.email,
        status:"pending", submittedAt:serverTimestamp()
      });
      // Track in user contributions
      await set(ref(db,`users/${user.uid}/contributions/${newRef.key}`),{ q:q.q, cat:q.cat, status:"pending", submittedAt:Date.now() });
      setContributeQ({q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",subcat:"",difficulty:"easy",explanation:""});
      setContribStatus("✅ Submitted! Admin approval-ന് കാത്തിരിക്കൂ.");
      showNotif("Question submitted for review! 🎉");
    } catch { setContribStatus("❌ Error! Try again."); }
  };

  // Admin: Approve question
  const approveQ = async (pq) => {
    await push(ref(db,"questions"),{ q:pq.q, qm:pq.qm, options:pq.options, answer:pq.answer, cat:pq.cat, subcat:pq.subcat||"", difficulty:pq.difficulty, approvedBy:user.email, approvedAt:serverTimestamp(), contributedBy:pq.submittedByName });
    await remove(ref(db,`pending_questions/${pq.id}`));
    await update(ref(db,`users/${pq.submittedBy}/contributions/${pq.id}`),{status:"approved"});
    showNotif(`✅ "${pq.q.substring(0,30)}..." approved!`);
  };

  // Admin: Reject question
  const rejectQ = async (pq) => {
    await remove(ref(db,`pending_questions/${pq.id}`));
    await update(ref(db,`users/${pq.submittedBy}/contributions/${pq.id}`),{status:"rejected"});
    showNotif(`❌ Question rejected.`,"error");
  };

  // Admin: Add question directly
  const addQuestion = async () => {
    if (!newQ.q||!newQ.o1||!newQ.o2||!newQ.o3||!newQ.o4) { setAddQStatus("❌ Fields fill ചെയ്യൂ!"); return; }
    setAddQStatus("⏳ Saving...");
    try {
      await push(ref(db,"questions"),{ q:newQ.q, qm:newQ.qm, options:[newQ.o1,newQ.o2,newQ.o3,newQ.o4], answer:parseInt(newQ.answer), cat:newQ.cat, subcat:newQ.subcat, difficulty:newQ.difficulty, addedBy:user.email, addedAt:serverTimestamp() });
      setNewQ({q:"",qm:"",o1:"",o2:"",o3:"",o4:"",answer:"0",cat:"ldc",subcat:"",difficulty:"easy"});
      setAddQStatus("✅ Added! Real-time update ആകും!");
      setTimeout(()=>setAddQStatus(""),3000);
    } catch { setAddQStatus("❌ Error!"); }
  };

  // Super Admin: Add new admin
  const addAdmin = async () => {
    if (!newAdminEmail.trim()||!newAdminEmail.includes("@")) { setAdminStatus("❌ Valid email ഇടൂ!"); return; }
    setAdminStatus("⏳ Adding...");
    try {
      const key = newAdminEmail.replace(/\./g,"_");
      await set(ref(db,`adminEmails/${key}`),{ email:newAdminEmail, name:newAdminEmail, addedBy:user.email, addedAt:serverTimestamp() });
      setNewAdminEmail(""); setAdminStatus("✅ Admin added! ആ user next login-ൽ admin ആകും.");
      showNotif(`${newAdminEmail} is now an admin! 👑`);
    } catch { setAdminStatus("❌ Error!"); }
  };

  // Super Admin: Remove admin
  const removeAdmin = async (key) => {
    await remove(ref(db,`adminEmails/${key}`));
    showNotif("Admin removed.","error");
  };

  // Admin: Add category
  const addCategory = async () => {
    if (!newCat.label.trim()) { showNotif("Category name ഇടൂ!","error"); return; }
    const id = newCat.label.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")+"_"+Date.now();
    await set(ref(db,`categories/${id}`),{ label:newCat.label, icon:newCat.icon, color:newCat.color, sub:[], createdAt:serverTimestamp() });
    setNewCat({label:"",icon:"📋",color:"#6366f1"});
    showNotif(`Category "${newCat.label}" added! 📁`);
  };

  // Admin: Add sub-category
  const addSubCat = async () => {
    if (!newSub.catId||!newSub.label.trim()) { showNotif("Category & name ഇടൂ!","error"); return; }
    const catSnap = await get(ref(db,`categories/${newSub.catId}`));
    const existing = catSnap.exists()?(catSnap.val().sub||[]):[];
    const subItem = { id:Date.now().toString(), label:newSub.label, icon:newSub.icon, color:newSub.color };
    await set(ref(db,`categories/${newSub.catId}/sub`),[...existing,subItem]);
    setNewSub({catId:"",label:"",icon:"📖",color:"#6366f1"});
    showNotif(`Sub-category "${newSub.label}" added! 📂`);
  };

  // Sheet import
  const importSheet = async () => {
    if (!sheetId.trim()) return; setSheetStatus("loading");
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Questions`;
      const res = await fetch(url); const raw = await res.text();
      const json = JSON.parse(raw.replace(/.*?({.*})/s,"$1"));
      let count = 0;
      for (const row of json.table.rows) {
        const c=row.c; const g=(i)=>c[i]?.v!=null?String(c[i].v).trim():"";
        if (!g(0)) continue;
        await push(ref(db,"questions"),{ q:g(0), qm:g(1), options:[g(2),g(3),g(4),g(5)], answer:parseInt(g(6))||0, cat:sheetCat, subcat:g(7)||"", difficulty:g(8)||"medium", addedBy:"sheet", addedAt:serverTimestamp() });
        count++;
      }
      setSheetStatus("success"); showNotif(`${count} questions imported! 🔥`);
    } catch { setSheetStatus("error"); showNotif("Sheet import failed!","error"); }
  };

  // Competition
  const createRoom = async () => {
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    await set(ref(db,`rooms/${code}`),{ host:user.displayName||user.email, hostUid:user.uid, code, status:"waiting", createdAt:serverTimestamp(), players:{[user.uid]:{name:user.displayName||user.email,score:0}} });
    setRoomCode(code); onValue(ref(db,`rooms/${code}`),(snap)=>{if(snap.exists())setRoomData(snap.val());}); setScreen("room");
  };
  const joinRoom = async () => {
    const code = joinCode.toUpperCase().trim();
    const snap = await get(ref(db,`rooms/${code}`));
    if (!snap.exists()) { setRoomErr("Room കണ്ടില്ല!"); return; }
    await set(ref(db,`rooms/${code}/players/${user.uid}`),{name:user.displayName||user.email,score:0});
    setRoomCode(code); onValue(ref(db,`rooms/${code}`),(snap)=>{if(snap.exists())setRoomData(snap.val());}); setScreen("room");
  };

  // Styles
  const S = {minHeight:"100vh",background:"#080812",color:"#e2e8f0",fontFamily:"'Segoe UI',sans-serif"};
  const card = (ex={}) => ({background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,...ex});
  const Btn = (bg,col="#fff",ex={}) => ({background:bg,color:col,border:"none",borderRadius:10,padding:"11px 15px",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit",...ex});
  const Inp = {width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:13,marginBottom:8,fontFamily:"inherit"};
  const Sel = {...Inp,background:"#1a1a2e"};

  if (screen==="splash") return <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}><div style={{fontSize:64}}>🎓</div><h1 style={{color:"#a5b4fc",fontSize:24,marginTop:12}}>PSC Quiz Kerala</h1><p style={{color:"#475569",marginTop:8}}>Loading...</p></div>;

  if (screen==="auth") return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input,select{font-family:inherit}`}</style>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:24}}><div style={{fontSize:52}}>🎓</div><h1 style={{color:"#a5b4fc",fontSize:22,marginTop:8}}>PSC Quiz Kerala</h1><p style={{color:"#475569",fontSize:13,marginTop:4}}>Login ചെയ്ത് Quiz കളിക്കൂ!</p></div>
        <button onClick={loginGoogle} disabled={authLoading} style={{...Btn("rgba(255,255,255,0.07)","#e2e8f0"),width:"100%",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10,border:"1px solid rgba(255,255,255,0.15)",padding:14}}>
          <span style={{fontSize:18,fontWeight:900,color:"#4285f4"}}>G</span> Google-കൊണ്ട് Login
        </button>
        <div style={{textAlign:"center",color:"#334155",marginBottom:12,fontSize:12}}>— അല്ലെങ്കിൽ Email —</div>
        <div style={{...card(),padding:18}}>
          <div style={{display:"flex",marginBottom:14,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:3}}>
            {["login","register"].map(m=><button key={m} onClick={()=>setAuthMode(m)} style={{flex:1,padding:"8px 0",background:authMode===m?"#6366f1":"transparent",border:"none",borderRadius:8,color:authMode===m?"#fff":"#64748b",cursor:"pointer",fontWeight:700,fontSize:13}}>{m==="login"?"🔐 Login":"📝 Register"}</button>)}
          </div>
          {authMode==="register"&&<input value={dn} onChange={e=>setDn(e.target.value)} placeholder="നിങ്ങളുടെ പേര്" style={Inp}/>}
          <input value={em} onChange={e=>setEm(e.target.value)} placeholder="Email" type="email" style={Inp}/>
          <input value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password (min 6)" type="password" style={Inp}/>
          {authErr&&<div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>⚠️ {authErr}</div>}
          <button onClick={loginEmail} disabled={authLoading} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",padding:13}}>{authLoading?"⏳ Loading...":authMode==="login"?"🔐 Login":"✅ Register"}</button>
        </div>
      </div>
    </div>
  );

  const Header = () => (
    <div style={{background:"linear-gradient(135deg,#13103a,#1e1b4b)",padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(99,102,241,0.25)",position:"sticky",top:0,zIndex:100}}>
      <div onClick={()=>setScreen("home")} style={{cursor:"pointer"}}>
        <div style={{fontSize:15,fontWeight:800,color:"#a5b4fc"}}>🎓 PSC Quiz Kerala</div>
        <div style={{fontSize:10,color:"#4f46e5"}}>Hi, {user?.displayName||user?.email?.split("@")[0]}! {isSuperAdmin?"👑 Super Admin":isAdmin?"🛡️ Admin":""}</div>
      </div>
      <div style={{display:"flex",gap:4}}>
        <button onClick={()=>setScreen("contribute")} style={{...Btn("rgba(16,185,129,0.15)","#10b981"),padding:"5px 8px",fontSize:11}}>✍️</button>
        <button onClick={()=>setScreen("myprogress")} style={{...Btn("rgba(99,102,241,0.15)","#a5b4fc"),padding:"5px 8px",fontSize:11}}>📊</button>
        <button onClick={()=>setScreen("leaderboard")} style={{...Btn("rgba(245,158,11,0.15)","#fbbf24"),padding:"5px 8px",fontSize:11}}>🏆</button>
        <button onClick={()=>setScreen("competition")} style={{...Btn("rgba(239,68,68,0.15)","#f87171"),padding:"5px 8px",fontSize:11}}>⚔️</button>
        {isAdmin&&<button onClick={()=>setScreen("admin")} style={{...Btn("rgba(251,191,36,0.2)","#fbbf24"),padding:"5px 8px",fontSize:11}}>👑</button>}
        <button onClick={logout} style={{...Btn("rgba(255,255,255,0.06)","#94a3b8"),padding:"5px 8px",fontSize:11}}>🚪</button>
      </div>
    </div>
  );

  return (
    <div style={S}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes pop{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}.pop{animation:pop 0.25s ease}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}.blink{animation:blink 0.8s infinite}@keyframes slide{from{top:-60px}to{top:16px}}.slide{animation:slide 0.3s ease}input,select,textarea{font-family:inherit}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#4f46e5;border-radius:4px}`}</style>

      {/* Notification */}
      {notification&&<div className="slide" style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:999,background:notification.type==="error"?"#ef4444":"#10b981",color:"#fff",padding:"10px 20px",borderRadius:30,fontSize:13,fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>{notification.msg}</div>}

      <Header/>
      <div style={{maxWidth:500,margin:"0 auto",padding:"0 13px 80px"}}>

        {/* ── HOME ── */}
        {screen==="home"&&(
          <div className="pop">
            <div style={{textAlign:"center",padding:"16px 0 12px"}}>
              <div style={{fontSize:42}}>🎯</div>
              <h1 style={{fontSize:19,fontWeight:800,color:"#c7d2fe",marginTop:6}}>Kerala PSC Exam Prep</h1>
              <p style={{color:"#475569",fontSize:12,marginTop:3}}>{allQ.length} Questions • {categories.length} Categories • Community Powered</p>
            </div>
            <div style={{display:"flex",gap:7,marginBottom:14}}>
              {[{l:"Questions",v:allQ.length,i:"📝"},{l:"Pending",v:pendingQ.length,i:"⏳"},{l:"My Contributions",v:myContributions.length,i:"✍️"}].map((x,i)=>(
                <div key={i} style={{...card(),flex:1,padding:"9px 4px",textAlign:"center"}}>
                  <div style={{fontSize:16}}>{x.i}</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#818cf8"}}>{x.v}</div>
                  <div style={{fontSize:10,color:"#475569"}}>{x.l}</div>
                </div>
              ))}
            </div>
            {/* Contribute Banner */}
            <button onClick={()=>setScreen("contribute")} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,182,212,0.08))",border:"1px solid rgba(16,185,129,0.25)",borderRadius:12,cursor:"pointer",textAlign:"left",width:"100%",marginBottom:10}}>
              <span style={{fontSize:22}}>✍️</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:"#10b981",fontSize:13}}>Question Contribute ചെയ്യൂ!</div>
                <div style={{color:"#475569",fontSize:11}}>Community-ൽ participate ചെയ്യൂ • Admin approve ചെയ്യും</div>
              </div>
              <span style={{color:"#10b981",fontSize:12}}>→</span>
            </button>
            {/* Mock Test */}
            <button onClick={()=>startQuiz("mock")} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"linear-gradient(135deg,rgba(236,72,153,0.12),rgba(139,92,246,0.08))",border:"1px solid rgba(236,72,153,0.25)",borderRadius:12,cursor:"pointer",textAlign:"left",width:"100%",marginBottom:10}}>
              <span style={{fontSize:22}}>🎯</span>
              <div style={{flex:1}}><div style={{fontWeight:700,color:"#f0abfc",fontSize:13}}>Mock Test (20Q)</div><div style={{color:"#475569",fontSize:11}}>Full length practice test</div></div>
              <div style={{background:"rgba(236,72,153,0.2)",color:"#f0abfc",borderRadius:7,padding:"2px 8px",fontSize:11,fontWeight:700}}>20Q</div>
            </button>
            <h2 style={{fontSize:11,color:"#475569",marginBottom:7,textTransform:"uppercase",letterSpacing:1}}>📚 Categories</h2>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {categories.map(cat=>{
                const qCount=allQ.filter(q=>q.cat===cat.id).length;
                const hasSub=cat.sub&&cat.sub.length>0;
                const isExp=expandedCat===cat.id;
                return (
                  <div key={cat.id}>
                    <button onClick={()=>hasSub?setExpandedCat(isExp?null:cat.id):startQuiz(cat.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",background:"rgba(255,255,255,0.03)",border:`1px solid rgba(255,255,255,0.07)`,borderLeft:`3px solid ${cat.color}`,borderRadius:hasSub?(isExp?"12px 12px 0 0":"12px"):"12px",cursor:"pointer",textAlign:"left",width:"100%"}}>
                      <span style={{fontSize:19}}>{cat.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,color:"#e2e8f0",fontSize:13}}>{cat.label}</div>
                        {myStats[cat.id]&&<div style={{color:"#475569",fontSize:10}}>Best: {myStats[cat.id].best}/10 • {myStats[cat.id].attempts}x</div>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <div style={{background:cat.color+"22",color:cat.color,borderRadius:6,padding:"2px 7px",fontSize:11,fontWeight:700}}>{qCount}Q</div>
                        {hasSub&&<span style={{color:"#475569",fontSize:11}}>{isExp?"▲":"▼"}</span>}
                      </div>
                    </button>
                    {hasSub&&isExp&&(
                      <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid rgba(255,255,255,0.06)`,borderTop:"none",borderRadius:"0 0 12px 12px",padding:"5px 7px 7px"}}>
                        <button onClick={()=>startQuiz(cat.id)} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 11px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:8,cursor:"pointer",textAlign:"left",width:"100%",marginBottom:4}}>
                          <span style={{fontSize:13}}>📚</span><span style={{color:"#94a3b8",fontSize:12,fontWeight:600,flex:1}}>All — {cat.label}</span><span style={{color:cat.color,fontSize:11,fontWeight:700}}>{qCount}Q</span>
                        </button>
                        {cat.sub.map((sub,si)=>{
                          const sc=allQ.filter(q=>q.cat===cat.id&&q.subcat===sub.id).length;
                          return <button key={si} onClick={()=>startQuiz(cat.id,sub.id)} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 11px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderLeft:`2px solid ${sub.color||cat.color}`,borderRadius:8,cursor:"pointer",textAlign:"left",width:"100%",marginBottom:4}}>
                            <span style={{fontSize:14}}>{sub.icon}</span><span style={{color:"#cbd5e1",fontSize:12,fontWeight:600,flex:1}}>{sub.label}</span><span style={{color:sub.color||cat.color,fontSize:11,fontWeight:700}}>{sc}Q</span>
                          </button>;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CONTRIBUTE ── */}
        {screen==="contribute"&&(
          <div className="pop" style={{paddingTop:16}}>
            <h2 style={{fontSize:19,fontWeight:800,color:"#10b981",marginBottom:4}}>✍️ Question Contribute</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:14}}>നിങ്ങളുടെ question submit ചെയ്യൂ • Admin approve ചെയ്യും • App-ൽ publish ആകും!</p>

            {/* My contributions status */}
            {myContributions.length>0&&(
              <div style={{...card(),padding:12,marginBottom:12}}>
                <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:8,fontSize:13}}>📋 My Submissions ({myContributions.length})</div>
                {myContributions.slice(0,5).map((c,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{flex:1,fontSize:12,color:"#94a3b8"}}>{c.q?.substring(0,40)}...</div>
                    <div style={{fontSize:11,fontWeight:700,color:c.status==="approved"?"#10b981":c.status==="rejected"?"#ef4444":"#f59e0b",background:c.status==="approved"?"rgba(16,185,129,0.1)":c.status==="rejected"?"rgba(239,68,68,0.1)":"rgba(245,158,11,0.1)",padding:"2px 8px",borderRadius:20}}>
                      {c.status==="approved"?"✅ Approved":c.status==="rejected"?"❌ Rejected":"⏳ Pending"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{...card(),padding:14,borderLeft:"3px solid #10b981"}}>
              <input value={contributeQ.q} onChange={e=>setContributeQ({...contributeQ,q:e.target.value})} placeholder="Question (English) *" style={Inp}/>
              <input value={contributeQ.qm} onChange={e=>setContributeQ({...contributeQ,qm:e.target.value})} placeholder="Question (Malayalam)" style={Inp}/>
              <input value={contributeQ.o1} onChange={e=>setContributeQ({...contributeQ,o1:e.target.value})} placeholder="Option A *" style={Inp}/>
              <input value={contributeQ.o2} onChange={e=>setContributeQ({...contributeQ,o2:e.target.value})} placeholder="Option B *" style={Inp}/>
              <input value={contributeQ.o3} onChange={e=>setContributeQ({...contributeQ,o3:e.target.value})} placeholder="Option C *" style={Inp}/>
              <input value={contributeQ.o4} onChange={e=>setContributeQ({...contributeQ,o4:e.target.value})} placeholder="Option D *" style={Inp}/>
              <input value={contributeQ.explanation} onChange={e=>setContributeQ({...contributeQ,explanation:e.target.value})} placeholder="Explanation (Optional — ഉത്തരം എന്തുകൊണ്ട്?)" style={Inp}/>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <select value={contributeQ.answer} onChange={e=>setContributeQ({...contributeQ,answer:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}>
                  <option value="0">Ans: A</option><option value="1">Ans: B</option><option value="2">Ans: C</option><option value="3">Ans: D</option>
                </select>
                <select value={contributeQ.cat} onChange={e=>setContributeQ({...contributeQ,cat:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
                <select value={contributeQ.difficulty} onChange={e=>setContributeQ({...contributeQ,difficulty:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}>
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </div>
              {contribStatus&&<div style={{color:contribStatus.includes("✅")?"#10b981":"#ef4444",fontSize:13,marginBottom:8}}>{contribStatus}</div>}
              <button onClick={submitContribution} style={{...Btn("linear-gradient(135deg,#10b981,#06b6d4)"),width:"100%",padding:13}}>✍️ Submit for Review</button>
            </div>
            <button onClick={()=>setScreen("home")} style={{...Btn("rgba(99,102,241,0.1)","#a5b4fc"),width:"100%",marginTop:10}}>← Back</button>
          </div>
        )}

        {/* ── QUIZ ── */}
        {screen==="quiz"&&questions[curr]&&(()=>{
          const q=questions[curr];
          const catInfo=categories.find(c=>c.id===q.cat)||{label:q.cat,icon:"📋",color:"#6366f1"};
          return (
            <div className="pop" style={{paddingTop:14}}>
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{color:"#475569",fontSize:12}}>{curr+1}/{questions.length} • {catInfo.icon} {catInfo.label}</span>
                  <span className={timer<=5?"blink":""} style={{color:timer<=5?"#ef4444":"#10b981",fontWeight:800,background:timer<=5?"rgba(239,68,68,0.1)":"rgba(16,185,129,0.08)",padding:"3px 11px",borderRadius:20,fontSize:14}}>⏱{timer}s</span>
                </div>
                <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:4}}>
                  <div style={{height:"100%",width:`${(curr/questions.length)*100}%`,background:`linear-gradient(90deg,${catInfo.color},#a855f7)`,borderRadius:4,transition:"width 0.4s"}}/>
                </div>
              </div>
              <div style={{...card(),padding:14,marginBottom:11,background:"rgba(99,102,241,0.06)",borderColor:"rgba(99,102,241,0.13)"}}>
                <div style={{fontSize:10,color:catInfo.color,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>{catInfo.icon} {catInfo.label} • {q.difficulty||"medium"}</div>
                <p style={{fontSize:15,fontWeight:700,color:"#e2e8f0",lineHeight:1.6}}>{q.q}</p>
                {q.qm&&<p style={{fontSize:12,color:"#64748b",marginTop:4,lineHeight:1.5}}>{q.qm}</p>}
                {q.contributedBy&&<p style={{fontSize:10,color:"#334155",marginTop:6}}>Contributed by: {q.contributedBy}</p>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:11}}>
                {q.options.map((opt,i)=>{
                  let bg="rgba(255,255,255,0.03)",bdr="rgba(255,255,255,0.08)",col="#e2e8f0";
                  if(picked!==null){ if(i===q.answer){bg="rgba(16,185,129,0.12)";bdr="#10b981";col="#10b981";} else if(i===picked){bg="rgba(239,68,68,0.12)";bdr="#ef4444";col="#ef4444";} }
                  return <button key={i} onClick={()=>handleAns(i)} style={{display:"flex",alignItems:"center",gap:9,padding:"11px 12px",background:bg,border:`1.5px solid ${bdr}`,borderRadius:10,color:col,textAlign:"left",fontSize:13,cursor:"pointer",lineHeight:1.5}}>
                    <span style={{width:24,height:24,borderRadius:"50%",background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11,flexShrink:0}}>{["A","B","C","D"][i]}</span>{opt}
                  </button>;
                })}
              </div>
              {picked!==null&&<div className="pop">
                <div style={{...card(),padding:11,marginBottom:8,borderLeft:`3px solid ${picked===q.answer?"#10b981":"#ef4444"}`}}>
                  <div style={{fontWeight:700,color:picked===q.answer?"#10b981":"#ef4444"}}>{picked===q.answer?"✅ ശരിയാണ്!":"❌ തെറ്റ്!"}</div>
                  {picked!==q.answer&&<div style={{color:"#94a3b8",fontSize:12,marginTop:3}}>✔ ഉത്തരം: <strong style={{color:"#a5b4fc"}}>{q.options[q.answer]}</strong></div>}
                  {q.explanation&&<div style={{color:"#64748b",fontSize:11,marginTop:4}}>💡 {q.explanation}</div>}
                </div>
                <button onClick={nextQ} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",padding:12}}>{curr+1>=questions.length?"📊 Result":"അടുത്ത ചോദ്യം →"}</button>
              </div>}
            </div>
          );
        })()}

        {/* ── RESULT ── */}
        {screen==="result"&&(
          <div className="pop" style={{paddingTop:18}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:52}}>{score>=questions.length*0.8?"🏆":score>=questions.length*0.5?"😊":"💪"}</div>
              <h2 style={{fontSize:21,fontWeight:800,color:"#c7d2fe",marginTop:8}}>Quiz Complete!</h2>
              <div style={{fontSize:44,fontWeight:900,color:"#6366f1",margin:"8px 0"}}>{score}<span style={{fontSize:20,color:"#475569"}}>/{questions.length}</span></div>
              <div style={{color:"#10b981",fontSize:13}}>Accuracy: {Math.round((score/questions.length)*100)}%</div>
              <div style={{color:"#475569",fontSize:11,marginTop:3}}>🔥 Firebase Leaderboard-ൽ save ആയി!</div>
            </div>
            <h3 style={{fontSize:11,color:"#475569",marginBottom:7,textTransform:"uppercase",letterSpacing:1}}>Review</h3>
            {answers.map((a,i)=>(
              <div key={i} style={{...card(),padding:9,marginBottom:5,borderLeft:`3px solid ${a.ok?"#10b981":"#ef4444"}`}}>
                <div style={{fontSize:11,color:"#64748b",marginBottom:2}}>Q{i+1}: {a.q.q}</div>
                <div style={{fontSize:12,color:a.ok?"#10b981":"#ef4444"}}>{a.ok?"✅":"❌"} {a.sel===-1?"⏱ Time out":a.q.options[a.sel]}{!a.ok&&<span style={{color:"#10b981"}}> → {a.q.options[a.q.answer]}</span>}</div>
                {a.q.explanation&&!a.ok&&<div style={{fontSize:10,color:"#475569",marginTop:2}}>💡 {a.q.explanation}</div>}
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={()=>startQuiz(selCat,selSub)} style={{...Btn("rgba(99,102,241,0.15)","#a5b4fc"),flex:1}}>🔄 വീണ്ടും</button>
              <button onClick={()=>setScreen("home")} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),flex:1}}>🏠 Home</button>
            </div>
          </div>
        )}

        {/* ── ADMIN ── */}
        {screen==="admin"&&isAdmin&&(
          <div className="pop" style={{paddingTop:16}}>
            <h2 style={{fontSize:18,fontWeight:800,color:"#fbbf24",marginBottom:10}}>👑 Admin Panel {isSuperAdmin?"(Super Admin)":"(Admin)"}</h2>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
              {[["pending",`⏳ Pending (${pendingQ.length})`],["addq","➕ Add Q"],["cats","📁 Categories"],["sheet","📊 Sheet"],isSuperAdmin&&["admins","👑 Admins"]].filter(Boolean).map(([t,l])=>(
                <button key={t} onClick={()=>setAdminTab(t)} style={{padding:"7px 12px",background:adminTab===t?"#6366f1":"rgba(255,255,255,0.06)",border:`1px solid ${adminTab===t?"#6366f1":"rgba(255,255,255,0.1)"}`,borderRadius:20,color:adminTab===t?"#fff":"#64748b",cursor:"pointer",fontWeight:700,fontSize:11}}>
                  {l}
                </button>
              ))}
            </div>

            {/* ── PENDING TAB ── */}
            {adminTab==="pending"&&(
              <div>
                {pendingQ.length===0
                  ?<div style={{...card(),padding:36,textAlign:"center",color:"#475569"}}><div style={{fontSize:36}}>✅</div><p style={{marginTop:10}}>Pending questions ഇല്ല!</p></div>
                  :pendingQ.map(pq=>(
                    <div key={pq.id} style={{...card(),padding:14,marginBottom:10,borderLeft:"3px solid #f59e0b"}}>
                      <div style={{fontSize:11,color:"#f59e0b",marginBottom:6}}>⏳ Submitted by: <strong>{pq.submittedByName}</strong> • {categories.find(c=>c.id===pq.cat)?.label||pq.cat} • {pq.difficulty}</div>
                      <p style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:8}}>{pq.q}</p>
                      {pq.qm&&<p style={{fontSize:12,color:"#64748b",marginBottom:8}}>{pq.qm}</p>}
                      {pq.options.map((o,i)=>(
                        <div key={i} style={{fontSize:12,color:i===pq.answer?"#10b981":"#94a3b8",padding:"3px 0"}}>{["A","B","C","D"][i]}. {o} {i===pq.answer?"✅":""}</div>
                      ))}
                      {pq.explanation&&<p style={{fontSize:11,color:"#475569",marginTop:6}}>💡 {pq.explanation}</p>}
                      <div style={{display:"flex",gap:8,marginTop:10}}>
                        <button onClick={()=>approveQ(pq)} style={{...Btn("rgba(16,185,129,0.2)","#10b981",{border:"1px solid rgba(16,185,129,0.4)"}),flex:1}}>✅ Approve</button>
                        <button onClick={()=>rejectQ(pq)} style={{...Btn("rgba(239,68,68,0.15)","#ef4444",{border:"1px solid rgba(239,68,68,0.3)"}),flex:1}}>❌ Reject</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── ADD Q TAB ── */}
            {adminTab==="addq"&&(
              <div style={{...card(),padding:14,borderLeft:"3px solid #6366f1"}}>
                <div style={{fontWeight:700,color:"#a5b4fc",marginBottom:10}}>➕ Question Directly Add</div>
                <input value={newQ.q} onChange={e=>setNewQ({...newQ,q:e.target.value})} placeholder="Question (English) *" style={Inp}/>
                <input value={newQ.qm} onChange={e=>setNewQ({...newQ,qm:e.target.value})} placeholder="Question (Malayalam)" style={Inp}/>
                <input value={newQ.o1} onChange={e=>setNewQ({...newQ,o1:e.target.value})} placeholder="Option A *" style={Inp}/>
                <input value={newQ.o2} onChange={e=>setNewQ({...newQ,o2:e.target.value})} placeholder="Option B *" style={Inp}/>
                <input value={newQ.o3} onChange={e=>setNewQ({...newQ,o3:e.target.value})} placeholder="Option C *" style={Inp}/>
                <input value={newQ.o4} onChange={e=>setNewQ({...newQ,o4:e.target.value})} placeholder="Option D *" style={Inp}/>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <select value={newQ.answer} onChange={e=>setNewQ({...newQ,answer:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select>
                  <select value={newQ.cat} onChange={e=>setNewQ({...newQ,cat:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
                  <select value={newQ.difficulty} onChange={e=>setNewQ({...newQ,difficulty:e.target.value})} style={{...Sel,flex:1,marginBottom:0}}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
                </div>
                {addQStatus&&<div style={{color:addQStatus.includes("✅")?"#10b981":"#ef4444",fontSize:13,marginBottom:8}}>{addQStatus}</div>}
                <button onClick={addQuestion} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%"}}>➕ Firebase-ൽ Add</button>
              </div>
            )}

            {/* ── CATEGORIES TAB ── */}
            {adminTab==="cats"&&(
              <div>
                <div style={{...card(),padding:14,marginBottom:10,borderLeft:"3px solid #6366f1"}}>
                  <div style={{fontWeight:700,color:"#a5b4fc",marginBottom:10}}>➕ New Category</div>
                  <input value={newCat.label} onChange={e=>setNewCat({...newCat,label:e.target.value})} placeholder="Category Name *" style={Inp}/>
                  <div style={{fontSize:11,color:"#475569",marginBottom:5}}>Icon:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>{ICONS.map(ic=><button key={ic} onClick={()=>setNewCat({...newCat,icon:ic})} style={{width:32,height:32,fontSize:16,background:newCat.icon===ic?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.05)",border:`1px solid ${newCat.icon===ic?"#6366f1":"rgba(255,255,255,0.1)"}`,borderRadius:7,cursor:"pointer"}}>{ic}</button>)}</div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:5}}>Color:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>{COLORS.map(cl=><button key={cl} onClick={()=>setNewCat({...newCat,color:cl})} style={{width:26,height:26,background:cl,borderRadius:"50%",border:`2px solid ${newCat.color===cl?"#fff":"transparent"}`,cursor:"pointer"}}/>)}</div>
                  <button onClick={addCategory} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%"}}>➕ Add Category</button>
                </div>
                <div style={{...card(),padding:14,borderLeft:"3px solid #10b981"}}>
                  <div style={{fontWeight:700,color:"#10b981",marginBottom:10}}>📁 Sub-category Add</div>
                  <select value={newSub.catId} onChange={e=>setNewSub({...newSub,catId:e.target.value})} style={Sel}>
                    <option value="">-- Category Select --</option>
                    {categories.filter(c=>!DEFAULT_CATS.find(d=>d.id===c.id)).map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                  <input value={newSub.label} onChange={e=>setNewSub({...newSub,label:e.target.value})} placeholder="Sub-category Name *" style={Inp}/>
                  <div style={{fontSize:11,color:"#475569",marginBottom:5}}>Icon:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>{ICONS.map(ic=><button key={ic} onClick={()=>setNewSub({...newSub,icon:ic})} style={{width:30,height:30,fontSize:14,background:newSub.icon===ic?"rgba(16,185,129,0.3)":"rgba(255,255,255,0.05)",border:`1px solid ${newSub.icon===ic?"#10b981":"rgba(255,255,255,0.1)"}`,borderRadius:7,cursor:"pointer"}}>{ic}</button>)}</div>
                  <button onClick={addSubCat} style={{...Btn("#10b981"),width:"100%"}}>📁 Add Sub-category</button>
                </div>
              </div>
            )}

            {/* ── SHEET TAB ── */}
            {adminTab==="sheet"&&(
              <div style={{...card(),padding:14,borderLeft:"3px solid #10b981"}}>
                <div style={{fontWeight:700,color:"#10b981",marginBottom:8}}>📊 Google Sheets Import</div>
                <p style={{color:"#64748b",fontSize:11,marginBottom:10,lineHeight:1.6}}>Format: A:Question(EN) | B:Question(ML) | C-F:Options | G:Answer(0-3) | H:Subcat | I:Difficulty</p>
                <input value={sheetId} onChange={e=>setSheetId(e.target.value)} placeholder="Google Sheet ID..." style={Inp}/>
                <select value={sheetCat} onChange={e=>setSheetCat(e.target.value)} style={Sel}>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
                <button onClick={importSheet} style={{...Btn(sheetStatus==="success"?"#10b981":sheetStatus==="error"?"#ef4444":"#6366f1"),width:"100%"}}>{sheetStatus==="loading"?"⏳ Importing...":sheetStatus==="success"?"✅ Imported!":sheetStatus==="error"?"❌ Error — Retry":"📥 Import"}</button>
              </div>
            )}

            {/* ── ADMINS TAB (Super Admin only) ── */}
            {adminTab==="admins"&&isSuperAdmin&&(
              <div>
                <div style={{...card(),padding:14,marginBottom:10,borderLeft:"3px solid #fbbf24"}}>
                  <div style={{fontWeight:700,color:"#fbbf24",marginBottom:10}}>👑 Admin Add ചെയ്യൂ</div>
                  <p style={{color:"#64748b",fontSize:12,marginBottom:10}}>ഈ email-ൽ login ചെയ്യുന്ന user-ന് Admin access കിട്ടും!</p>
                  <input value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} placeholder="admin@email.com" type="email" style={Inp}/>
                  {adminStatus&&<div style={{color:adminStatus.includes("✅")?"#10b981":adminStatus.includes("⏳")?"#f59e0b":"#ef4444",fontSize:13,marginBottom:8}}>{adminStatus}</div>}
                  <button onClick={addAdmin} style={{...Btn("linear-gradient(135deg,#f59e0b,#fbbf24)","#000"),width:"100%"}}>👑 Make Admin</button>
                </div>
                <div style={{...card(),padding:14}}>
                  <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:10}}>Current Admins</div>
                  <div style={{padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{fontSize:13,color:"#fbbf24",fontWeight:700}}>👑 {SUPER_ADMIN}</div>
                    <div style={{fontSize:10,color:"#475569"}}>Super Admin — Cannot be removed</div>
                  </div>
                  {adminList.map(a=>(
                    <div key={a.key} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,color:"#e2e8f0",fontWeight:600}}>🛡️ {a.email}</div>
                      </div>
                      <button onClick={()=>removeAdmin(a.key)} style={{...Btn("rgba(239,68,68,0.1)","#ef4444"),padding:"4px 8px",fontSize:11}}>Remove</button>
                    </div>
                  ))}
                  {adminList.length===0&&<p style={{color:"#475569",fontSize:12,marginTop:6}}>Additional admins ഇല്ല.</p>}
                </div>
              </div>
            )}

            <button onClick={()=>setScreen("home")} style={{...Btn("rgba(99,102,241,0.1)","#a5b4fc"),width:"100%",marginTop:12}}>← Home</button>
          </div>
        )}

        {/* ── MY PROGRESS ── */}
        {screen==="myprogress"&&(
          <div className="pop" style={{paddingTop:16}}>
            <h2 style={{fontSize:18,fontWeight:800,color:"#c7d2fe",marginBottom:4}}>📊 My Progress</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:12}}>{user?.displayName||user?.email}</p>
            <div style={{display:"flex",gap:7,marginBottom:14}}>
              {[{l:"Contributions",v:myContributions.length,i:"✍️"},{l:"Approved",v:myContributions.filter(c=>c.status==="approved").length,i:"✅"},{l:"Pending",v:myContributions.filter(c=>c.status==="pending").length,i:"⏳"}].map((x,i)=>(
                <div key={i} style={{...card(),flex:1,padding:"9px 4px",textAlign:"center"}}>
                  <div style={{fontSize:16}}>{x.i}</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#818cf8"}}>{x.v}</div>
                  <div style={{fontSize:10,color:"#475569"}}>{x.l}</div>
                </div>
              ))}
            </div>
            <h3 style={{fontSize:11,color:"#475569",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Quiz Stats by Category</h3>
            {Object.keys(myStats).length===0
              ?<div style={{...card(),padding:30,textAlign:"center",color:"#475569"}}><div style={{fontSize:32}}>📊</div><p style={{marginTop:8}}>ഇതുവരെ Quiz കളിച്ചിട്ടില്ല!</p></div>
              :Object.entries(myStats).map(([catId,data])=>{
                const catInfo=categories.find(c=>c.id===catId)||{label:catId,icon:"📋"};
                const pct=Math.round((data.correct/(data.attempts*10))*100)||0;
                return (
                  <div key={catId} style={{...card(),padding:12,marginBottom:7}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontWeight:700,fontSize:13}}>{catInfo.icon} {catInfo.label}</span>
                      <span style={{color:pct>=80?"#10b981":pct>=50?"#f59e0b":"#ef4444",fontWeight:700}}>{pct}%</span>
                    </div>
                    <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:4,marginBottom:5}}>
                      <div style={{height:"100%",width:`${pct}%`,background:pct>=80?"#10b981":pct>=50?"#f59e0b":"#ef4444",borderRadius:4}}/>
                    </div>
                    <div style={{display:"flex",gap:10,fontSize:11,color:"#475569"}}>
                      <span>Played: {data.attempts}x</span><span>Best: {data.best}/10</span><span>Correct: {data.correct}</span>
                    </div>
                  </div>
                );
              })
            }
            <button onClick={()=>setScreen("home")} style={{...Btn("rgba(99,102,241,0.1)","#a5b4fc"),width:"100%",marginTop:10}}>← Back</button>
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {screen==="leaderboard"&&(
          <div className="pop" style={{paddingTop:16}}>
            <h2 style={{fontSize:18,fontWeight:800,color:"#c7d2fe",marginBottom:4}}>🏆 Global Leaderboard</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:12}}>Real-time Firebase 🔥</p>
            {leaderboard.length===0
              ?<div style={{...card(),padding:36,textAlign:"center",color:"#475569"}}><div style={{fontSize:36}}>🏆</div><p style={{marginTop:10}}>Scores ഇല്ല!</p></div>
              :leaderboard.map((e,i)=>(
                <div key={e.id} style={{...card(),display:"flex",alignItems:"center",gap:9,padding:11,marginBottom:6,borderLeft:`3px solid ${i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7c2f":"#334155"}`,background:e.uid===user?.uid?"rgba(99,102,241,0.08)":"rgba(255,255,255,0.03)"}}>
                  <span style={{fontSize:18,width:24,textAlign:"center"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:e.uid===user?.uid?"#a5b4fc":"#e2e8f0",fontSize:13}}>{e.name} {e.uid===user?.uid?"(You)":""}</div>
                    <div style={{fontSize:10,color:"#475569"}}>{e.categoryLabel||e.category} • {e.accuracy}%</div>
                  </div>
                  <div style={{fontWeight:800,color:"#6366f1",fontSize:16}}>{e.score}/{e.total}</div>
                </div>
              ))
            }
            <button onClick={()=>setScreen("home")} style={{...Btn("rgba(99,102,241,0.1)","#a5b4fc"),width:"100%",marginTop:10}}>← Back</button>
          </div>
        )}

        {/* ── COMPETITION ── */}
        {screen==="competition"&&(
          <div className="pop" style={{paddingTop:16}}>
            <h2 style={{fontSize:18,fontWeight:800,color:"#c7d2fe",marginBottom:4}}>⚔️ Quiz Battle</h2>
            <p style={{color:"#475569",fontSize:12,marginBottom:12}}>Friends-നെ Challenge ചെയ്യൂ!</p>
            <div style={{...card(),padding:14,marginBottom:10,borderLeft:"3px solid #6366f1"}}>
              <div style={{fontWeight:700,color:"#a5b4fc",marginBottom:6}}>🆕 Create Room</div>
              <button onClick={createRoom} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%"}}>🎮 Create Room</button>
            </div>
            <div style={{...card(),padding:14,borderLeft:"3px solid #10b981"}}>
              <div style={{fontWeight:700,color:"#10b981",marginBottom:6}}>🔗 Join Room</div>
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" style={{...Inp,textTransform:"uppercase",letterSpacing:4,textAlign:"center",fontSize:20,fontWeight:800}}/>
              {roomErr&&<div style={{color:"#ef4444",fontSize:12,marginBottom:6}}>{roomErr}</div>}
              <button onClick={joinRoom} style={{...Btn("#10b981"),width:"100%"}}>🚀 Join</button>
            </div>
            <button onClick={()=>setScreen("home")} style={{...Btn("rgba(99,102,241,0.1)","#a5b4fc"),width:"100%",marginTop:10}}>← Back</button>
          </div>
        )}

        {/* ── ROOM ── */}
        {screen==="room"&&(
          <div className="pop" style={{paddingTop:16}}>
            <h2 style={{fontSize:18,fontWeight:800,color:"#c7d2fe",marginBottom:10}}>🎮 Quiz Room</h2>
            <div style={{...card(),padding:18,marginBottom:12,textAlign:"center",background:"rgba(99,102,241,0.08)"}}>
              <p style={{color:"#64748b",fontSize:12}}>Room Code — Share with friends!</p>
              <div style={{fontSize:32,fontWeight:900,color:"#a5b4fc",letterSpacing:6,margin:"8px 0"}}>{roomCode}</div>
            </div>
            {roomData?.players&&(
              <div style={{...card(),padding:12,marginBottom:12}}>
                <div style={{fontWeight:700,marginBottom:8,fontSize:13}}>Players ({Object.keys(roomData.players).length})</div>
                {Object.entries(roomData.players).map(([uid,p])=>(
                  <div key={uid} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{p.name[0].toUpperCase()}</div>
                    <div style={{flex:1,fontWeight:600,fontSize:13}}>{p.name} {uid===user?.uid?"(You)":""}</div>
                    <div style={{color:"#6366f1",fontWeight:700,fontSize:13}}>{p.score}pts</div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={()=>startQuiz("psc")} style={{...Btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",marginBottom:8,padding:12}}>🚀 Start Quiz!</button>
            <button onClick={()=>setScreen("home")} style={{...Btn("rgba(99,102,241,0.1)","#a5b4fc"),width:"100%"}}>← Back</button>
          </div>
        )}

      </div>
    </div>
  );
}
