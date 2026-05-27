import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getDatabase, ref, set, get, onValue, push, serverTimestamp, query, orderByChild, limitToLast, remove, update } from "firebase/database";

const APP_VERSION = "1.0.5"; // നിലവിലെ ആപ്പ് വെർഷൻ
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
  { id:"science", label:"Science", icon:"🔬", color:"#10b981" },
  { id:"history", label:"History", icon:"📜", color:"#f59e0b" },
];

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [history, setHistory] = useState(["home"]);
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [em, setEm] = useState(""); const [pw, setPw] = useState("");
  const [dn, setDn] = useState(""); const [authErr, setAuthErr] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [allQ, setAllQ] = useState([]);
  const [pendingQ, setPendingQ] = useState([]);
  const [notif, setNotif] = useState(null);
  const [adminTab, setAdminTab] = useState("pending");
  const [quizCount, setQuizCount] = useState(10);
  const [selCat, setSelCat] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [curr, setCurr] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef(null);

  const showNotif = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };
  const goTo = (s) => { setScreen(s); setHistory(h=>[...h,s]); };
  const goBack = () => {
    if (history.length > 1) {
      const newH = [...history];
      newH.pop();
      setHistory(newH); setScreen(newH[newH.length-1]);
    } else { setScreen("home"); }
  };

  // 🔄 AUTO UPDATE CHECK
  useEffect(() => {
    const vRef = ref(db, "settings/app_version");
    onValue(vRef, (snap) => {
      if (snap.exists() && snap.val() !== APP_VERSION) {
        showNotif("പുതിയ അപ്ഡേറ്റ് ലഭ്യമാണ്! Reload ചെയ്യുന്നു...", "success");
        setTimeout(() => window.location.reload(), 3000);
      }
    });
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const sAdmin = u.email === SUPER_ADMIN;
        setIsSuperAdmin(sAdmin);
        const adminSnap = await get(ref(db, `adminEmails/${u.email.replace(/\./g, "_")}`));
        setIsAdmin(sAdmin || adminSnap.exists());
        loadData(u.uid, sAdmin || adminSnap.exists());
        setScreen("home");
      } else { setTimeout(() => setScreen("auth"), 1500); }
    });
    return () => unsub();
  }, []);

  const loadData = (uid, admin) => {
    onValue(ref(db, "questions"), (snap) => {
      const qs = [];
      if (snap.exists()) snap.forEach(c => qs.push({ id: c.key, ...c.val() }));
      setAllQ(qs);
    });
    if (admin) {
      onValue(ref(db, "pending_questions"), (snap) => {
        const d = [];
        if (snap.exists()) snap.forEach(c => d.push({ id: c.key, ...c.val() }));
        setPendingQ(d);
      });
    }
  };

  // 📂 JSON FILE IMPORT
  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!Array.isArray(data)) {
          showNotif("Invalid Format: JSON ഒരു Array ആയിരിക്കണം", "error");
          return;
        }
        let count = 0;
        for (const item of data) {
          if (item.q && item.options && item.answer !== undefined) {
            await push(ref(db, "questions"), {
              ...item,
              addedBy: user.email,
              addedAt: serverTimestamp()
            });
            count++;
          }
        }
        showNotif(`${count} ചോദ്യങ്ങൾ വിജയകരമായി ചേർത്തു!`, "success");
      } catch (err) {
        showNotif("File റീഡ് ചെയ്യുന്നതിൽ പിശക്!", "error");
      }
    };
    reader.readAsText(file);
  };

  const loginGoogle = async () => { try { await signInWithPopup(auth, gProvider); } catch { showNotif("Login Failed", "error"); } };
  
  const startQuiz = (cat) => {
    const qs = (cat === "mock" ? allQ : allQ.filter(q => q.cat === cat)).sort(() => Math.random() - 0.5).slice(0, quizCount);
    if (!qs.length) { showNotif("ചോദ്യങ്ങൾ ലഭ്യമല്ല!", "error"); return; }
    setSelCat(cat); setQuestions(qs); setCurr(0); setPicked(null); setScore(0);
    setScreen("quiz");
  };

  const handleAns = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[curr].answer) setScore(s => s + 1);
  };

  // UI Components
  const Header = () => (
    <div style={{background:"#1e1b4b", padding:"15px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #312e81"}}>
      <b style={{color:"#a5b4fc"}}>🎓 PSC Quiz</b>
      {isAdmin && <button onClick={() => goTo("admin")} style={{background:"#fbbf24", border:"none", padding:"5px 10px", borderRadius:"5px", fontWeight:"bold"}}>Admin</button>}
    </div>
  );

  if (screen === "splash") return <div style={{height:"100vh", background:"#05050f", display:"flex", justifyContent:"center", alignItems:"center", color:"#fff"}}><h1>Loading...</h1></div>;

  if (screen === "auth") return (
    <div style={{height:"100vh", background:"#05050f", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:"20px"}}>
      <h2 style={{color:"#fff", marginBottom:"20px"}}>🎓 PSC Quiz Kerala</h2>
      <button onClick={loginGoogle} style={{padding:"15px 30px", borderRadius:"10px", border:"none", background:"#fff", fontWeight:"bold", cursor:"pointer"}}>Continue with Google</button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh", background:"#05050f", color:"#e2e8f0", fontFamily:"sans-serif"}}>
      {notif && <div style={{position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:notif.type==="error"?"#ef4444":"#10b981", color:"#fff", padding:"10px 20px", borderRadius:"20px", zIndex:1000}}>{notif.msg}</div>}
      <Header />
      
      <div style={{maxWidth:"500px", margin:"0 auto", padding:"20px"}}>
        
        {/* HOME SCREEN */}
        {screen === "home" && (
          <div>
            <div style={{textAlign:"center", padding:"30px 0"}}>
              <h2 style={{color:"#a5b4fc"}}>തയ്യാറെടുപ്പ് തുടങ്ങാം!</h2>
              <p style={{color:"#64748b"}}>{allQ.length} ചോദ്യങ്ങൾ ലഭ്യമാണ്</p>
            </div>
            <button onClick={() => startQuiz("mock")} style={{width:"100%", padding:"20px", borderRadius:"15px", background:"linear-gradient(135deg, #6366f1, #8b5cf6)", border:"none", color:"#fff", fontWeight:"bold", fontSize:"18px", marginBottom:"20px", cursor:"pointer"}}>🎯 Mock Test</button>
            
            <h3 style={{marginBottom:"15px"}}>വിഭാഗങ്ങൾ</h3>
            {categories.map(c => (
              <div key={c.id} onClick={() => startQuiz(c.id)} style={{background:"#111122", padding:"15px", borderRadius:"10px", marginBottom:"10px", display:"flex", alignItems:"center", gap:"15px", cursor:"pointer", border:"1px solid #1e1b4b"}}>
                <span style={{fontSize:"24px"}}>{c.icon}</span>
                <span style={{fontWeight:"bold"}}>{c.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* QUIZ SCREEN */}
        {screen === "quiz" && questions[curr] && (
          <div>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:"20px"}}>
              <span>ചോദ്യം: {curr+1}/{questions.length}</span>
              <span style={{color:"#fbbf24"}}>സ്കോർ: {score}</span>
            </div>
            <div style={{background:"#111122", padding:"20px", borderRadius:"15px", marginBottom:"20px", borderLeft:"5px solid #6366f1"}}>
              <p style={{fontSize:"18px", fontWeight:"bold"}}>{questions[curr].q}</p>
              {questions[curr].qm && <p style={{color:"#94a3b8", marginTop:"10px"}}>{questions[curr].qm}</p>}
            </div>
            {questions[curr].options.map((opt, i) => (
              <button key={i} onClick={() => handleAns(i)} style={{width:"100%", padding:"15px", borderRadius:"10px", marginBottom:"10px", textAlign:"left", border:"1px solid #1e1b4b", background: picked === i ? (i === questions[curr].answer ? "#065f46" : "#7f1d1d") : (picked !== null && i === questions[curr].answer ? "#065f46" : "#111122"), color:"#fff", cursor: picked === null ? "pointer" : "default"}}>
                {opt}
              </button>
            ))}
            {picked !== null && (
              <button onClick={() => { if(curr+1 < questions.length) { setCurr(curr+1); setPicked(null); } else { setScreen("home"); showNotif(`Quiz കഴിഞ്ഞു! സ്കോർ: ${score}/${questions.length}`); } }} style={{width:"100%", padding:"15px", background:"#6366f1", border:"none", borderRadius:"10px", color:"#fff", fontWeight:"bold", marginTop:"10px"}}>Next</button>
            )}
          </div>
        )}

        {/* ADMIN SCREEN */}
        {screen === "admin" && isAdmin && (
          <div>
            <button onClick={() => setScreen("home")} style={{color:"#94a3b8", background:"none", border:"none", marginBottom:"15px", cursor:"pointer"}}>← Back</button>
            <h2>Admin Panel</h2>
            <div style={{display:"flex", gap:"10px", margin:"20px 0"}}>
              <button onClick={() => setAdminTab("pending")} style={{flex:1, padding:"10px", background: adminTab==="pending"?"#6366f1":"#111122", border:"none", color:"#fff", borderRadius:"5px"}}>Pending ({pendingQ.length})</button>
              <button onClick={() => setAdminTab("upload")} style={{flex:1, padding:"10px", background: adminTab==="upload"?"#6366f1":"#111122", border:"none", color:"#fff", borderRadius:"5px"}}>Upload JSON</button>
            </div>

            {adminTab === "upload" && (
              <div style={{background:"#111122", padding:"20px", borderRadius:"10px", textAlign:"center"}}>
                <h4 style={{marginBottom:"15px"}}>JSON ഫയൽ തിരഞ്ഞെടുക്കുക</h4>
                <input type="file" accept=".json" onChange={handleJsonUpload} style={{color:"#94a3b8"}} />
                <p style={{fontSize:"12px", color:"#475569", marginTop:"10px"}}>Format: [{"{q:'...', options:['...'], answer:0, cat:'...'}"}]</p>
              </div>
            )}

            {adminTab === "pending" && (
              pendingQ.map(pq => (
                <div key={pq.id} style={{background:"#111122", padding:"15px", borderRadius:"10px", marginBottom:"10px"}}>
                  <p>{pq.q}</p>
                  <div style={{display:"flex", gap:"10px", marginTop:"10px"}}>
                    <button onClick={async () => { await push(ref(db, "questions"), { ...pq, status: "approved" }); await remove(ref(db, `pending_questions/${pq.id}`)); showNotif("അംഗീകരിച്ചു!"); }} style={{background:"#10b981", border:"none", padding:"5px 10px", borderRadius:"5px", flex:1}}>Approve</button>
                    <button onClick={async () => { await remove(ref(db, `pending_questions/${pq.id}`)); showNotif("നീക്കം ചെയ്തു!"); }} style={{background:"#ef4444", border:"none", padding:"5px 10px", borderRadius:"5px", flex:1}}>Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
