import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, set, get, onValue, push, serverTimestamp, update, remove } from "firebase/database";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Config ──────────────────────────────────────────────
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

// Gemini AI Setup
const genAI = new GoogleGenerativeAI("AQAb8RN6KhdS7EiRaJHzogxUIc2UbZ3PoFgjDgdJ4voDC9tAxBnA");

// ─── Constants & Main App ────────────────────────────────
const SUPER_ADMIN = "anuranjkr45@gmail.com";
const DEFAULT_CATS = [
  { id:"ldc", label:"LDC / LGS", icon:"📋", color:"#6366f1" },
  { id:"psc", label:"PSC General", icon:"🏛️", color:"#8b5cf6" },
  { id:"police", label:"Police / SI", icon:"👮", color:"#3b82f6" },
  { id:"science", label:"Science", icon:"🔬", color:"#10b981" },
  { id:"history", label:"History", icon:"📜", color:"#f59e0b" },
  { id:"geography", label:"Geography", icon:"🌍", color:"#06b6d4" },
  { id:"current", label:"Current Affairs", icon:"📰", color:"#ef4444" },
];

function GeminiQuizGenerator({ db, categories, user, showNotif }) {
  const [topic, setTopic] = useState("");
  const [targetCat, setTargetCat] = useState("ldc");
  const [genStatus, setGenStatus] = useState("idle");

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    setGenStatus("loading");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Create 10 Kerala PSC MCQs about "${topic}". Category: ${targetCat}. Return ONLY a JSON array: [{"q":"English Q", "qm":"Malayalam Q", "options":["A","B","C","D"], "answer":0, "explanation":"Why"}]`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const clean = text.replace(/```json/g, "").replace(/```/g, "");
      const parsed = JSON.parse(clean.match(/\[[\s\S]*\]/)[0]);
      
      for (const q of parsed) {
        await push(ref(db, "questions"), { ...q, cat: targetCat.toLowerCase().trim(), addedBy: user.email, addedAt: serverTimestamp() });
      }
      showNotif("🎉 10 Questions uploaded via Gemini!");
      setGenStatus("done");
    } catch (e) { setGenStatus("error"); showNotif("AI Error: " + e.message, "error"); }
  };

  return (
    <div style={{background:"rgba(255,255,255,0.05)", padding:15, borderRadius:12}}>
      <h3>🤖 Gemini AI Generator</h3>
      <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic..." style={{width:"100%", padding:10, marginBottom:10, borderRadius:8}} />
      <button onClick={generateQuiz} disabled={genStatus==="loading"} style={{width:"100%", padding:10, background:"#6366f1", border:"none", borderRadius:8, color:"#fff", cursor:"pointer"}}>
        {genStatus==="loading"?"Generating...":"Generate & Upload"}
      </button>
    </div>
  );
}

export default function App() {
  // നിങ്ങളുടെ മുമ്പുണ്ടായിരുന്ന മുഴുവൻ ലോജിക്കും ബാക്കിയുള്ള Admin Panel, Battle Mode, Forum എന്നിവ ഇവിടെ ചേർക്കുക.
  // മുകളിൽ നൽകിയിട്ടുള്ള GeminiQuizGenerator കോമ്പോണന്റ് Admin Panel-ൽ Puter-ന് പകരം ഉപയോഗിക്കുക.
  return (
    <div>{/* ബാക്കി പഴയ കോഡ് ഇവിടെ കൊടുക്കുക */}</div>
  );
}
