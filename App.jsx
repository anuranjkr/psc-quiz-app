import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getDatabase, ref, set, get, onValue, push, serverTimestamp, query, orderByChild, limitToLast, remove, update } from "firebase/database";

const APP_VERSION = "1.0.6"; // Updated version
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

  // Gemini API states
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [geminiCategory, setGeminiCategory] = useState("ldc");
  const [geminiCount, setGeminiCount] = useState(5);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiQuestions, setGeminiQuestions] = useState([]);

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

  // 🤖 GEMINI AI INTEGRATION
  const generateQuestionsWithGemini = async () => {
    if (!geminiApiKey.trim()) {
      showNotif("ദയവായി Gemini API കീ നൽകുക", "error");
      return;
    }
    if (!geminiPrompt.trim()) {
      showNotif("ദയവായി ഒരു prompt നൽകുക", "error");
      return;
    }

    setGeminiLoading(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate ${geminiCount} multiple choice quiz questions in JSON format based on this topic: "${geminiPrompt}". 
              Category: ${geminiCategory}
              
              Return ONLY a valid JSON array (no markdown, no code blocks, no additional text) where each object has these exact properties:
              - q: string (the question text)
              - options: array of 4 strings (answer choices)
              - answer: number (index 0-3 of correct option)
              - cat: string (category like "${geminiCategory}")
              - qm: string (brief explanation or interesting fact, can be empty string)
              
              Example format:
              [{"q":"What is the capital of Kerala?","options":["Kochi","Thiruvananthapuram","Kozhikode","Kannur"],"answer":1,"cat":"ldc","qm":"Thiruvananthapuram is also known as Trivandrum"}]
              
              Make questions educational and suitable for PSC exam preparation in Kerala.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || "API Error");
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      
      // Clean the response to get valid JSON
      let cleanJson = generatedText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      // Try to find JSON array in the response
      const jsonMatch = cleanJson.match(/\[.*\]/s);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }

      const parsedQuestions = JSON.parse(cleanJson);
      
      // Validate each question has required fields
      const validQuestions = parsedQuestions.filter(q => 
        q.q && 
        Array.isArray(q.options) && 
        q.options.length === 4 && 
        typeof q.answer === 'number' && 
        q.answer >= 0 && 
        q.answer <= 3
      );

      if (validQuestions.length === 0) {
        throw new Error("No valid questions generated");
      }

      setGeminiQuestions(validQuestions);
      showNotif(`${validQuestions.length} ചോദ്യങ്ങൾ ജനറേറ്റ് ചെയ്തു!`, "success");
    } catch (error) {
      console.error("Gemini API Error:", error);
      showNotif(`പിശക്: ${error.message}`, "error");
    } finally {
      setGeminiLoading(false);
    }
  };

  const saveGeminiQuestions = async () => {
    if (geminiQuestions.length === 0) {
      showNotif("സേവ് ചെയ്യാൻ ചോദ്യങ്ങളില്ല", "error");
      return;
    }

    try {
      let count = 0;
      for (const question of geminiQuestions) {
        await push(ref(db, "questions"), {
          ...question,
          addedBy: user.email,
          addedAt: serverTimestamp(),
          source: "gemini-ai"
        });
        count++;
      }
      showNotif(`${count} ചോദ്യങ്ങൾ സേവ് ചെയ്തു!`, "success");
      setGeminiQuestions([]);
    } catch (error) {
      showNotif("സേവ് ചെയ്യുന്നതിൽ പിശക്!", "error");
    }
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
            <div style={{display:"flex", gap:"10px", margin:"20px 0", flexWrap:"wrap"}}>
              <button onClick={() => setAdminTab("pending")} style={{flex:1, padding:"10px", background: adminTab==="pending"?"#6366f1":"#111122", border:"none", color:"#fff", borderRadius:"5px", minWidth:"120px"}}>Pending ({pendingQ.length})</button>
              <button onClick={() => setAdminTab("upload")} style={{flex:1, padding:"10px", background: adminTab==="upload"?"#6366f1":"#111122", border:"none", color:"#fff", borderRadius:"5px", minWidth:"120px"}}>Upload JSON</button>
              <button onClick={() => setAdminTab("gemini")} style={{flex:1, padding:"10px", background: adminTab==="gemini"?"#6366f1":"#111122", border:"none", color:"#fff", borderRadius:"5px", minWidth:"120px"}}>🤖 Gemini AI</button>
            </div>

            {/* GEMINI AI TAB */}
            {adminTab === "gemini" && (
              <div style={{background:"#111122", padding:"20px", borderRadius:"10px"}}>
                <h3 style={{marginBottom:"20px", color:"#a5b4fc"}}>🤖 Google Gemini AI - Auto Generate Questions</h3>
                
                <div style={{marginBottom:"15px"}}>
                  <label style={{display:"block", marginBottom:"5px", color:"#94a3b8"}}>Gemini API Key</label>
                  <input 
                    type="password" 
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    style={{width:"100%", padding:"10px", background:"#0a0a1a", border:"1px solid #312e81", borderRadius:"5px", color:"#fff"}}
                  />
                  <p style={{fontSize:"11px", color:"#475569", marginTop:"5px"}}>Get your key from: <a href="https://makersuite.google.com/app/apikey" target="_blank" style={{color:"#6366f1"}}>Google AI Studio</a></p>
                </div>

                <div style={{marginBottom:"15px"}}>
                  <label style={{display:"block", marginBottom:"5px", color:"#94a3b8"}}>Topic / Prompt</label>
                  <input 
                    type="text" 
                    value={geminiPrompt}
                    onChange={(e) => setGeminiPrompt(e.target.value)}
                    placeholder="e.g., Kerala History, Indian Constitution, General Science..."
                    style={{width:"100%", padding:"10px", background:"#0a0a1a", border:"1px solid #312e81", borderRadius:"5px", color:"#fff"}}
                  />
                </div>

                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"15px"}}>
                  <div>
                    <label style={{display:"block", marginBottom:"5px", color:"#94a3b8"}}>Category</label>
                    <select 
                      value={geminiCategory}
                      onChange={(e) => setGeminiCategory(e.target.value)}
                      style={{width:"100%", padding:"10px", background:"#0a0a1a", border:"1px solid #312e81", borderRadius:"5px", color:"#fff"}}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block", marginBottom:"5px", color:"#94a3b8"}}>Number of Questions</label>
                    <select 
                      value={geminiCount}
                      onChange={(e) => setGeminiCount(parseInt(e.target.value))}
                      style={{width:"100%", padding:"10px", background:"#0a0a1a", border:"1px solid #312e81", borderRadius:"5px", color:"#fff"}}
                    >
                      {[1,2,3,5,10,15,20].map(n => (
                        <option key={n} value={n}>{n} Questions</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={generateQuestionsWithGemini}
                  disabled={geminiLoading}
                  style={{
                    width:"100%", 
                    padding:"15px", 
                    background: geminiLoading ? "#4b5563" : "linear-gradient(135deg, #4285f4, #34a853)", 
                    border:"none", 
                    borderRadius:"10px", 
                    color:"#fff", 
                    fontWeight:"bold",
                    cursor: geminiLoading ? "not-allowed" : "pointer",
                    marginBottom:"20px"
                  }}
                >
                  {geminiLoading ? "⏳ Generating..." : "🚀 Generate Questions"}
                </button>

                {/* Display generated questions */}
                {geminiQuestions.length > 0 && (
                  <div>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"15px"}}>
                      <h4 style={{color:"#10b981"}}>✅ Generated {geminiQuestions.length} Questions</h4>
                      <button 
                        onClick={saveGeminiQuestions}
                        style={{
                          padding:"10px 20px", 
                          background:"#10b981", 
                          border:"none", 
                          borderRadius:"5px", 
                          color:"#fff", 
                          fontWeight:"bold",
                          cursor:"pointer"
                        }}
                      >
                        💾 Save All to Database
                      </button>
                    </div>
                    
                    <div style={{maxHeight:"400px", overflowY:"auto"}}>
                      {geminiQuestions.map((q, idx) => (
                        <div key={idx} style={{background:"#0a0a1a", padding:"15px", borderRadius:"10px", marginBottom:"10px", border:"1px solid #1e1b4b"}}>
                          <p style={{fontWeight:"bold", marginBottom:"10px"}}>{idx + 1}. {q.q}</p>
                          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"5px", marginBottom:"10px"}}>
                            {q.options.map((opt, i) => (
                              <div key={i} style={{
                                padding:"8px", 
                                borderRadius:"5px", 
                                background: i === q.answer ? "#065f46" : "#1e1b4b",
                                color: i === q.answer ? "#10b981" : "#94a3b8",
                                fontSize:"14px"
                              }}>
                                {i === q.answer ? "✓ " : ""}{opt}
                              </div>
                            ))}
                          </div>
                          {q.qm && <p style={{fontSize:"12px", color:"#64748b"}}>💡 {q.qm}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
