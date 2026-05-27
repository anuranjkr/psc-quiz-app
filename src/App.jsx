import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from "firebase/auth";
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
  { id: "ldc", label: "LDC / LGS", icon: "📋", color: "#6366f1" },
  { id: "psc", label: "PSC General", icon: "🏛️", color: "#8b5cf6" },
  { id: "police", label: "Police / SI", icon: "👮", color: "#3b82f6" },
  { id: "science", label: "Science", icon: "🔬", color: "#10b981" },
  { id: "history", label: "History", icon: "📜", color: "#f59e0b" },
  { id: "geography", label: "Geography", icon: "🌍", color: "#06b6d4" },
  { id: "current", label: "Current Affairs", icon: "📰", color: "#ef4444" },
];

const BUILTIN_Q = [
  { id: "b1", q: "Kerala formed on?", qm: "കേരളം രൂപീകരിച്ചത്?", options: ["Nov 1, 1956", "Aug 15, 1947", "Jan 26, 1950", "Nov 1, 1960"], answer: 0, cat: "ldc", difficulty: "easy", explanation: "Kerala was formed on November 1, 1956" },
  { id: "b2", q: "Longest river in Kerala?", qm: "കേരളത്തിലെ ഏറ്റവും നീളം?", options: ["Periyar", "Bharathapuzha", "Pamba", "Chaliyar"], answer: 1, cat: "ldc", difficulty: "easy", explanation: "Bharathapuzha (312 km) is the longest river in Kerala." },
  { id: "b3", q: "Capital of Kerala?", qm: "കേരളത്തിന്റെ തലസ്ഥാനം?", options: ["Kochi", "Kozhikode", "Thiruvananthapuram", "Thrissur"], answer: 2, cat: "ldc", difficulty: "easy", explanation: "Thiruvananthapuram is the capital of Kerala." },
];

const ICONS = ["📋", "🏛️", "👮", "🔬", "📜", "🌍", "📰", "🎯", "📚", "✏️"];
const COLORS = ["#6366f1", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4", "#ef4444"];
const FORUM_CATS = [
  { id: "general", label: "General", icon: "💬", color: "#6366f1" },
  { id: "ldc", label: "LDC Tips", icon: "📋", color: "#8b5cf6" },
  { id: "current", label: "Current Affairs", icon: "📰", color: "#ef4444" },
  { id: "doubt", label: "Doubts", icon: "🤔", color: "#f59e0b" },
];

const computerAnswer = (q) => {
  let accuracy = 0.65;
  if (q.difficulty === "easy") accuracy = 0.75;
  else if (q.difficulty === "medium") accuracy = 0.6;
  else if (q.difficulty === "hard") accuracy = 0.45;
  return Math.random() < accuracy ? q.answer : (q.answer + 1 + Math.floor(Math.random() * 3)) % 4;
};

export default function App() {
  // Core state
  const [screen, setScreen] = useState("splash");
  const [history, setHistory] = useState(["home"]);
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth state
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [dn, setDn] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Data state
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [fbQ, setFbQ] = useState([]);
  const [allQ, setAllQ] = useState(BUILTIN_Q);
  const [pendingQ, setPendingQ] = useState([]);
  const [myContributions, setMyContributions] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [activeMembers, setActiveMembers] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState({});
  const [forumPosts, setForumPosts] = useState([]);
  const [forumLoaded, setForumLoaded] = useState(false);

  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [selCat, setSelCat] = useState(null);
  const [quizCount, setQuizCount] = useState(10);
  const [curr, setCurr] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef(null);

  // Admin state
  const [adminTab, setAdminTab] = useState("pending");
  const [newCat, setNewCat] = useState({ label: "", icon: "📋", color: "#6366f1" });
  const [newQ, setNewQ] = useState({ q: "", qm: "", o1: "", o2: "", o3: "", o4: "", answer: "0", cat: "ldc", difficulty: "easy", explanation: "" });
  const [addQStatus, setAddQStatus] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [jsonImportStatus, setJsonImportStatus] = useState("");
  const [jsonCategory, setJsonCategory] = useState("ldc");
  const [jsonDifficulty, setJsonDifficulty] = useState("easy");

  // Contribute state
  const [contributeQ, setContributeQ] = useState({ q: "", qm: "", o1: "", o2: "", o3: "", o4: "", answer: "0", cat: "ldc", difficulty: "easy", explanation: "" });
  const [contribStatus, setContribStatus] = useState("");

  // Battle state - FIXED for better performance
  const [battleType, setBattleType] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [roomErr, setRoomErr] = useState("");
  const [battleQ, setBattleQ] = useState([]);
  const [battleCurr, setBattleCurr] = useState(0);
  const [battlePicked, setBattlePicked] = useState(null);
  const [battleScore, setBattleScore] = useState(0);
  const [battleTimer, setBattleTimer] = useState(20);
  const battleTimerRef = useRef(null);
  const [chatMsg, setChatMsg] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [battleStarted, setBattleStarted] = useState(false);
  const [waitingRandom, setWaitingRandom] = useState(false);
  const [battleLoading, setBattleLoading] = useState(false);
  const randomQueueRef = useRef(null);
  const roomListenersRef = useRef([]);

  // Forum state
  const [forumMsg, setForumMsg] = useState("");
  const [forumCategory, setForumCategory] = useState("general");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMsg, setReplyMsg] = useState("");

  // Notification state
  const [notif, setNotif] = useState(null);
  const showNotif = useCallback((msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  }, []);

  // Navigation functions
  const goTo = useCallback((s) => {
    setScreen(s);
    setHistory(h => [...h, s]);
  }, []);

  const goBack = useCallback(() => {
    if (history.length > 1) {
      const newH = [...history];
      newH.pop();
      setHistory(newH);
      setScreen(newH[newH.length - 1]);
    } else {
      setScreen("home");
    }
  }, [history]);

  // Cleanup room listeners
  const cleanupRoomListeners = useCallback(() => {
    roomListenersRef.current.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') unsubscribe();
    });
    roomListenersRef.current = [];
  }, []);

  // Forgot password function
  const handleForgotPassword = useCallback(async () => {
    if (!forgotPasswordEmail) {
      setForgotPasswordMsg("❌ Please enter your email address!");
      return;
    }
    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotPasswordEmail);
      setForgotPasswordMsg("✅ Password reset email sent! Check your inbox.");
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordMsg("");
        setForgotPasswordEmail("");
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      if (error.code === "auth/user-not-found") {
        setForgotPasswordMsg("❌ No account found with this email!");
      } else {
        setForgotPasswordMsg("❌ Failed to send reset email. Try again!");
      }
    } finally {
      setAuthLoading(false);
    }
  }, [forgotPasswordEmail, auth]);

  // Load all data with proper cleanup
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        const superAdmin = u.email === SUPER_ADMIN;
        setIsSuperAdmin(superAdmin);
        try {
          const adminSnap = await get(ref(db, `adminEmails/${u.email.replace(/\./g, "_")}`));
          const isUserAdmin = superAdmin || adminSnap.exists();
          setIsAdmin(isUserAdmin);

          await set(ref(db, `online/${u.uid}`), {
            name: u.displayName || u.email,
            lastSeen: serverTimestamp(),
            online: true
          });

          const questionsRef = ref(db, "questions");
          const categoriesRef = ref(db, "categories");
          const leaderboardRef = query(ref(db, "leaderboard"), orderByChild("score"), limitToLast(20));
          const forumRef = query(ref(db, "forum"), orderByChild("time"), limitToLast(100));

          const unsubscribeQuestions = onValue(questionsRef, (snap) => {
            const qs = [];
            if (snap.exists()) snap.forEach(c => qs.push({ id: c.key, ...c.val() }));
            setFbQ(qs);
          });

          const unsubscribeCategories = onValue(categoriesRef, (snap) => {
            if (snap.exists()) {
              const cats = [];
              snap.forEach(c => cats.push({ id: c.key, ...c.val() }));
              setCategories([...DEFAULT_CATS, ...cats]);
            }
          });

          const unsubscribeLeaderboard = onValue(leaderboardRef, (snap) => {
            if (snap.exists()) {
              const d = [];
              snap.forEach(c => d.push({ id: c.key, ...c.val() }));
              setLeaderboard(d.reverse());
            }
          });

          const unsubscribeStats = onValue(ref(db, `users/${u.uid}/stats`), (snap) => {
            if (snap.exists()) setMyStats(snap.val());
          });

          const unsubscribeContributions = onValue(ref(db, `users/${u.uid}/contributions`), (snap) => {
            if (snap.exists()) {
              const d = [];
              snap.forEach(c => d.push({ id: c.key, ...c.val() }));
              setMyContributions(d);
            }
          });

          const unsubscribeOnline = onValue(ref(db, "online"), (snap) => {
            setActiveMembers(snap.exists() ? snap.size : 0);
          });

          const unsubscribeForum = onValue(forumRef, (snap) => {
            if (snap.exists()) {
              const d = [];
              snap.forEach(c => d.push({ id: c.key, ...c.val() }));
              setForumPosts(d.reverse());
            }
            setForumLoaded(true);
          });

          if (isUserAdmin) {
            const unsubscribePending = onValue(ref(db, "pending_questions"), (snap) => {
              const d = [];
              if (snap.exists()) snap.forEach(c => d.push({ id: c.key, ...c.val() }));
              setPendingQ(d);
            });
            const unsubscribeAdminEmails = onValue(ref(db, "adminEmails"), (snap) => {
              if (snap.exists()) {
                const d = [];
                snap.forEach(c => d.push({ key: c.key, email: c.key.replace(/_/g, ".") }));
                setAdminList(d);
              }
            });
            return () => {
              unsubscribePending();
              unsubscribeAdminEmails();
              unsubscribeQuestions();
              unsubscribeCategories();
              unsubscribeLeaderboard();
              unsubscribeStats();
              unsubscribeContributions();
              unsubscribeOnline();
              unsubscribeForum();
            };
          }

          return () => {
            unsubscribeQuestions();
            unsubscribeCategories();
            unsubscribeLeaderboard();
            unsubscribeStats();
            unsubscribeContributions();
            unsubscribeOnline();
            unsubscribeForum();
          };
        } catch (error) {
          console.error("Error loading data:", error);
          showNotif("Error loading data! Please refresh.", "error");
        }
        setScreen("home");
        setHistory(["home"]);
      } else {
        setTimeout(() => setScreen("auth"), 1500);
      }
    });

    return () => unsubscribeAuth();
  }, [showNotif]);

  // Update allQ when fbQ changes
  useEffect(() => {
    setAllQ([...BUILTIN_Q, ...fbQ]);
  }, [fbQ]);

  // Cleanup user online status on unmount
  useEffect(() => {
    return () => {
      if (user) {
        remove(ref(db, `online/${user.uid}`)).catch(console.error);
      }
      cleanupRoomListeners();
      if (timerRef.current) clearInterval(timerRef.current);
      if (battleTimerRef.current) clearInterval(battleTimerRef.current);
      if (randomQueueRef.current) clearTimeout(randomQueueRef.current);
    };
  }, [user, cleanupRoomListeners]);

  // Quiz timer
  useEffect(() => {
    if (screen !== "quiz" || picked !== null) return;
    setTimer(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleAns(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [curr, screen, picked]);

  // Battle timer - FIXED performance
  useEffect(() => {
    if (screen !== "battle" || battlePicked !== null || !battleStarted || battleLoading) return;
    setBattleTimer(20);
    if (battleTimerRef.current) clearInterval(battleTimerRef.current);
    battleTimerRef.current = setInterval(() => {
      setBattleTimer(t => {
        if (t <= 1) {
          clearInterval(battleTimerRef.current);
          handleBattleAns(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (battleTimerRef.current) clearInterval(battleTimerRef.current);
    };
  }, [battleCurr, screen, battleStarted, battlePicked, battleLoading]);

  // Auth functions
  const loginGoogle = useCallback(async () => {
    setAuthLoading(true);
    setAuthErr("");
    try {
      await signInWithPopup(auth, gProvider);
    } catch (error) {
      console.error("Google login error:", error);
      setAuthErr("Google login failed! Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loginEmail = useCallback(async () => {
    setAuthLoading(true);
    setAuthErr("");
    try {
      if (authMode === "register") {
        if (!dn.trim()) {
          setAuthErr("Please enter your name!");
          setAuthLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, em, pw);
        await updateProfile(cred.user, { displayName: dn });
        await set(ref(db, `users/${cred.user.uid}/profile`), {
          name: dn,
          email: em,
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, em, pw);
      }
    } catch (error) {
      console.error("Email auth error:", error);
      if (error.code === "auth/wrong-password") setAuthErr("❌ Incorrect password!");
      else if (error.code === "auth/user-not-found") setAuthErr("❌ User not found!");
      else if (error.code === "auth/email-already-in-use") setAuthErr("❌ Email already registered!");
      else if (error.code === "auth/weak-password") setAuthErr("❌ Password must be at least 6 characters!");
      else setAuthErr("❌ " + error.message);
    } finally {
      setAuthLoading(false);
    }
  }, [authMode, dn, em, pw]);

  const logout = useCallback(async () => {
    try {
      cleanupRoomListeners();
      if (user) await remove(ref(db, `online/${user.uid}`));
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [user, cleanupRoomListeners]);

  // Quiz functions
  const startQuiz = useCallback((cat) => {
    const qs = (cat === "mock" ? allQ : [...allQ].filter(q => q.cat === cat))
      .sort(() => Math.random() - 0.5)
      .slice(0, quizCount);
    if (!qs.length) {
      showNotif("No questions available!", "error");
      return;
    }
    setSelCat(cat);
    setQuestions(qs);
    setCurr(0);
    setPicked(null);
    setScore(0);
    setAnswers([]);
    setScreen("quiz");
    setHistory(h => [...h, "quiz"]);
  }, [allQ, quizCount, showNotif]);

  const handleAns = useCallback((i) => {
    if (picked !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setPicked(i);
    const q = questions[curr];
    const ok = i === q.answer;
    if (ok) setScore(s => s + 1);
    setAnswers(a => [...a, { q, sel: i, ok }]);
  }, [picked, questions, curr]);

  const nextQ = useCallback(async () => {
    if (curr + 1 >= questions.length) {
      await saveResult();
      setScreen("result");
      setHistory(h => [...h, "result"]);
      return;
    }
    setCurr(c => c + 1);
    setPicked(null);
  }, [curr, questions.length]);

  const saveResult = useCallback(async () => {
    if (!user) return;
    const fs = answers.filter(a => a.ok).length;
    const catLabel = categories.find(c => c.id === selCat)?.label || selCat || "Mock";
    try {
      await push(ref(db, "leaderboard"), {
        uid: user.uid,
        name: user.displayName || user.email.split("@")[0],
        score: fs,
        total: questions.length,
        category: selCat || "mock",
        categoryLabel: catLabel,
        accuracy: Math.round((fs / questions.length) * 100),
        timestamp: serverTimestamp()
      });
      const statsRef = ref(db, `users/${user.uid}/stats/${selCat || "mock"}`);
      const snap = await get(statsRef);
      const prev = snap.exists() ? snap.val() : { attempts: 0, correct: 0, best: 0 };
      await set(statsRef, {
        attempts: prev.attempts + 1,
        correct: prev.correct + fs,
        best: Math.max(prev.best || 0, fs)
      });
    } catch (error) {
      console.error("Error saving result:", error);
    }
  }, [user, answers, categories, selCat, questions.length]);

  const reportQ = useCallback(async (qId, qText) => {
    const reason = window.prompt(`"${qText.substring(0, 50)}..."\n\nWhat's the issue?`);
    if (!reason) return;
    try {
      await push(ref(db, "reports"), {
        qId, qText, reason,
        reportedBy: user.uid,
        reportedByName: user.displayName || user.email,
        reportedAt: serverTimestamp(),
        status: "pending"
      });
      showNotif("✅ Report submitted!");
    } catch (error) {
      console.error("Error reporting question:", error);
      showNotif("❌ Failed to submit report!", "error");
    }
  }, [user, showNotif]);

  // Battle functions - OPTIMIZED for speed
  const createRoom = useCallback(async (type) => {
    if (battleLoading) return;
    setBattleLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const maxP = type === "multi" ? 100 : 2;
      const qs = allQ.sort(() => Math.random() - 0.5).slice(0, quizCount);
      
      await set(ref(db, `rooms/${code}`), {
        host: user.displayName || user.email,
        hostUid: user.uid,
        code, type,
        status: "waiting",
        maxPlayers: maxP,
        createdAt: serverTimestamp(),
        questions: qs.map(q => ({
          id: q.id,
          q: q.q,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation || ""
        })),
        players: {
          [user.uid]: {
            name: user.displayName || user.email,
            score: 0,
            ready: false,
            avatar: user.displayName ? user.displayName[0].toUpperCase() : "U"
          }
        }
      });
      
      setRoomCode(code);
      setRoomData(null);
      setBattleQ([]);
      setChatMessages([]);
      
      // Set up listeners
      const roomRef = ref(db, `rooms/${code}`);
      const chatRef = ref(db, `rooms/${code}/chat`);
      
      const unsubscribeRoom = onValue(roomRef, (snap) => {
        if (snap.exists()) {
          setRoomData(snap.val());
          if (snap.val().questions) setBattleQ(Object.values(snap.val().questions));
        }
      });
      
      const unsubscribeChat = onValue(chatRef, (snap) => {
        if (snap.exists()) {
          const msgs = [];
          snap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
          setChatMessages(msgs.slice(-50));
        }
      });
      
      roomListenersRef.current = [unsubscribeRoom, unsubscribeChat];
      goTo("room");
    } catch (error) {
      console.error("Error creating room:", error);
      showNotif("Failed to create room!", "error");
    } finally {
      setBattleLoading(false);
    }
  }, [user, allQ, quizCount, goTo, showNotif, battleLoading]);

  const joinRoom = useCallback(async () => {
    if (battleLoading) return;
    const code = joinCode.toUpperCase().trim();
    if (!code) {
      setRoomErr("❌ Please enter a room code!");
      return;
    }
    setBattleLoading(true);
    try {
      const snap = await get(ref(db, `rooms/${code}`));
      if (!snap.exists()) {
        setRoomErr("❌ Room not found!");
        setBattleLoading(false);
        return;
      }
      const room = snap.val();
      const playerCount = Object.keys(room.players || {}).length;
      if (playerCount >= room.maxPlayers) {
        setRoomErr("❌ Room is full!");
        setBattleLoading(false);
        return;
      }
      
      await set(ref(db, `rooms/${code}/players/${user.uid}`), {
        name: user.displayName || user.email,
        score: 0,
        ready: false,
        avatar: user.displayName ? user.displayName[0].toUpperCase() : "U"
      });
      
      setRoomCode(code);
      setRoomData(null);
      setBattleQ([]);
      setChatMessages([]);
      
      const roomRef = ref(db, `rooms/${code}`);
      const chatRef = ref(db, `rooms/${code}/chat`);
      
      const unsubscribeRoom = onValue(roomRef, (snap) => {
        if (snap.exists()) {
          setRoomData(snap.val());
          if (snap.val().questions) setBattleQ(Object.values(snap.val().questions));
        }
      });
      
      const unsubscribeChat = onValue(chatRef, (snap) => {
        if (snap.exists()) {
          const msgs = [];
          snap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
          setChatMessages(msgs.slice(-50));
        }
      });
      
      roomListenersRef.current = [unsubscribeRoom, unsubscribeChat];
      goTo("room");
    } catch (error) {
      console.error("Error joining room:", error);
      setRoomErr("❌ Failed to join room!");
    } finally {
      setBattleLoading(false);
    }
  }, [joinCode, user, goTo, battleLoading]);

  const findRandom = useCallback(async () => {
    if (battleLoading) return;
    setWaitingRandom(true);
    setBattleLoading(true);
    try {
      const snap = await get(ref(db, "random_queue"));
      if (snap.exists()) {
        const entries = [];
        snap.forEach(c => entries.push({ key: c.key, ...c.val() }));
        const available = entries.find(e => e.uid !== user.uid && e.status === "waiting");
        if (available) {
          await remove(ref(db, `random_queue/${available.key}`));
          await joinRoomById(available.roomCode);
          setWaitingRandom(false);
          setBattleLoading(false);
          return;
        }
      }
      const code = "R" + Math.random().toString(36).substring(2, 6).toUpperCase();
      await createRoom("1v1");
      const qRef = await push(ref(db, "random_queue"), {
        uid: user.uid,
        roomCode: code,
        status: "waiting",
        createdAt: serverTimestamp()
      });
      randomQueueRef.current = setTimeout(async () => {
        try {
          const qSnap = await get(ref(db, `random_queue/${qRef.key}`));
          if (qSnap.exists()) {
            await remove(ref(db, `random_queue/${qRef.key}`));
            await set(ref(db, `rooms/${code}/players/computer`), {
              name: "🤖 AI Opponent",
              score: 0,
              ready: true,
              isComputer: true,
              avatar: "🤖"
            });
            setWaitingRandom(false);
            showNotif("No players found — Playing vs AI! 🤖");
          }
        } catch (error) {
          console.error("Error finding random opponent:", error);
        } finally {
          setBattleLoading(false);
        }
      }, 10000);
    } catch (error) {
      console.error("Error in random matchmaking:", error);
      showNotif("Failed to find opponent!", "error");
      setWaitingRandom(false);
      setBattleLoading(false);
    }
  }, [user, createRoom, joinRoomById, showNotif, battleLoading]);

  const joinRoomById = useCallback(async (code) => {
    try {
      await set(ref(db, `rooms/${code}/players/${user.uid}`), {
        name: user.displayName || user.email,
        score: 0,
        ready: false,
        avatar: user.displayName ? user.displayName[0].toUpperCase() : "U"
      });
      setRoomCode(code);
      setRoomData(null);
      setBattleQ([]);
      setChatMessages([]);
      
      const roomRef = ref(db, `rooms/${code}`);
      const chatRef = ref(db, `rooms/${code}/chat`);
      
      const unsubscribeRoom = onValue(roomRef, (snap) => {
        if (snap.exists()) {
          setRoomData(snap.val());
          if (snap.val().questions) setBattleQ(Object.values(snap.val().questions));
        }
      });
      
      const unsubscribeChat = onValue(chatRef, (snap) => {
        if (snap.exists()) {
          const msgs = [];
          snap.forEach(c => msgs.push({ id: c.key, ...c.val() }));
          setChatMessages(msgs.slice(-50));
        }
      });
      
      roomListenersRef.current = [unsubscribeRoom, unsubscribeChat];
      goTo("room");
    } catch (error) {
      console.error("Error joining room by ID:", error);
    }
  }, [user, goTo]);

  const startBattleGame = useCallback(async () => {
    if (!roomCode || battleLoading) return;
    setBattleLoading(true);
    try {
      await update(ref(db, `rooms/${roomCode}`), {
        status: "playing",
        startedAt: serverTimestamp()
      });
      if (roomData?.questions) setBattleQ(Object.values(roomData.questions));
      setBattleCurr(0);
      setBattlePicked(null);
      setBattleScore(0);
      setBattleStarted(true);
      setScreen("battle");
      setHistory(h => [...h, "battle"]);
    } catch (error) {
      console.error("Error starting battle:", error);
      showNotif("Failed to start battle!", "error");
    } finally {
      setBattleLoading(false);
    }
  }, [roomCode, roomData, showNotif, battleLoading]);

  const handleBattleAns = useCallback((i) => {
    if (battlePicked !== null || battleLoading) return;
    if (battleTimerRef.current) clearInterval(battleTimerRef.current);
    setBattlePicked(i);
    const q = battleQ[battleCurr];
    if (!q) return;
    const ok = i === q.answer;
    const newScore = ok ? battleScore + 1 : battleScore;
    if (ok) setBattleScore(newScore);
    
    // Update score in Firebase without waiting
    set(ref(db, `rooms/${roomCode}/players/${user.uid}/score`), newScore).catch(console.error);
    
    if (roomData?.players?.computer) {
      const compAns = computerAnswer(q);
      const compOk = compAns === q.answer;
      const curComp = roomData?.players?.computer?.score || 0;
      setTimeout(() => {
        set(ref(db, `rooms/${roomCode}/players/computer/score`), compOk ? curComp + 1 : curComp).catch(console.error);
      }, 300);
    }
  }, [battlePicked, battleQ, battleCurr, battleScore, roomCode, user.uid, roomData, battleLoading]);

  const nextBattle = useCallback(() => {
    if (battleLoading) return;
    if (battleCurr + 1 >= battleQ.length) {
      cleanupRoomListeners();
      goTo("battle_result");
      return;
    }
    setBattleCurr(c => c + 1);
    setBattlePicked(null);
  }, [battleCurr, battleQ.length, goTo, cleanupRoomListeners, battleLoading]);

  const sendChat = useCallback(async () => {
    if (!chatMsg.trim() || !roomCode) return;
    try {
      await push(ref(db, `rooms/${roomCode}/chat`), {
        uid: user.uid,
        name: user.displayName || user.email.split("@")[0],
        msg: chatMsg.trim(),
        time: Date.now()
      });
      setChatMsg("");
    } catch (error) {
      console.error("Error sending chat:", error);
    }
  }, [chatMsg, roomCode, user]);

  // Forum functions with reply feature
  const sendForumPost = useCallback(async () => {
    if (!forumMsg.trim()) return;
    try {
      await push(ref(db, "forum"), {
        uid: user.uid,
        name: user.displayName || user.email.split("@")[0],
        avatar: (user.displayName || user.email)[0].toUpperCase(),
        msg: forumMsg.trim(),
        category: forumCategory === "all" ? "general" : forumCategory,
        time: Date.now(),
        likes: 0,
        replies: []
      });
      setForumMsg("");
      showNotif("Post published! 🎉");
    } catch (error) {
      console.error("Error posting to forum:", error);
      showNotif("Failed to post!", "error");
    }
  }, [forumMsg, forumCategory, user, showNotif]);

  const sendReply = useCallback(async (postId) => {
    if (!replyMsg.trim()) return;
    try {
      const postRef = ref(db, `forum/${postId}`);
      const snap = await get(postRef);
      if (snap.exists()) {
        const post = snap.val();
        const replies = post.replies || [];
        replies.push({
          uid: user.uid,
          name: user.displayName || user.email.split("@")[0],
          msg: replyMsg.trim(),
          time: Date.now()
        });
        await update(postRef, { replies });
        setReplyMsg("");
        setReplyingTo(null);
        showNotif("Reply sent! 💬");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      showNotif("Failed to send reply!", "error");
    }
  }, [replyMsg, user, showNotif]);

  const deleteForumPost = useCallback(async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await remove(ref(db, `forum/${postId}`));
      showNotif("Post deleted!", "error");
    } catch (error) {
      console.error("Error deleting post:", error);
      showNotif("Failed to delete post!", "error");
    }
  }, [showNotif]);

  const likePost = useCallback(async (post) => {
    const liked = JSON.parse(localStorage.getItem(`liked_${post.id}`) || "false");
    if (liked) return;
    try {
      await update(ref(db, `forum/${post.id}`), { likes: (post.likes || 0) + 1 });
      localStorage.setItem(`liked_${post.id}`, "true");
    } catch (error) {
      console.error("Error liking post:", error);
    }
  }, []);

  // Auto-start battle when status changes to "playing"
  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsubscribe = onValue(roomRef, (snap) => {
      if (!snap.exists()) return;
      const room = snap.val();
      if (room.status === "playing" && (screen === "room" || screen === "battle_lobby") && !battleStarted) {
        if (room.questions) {
          setBattleQ(Object.values(room.questions));
        }
        setBattleCurr(0);
        setBattlePicked(null);
        setBattleScore(0);
        setBattleStarted(true);
        setScreen("battle");
        setHistory(h => [...h, "battle"]);
      }
    });
    return () => unsubscribe();
  }, [roomCode, screen, battleStarted]);

  // Contribute functions
  const submitContribution = useCallback(async () => {
    const q = contributeQ;
    if (!q.q || !q.o1 || !q.o2 || !q.o3 || !q.o4) {
      setContribStatus("❌ Please fill all fields!");
      return;
    }
    setContribStatus("⏳ Submitting...");
    try {
      const r = await push(ref(db, "pending_questions"), {
        q: q.q,
        qm: q.qm,
        options: [q.o1, q.o2, q.o3, q.o4],
        answer: parseInt(q.answer),
        cat: q.cat,
        difficulty: q.difficulty,
        explanation: q.explanation,
        submittedBy: user.uid,
        submittedByName: user.displayName || user.email,
        submittedByEmail: user.email,
        status: "pending",
        submittedAt: serverTimestamp()
      });
      await set(ref(db, `users/${user.uid}/contributions/${r.key}`), {
        q: q.q,
        cat: q.cat,
        status: "pending",
        submittedAt: Date.now()
      });
      setContributeQ({ q: "", qm: "", o1: "", o2: "", o3: "", o4: "", answer: "0", cat: "ldc", difficulty: "easy", explanation: "" });
      setContribStatus("✅ Submitted! Waiting for admin approval.");
      showNotif("Question submitted successfully! 🎉");
    } catch (error) {
      console.error("Error submitting contribution:", error);
      setContribStatus("❌ Error submitting question!");
    }
  }, [contributeQ, user, showNotif]);

  // Admin functions
  const approveQ = useCallback(async (pq) => {
    try {
      await push(ref(db, "questions"), {
        q: pq.q,
        qm: pq.qm || "",
        options: pq.options,
        answer: pq.answer,
        cat: pq.cat,
        difficulty: pq.difficulty,
        explanation: pq.explanation || "",
        approvedBy: user.email,
        approvedAt: serverTimestamp(),
        contributedBy: pq.submittedByName
      });
      await remove(ref(db, `pending_questions/${pq.id}`));
      if (pq.submittedBy) {
        await update(ref(db, `users/${pq.submittedBy}/contributions/${pq.id}`), { status: "approved" });
      }
      showNotif("✅ Question approved!");
    } catch (error) {
      console.error("Error approving question:", error);
      showNotif("Failed to approve question!", "error");
    }
  }, [user, showNotif]);

  const rejectQ = useCallback(async (pq) => {
    try {
      await remove(ref(db, `pending_questions/${pq.id}`));
      if (pq.submittedBy) {
        await update(ref(db, `users/${pq.submittedBy}/contributions/${pq.id}`), { status: "rejected" });
      }
      showNotif("Question rejected.", "error");
    } catch (error) {
      console.error("Error rejecting question:", error);
      showNotif("Failed to reject question!", "error");
    }
  }, [showNotif]);

  const deleteQ = useCallback(async (id) => {
    if (!window.confirm("Delete this question permanently?")) return;
    try {
      await remove(ref(db, `questions/${id}`));
      showNotif("Question deleted!", "error");
    } catch (error) {
      console.error("Error deleting question:", error);
      showNotif("Failed to delete question!", "error");
    }
  }, [showNotif]);

  const addDirectQ = useCallback(async () => {
    if (!newQ.q || !newQ.o1 || !newQ.o2 || !newQ.o3 || !newQ.o4) {
      setAddQStatus("❌ Please fill all fields!");
      return;
    }
    setAddQStatus("⏳ Adding...");
    try {
      await push(ref(db, "questions"), {
        q: newQ.q,
        qm: newQ.qm,
        options: [newQ.o1, newQ.o2, newQ.o3, newQ.o4],
        answer: parseInt(newQ.answer),
        cat: newQ.cat,
        difficulty: newQ.difficulty,
        explanation: newQ.explanation,
        addedBy: user.email,
        addedAt: serverTimestamp()
      });
      setNewQ({ q: "", qm: "", o1: "", o2: "", o3: "", o4: "", answer: "0", cat: "ldc", difficulty: "easy", explanation: "" });
      setAddQStatus("✅ Question added successfully!");
      setTimeout(() => setAddQStatus(""), 3000);
      showNotif("Question added! 📝");
    } catch (error) {
      console.error("Error adding question:", error);
      setAddQStatus("❌ Error adding question!");
    }
  }, [newQ, user, showNotif]);

  const addAdmin = useCallback(async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes("@")) {
      setAdminStatus("❌ Please enter a valid email!");
      return;
    }
    const key = newAdminEmail.trim().replace(/\./g, "_");
    try {
      await set(ref(db, `adminEmails/${key}`), {
        email: newAdminEmail.trim(),
        addedBy: user.email,
        addedAt: serverTimestamp()
      });
      setNewAdminEmail("");
      setAdminStatus("✅ Admin added successfully!");
      showNotif(`${newAdminEmail} is now an Admin! 👑`);
      setTimeout(() => setAdminStatus(""), 3000);
    } catch (error) {
      console.error("Error adding admin:", error);
      setAdminStatus("❌ Failed to add admin!");
    }
  }, [newAdminEmail, user, showNotif]);

  const removeAdmin = useCallback(async (key) => {
    if (!window.confirm("Remove this admin?")) return;
    try {
      await remove(ref(db, `adminEmails/${key}`));
      showNotif("Admin removed.", "error");
    } catch (error) {
      console.error("Error removing admin:", error);
      showNotif("Failed to remove admin!", "error");
    }
  }, [showNotif]);

  const addCategory = useCallback(async () => {
    if (!newCat.label.trim()) {
      showNotif("Please enter category name!", "error");
      return;
    }
    const id = newCat.label.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
    try {
      await set(ref(db, `categories/${id}`), {
        label: newCat.label,
        icon: newCat.icon,
        color: newCat.color,
        createdAt: serverTimestamp()
      });
      setNewCat({ label: "", icon: "📋", color: "#6366f1" });
      showNotif(`"${newCat.label}" category added! 🎉`);
    } catch (error) {
      console.error("Error adding category:", error);
      showNotif("Failed to add category!", "error");
    }
  }, [newCat, showNotif]);

  const deleteCat = useCallback(async (id) => {
    if (!window.confirm("Delete this category permanently?")) return;
    try {
      await remove(ref(db, `categories/${id}`));
      showNotif("Category deleted!", "error");
    } catch (error) {
      console.error("Error deleting category:", error);
      showNotif("Failed to delete category!", "error");
    }
  }, [showNotif]);

  // JSON File Import Function
  const importJSONFile = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setJsonImportStatus("⏳ Reading JSON file...");
    
    try {
      const text = await file.text();
      const questionsData = JSON.parse(text);
      
      let questionsArray = [];
      if (Array.isArray(questionsData)) {
        questionsArray = questionsData;
      } else if (typeof questionsData === 'object') {
        questionsArray = Object.values(questionsData);
      }
      
      if (questionsArray.length === 0) {
        setJsonImportStatus("❌ No questions found in JSON file!");
        return;
      }
      
      setJsonImportStatus(`⏳ Importing ${questionsArray.length} questions...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < questionsArray.length; i++) {
        const q = questionsArray[i];
        
        if (!q.q || !q.options || !Array.isArray(q.options) || q.options.length < 4) {
          errorCount++;
          continue;
        }
        
        let answerIndex = q.answer;
        if (typeof answerIndex === 'string') {
          const answerMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
          answerIndex = answerMap[answerIndex] || 0;
        }
        
        const questionData = {
          q: q.q,
          qm: q.qm || "",
          options: q.options,
          answer: answerIndex,
          cat: jsonCategory,
          difficulty: jsonDifficulty,
          explanation: q.explanation || "",
          addedBy: "json_import",
          addedByUser: user.email,
          addedAt: serverTimestamp()
        };
        
        try {
          await push(ref(db, "questions"), questionData);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error(`Error importing question ${i + 1}:`, err);
        }
      }
      
      if (errorCount === 0) {
        setJsonImportStatus(`✅ Successfully imported ${successCount} questions to ${jsonCategory} category!`);
        showNotif(`🎉 ${successCount} questions imported successfully!`);
      } else {
        setJsonImportStatus(`⚠️ Imported ${successCount} questions with ${errorCount} errors.`);
        showNotif(`Imported ${successCount} questions (${errorCount} failed)`, "error");
      }
      
      event.target.value = '';
      
    } catch (error) {
      console.error("JSON import error:", error);
      setJsonImportStatus(`❌ Failed to parse JSON: ${error.message}`);
      showNotif("Invalid JSON file format!", "error");
      event.target.value = '';
    }
  }, [jsonCategory, jsonDifficulty, user, showNotif]);

  const downloadSampleJSON = useCallback(() => {
    const sampleQuestions = [
      {
        "q": "Which district in Kerala has the highest literacy rate?",
        "options": ["Thiruvananthapuram", "Kollam", "Kottayam", "Pathanamthitta"],
        "answer": 2,
        "explanation": "Kottayam is the first district in India to achieve 100% literacy"
      },
      {
        "q": "Who wrote the Malayalam novel 'Aadujeevitham'?",
        "options": ["M. T. Vasudevan Nair", "Benyamin", "S. K. Pottekkatt", "Vaikom Muhammad Basheer"],
        "answer": 1,
        "explanation": "Benyamin wrote the award-winning novel 'Aadujeevitham'"
      }
    ];
    
    const jsonStr = JSON.stringify(sampleQuestions, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_questions.json";
    a.click();
    URL.revokeObjectURL(url);
    showNotif("Sample JSON downloaded! 📥");
  }, [showNotif]);

  // Styles
  const styles = useMemo(() => ({
    container: { minHeight: "100vh", background: "#05050f", color: "#e2e8f0", fontFamily: "'Segoe UI', sans-serif" },
    card: (ex = {}) => ({ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, ...ex }),
    glass: (ex = {}) => ({ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, ...ex }),
    btn: (bg, col = "#fff", ex = {}) => ({ background: bg, color: col, border: "none", borderRadius: 12, padding: "12px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit", transition: "all 0.2s", ...ex }),
    inp: { width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#e2e8f0", fontSize: 13, marginBottom: 10, fontFamily: "inherit", outline: "none" },
    sel: { width: "100%", background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#e2e8f0", fontSize: 13, marginBottom: 10, fontFamily: "inherit", outline: "none" }
  }), []);

  // Splash screen
  if (screen === "splash") {
    return (
      <div style={{ ...styles.container, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 72, filter: "drop-shadow(0 0 30px rgba(99,102,241,0.8))" }}>🎓</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, background: "linear-gradient(135deg,#a5b4fc,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PSC Quiz Kerala</h1>
        <p style={{ color: "#475569", fontSize: 14 }}>Loading...</p>
        <div style={{ width: 40, height: 3, background: "linear-gradient(90deg,#6366f1,#a855f7)", borderRadius: 3, animation: "load 1.5s ease infinite" }} />
        <style>{`@keyframes load{0%{width:40px}50%{width:120px}100%{width:40px}}`}</style>
      </div>
    );
  }

  // Auth screen with forgot password
  if (screen === "auth") {
    return (
      <div style={{ ...styles.container, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, minHeight: "100vh" }}>
        <style>{`*{box-sizing:border-box;margin:0;padding:0}input,select{font-family:inherit}input:focus{border-color:#6366f1!important;outline:none}`}</style>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 60, marginBottom: 12, filter: "drop-shadow(0 0 20px rgba(99,102,241,0.6))" }}>🎓</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, background: "linear-gradient(135deg,#a5b4fc,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>PSC Quiz Kerala</h1>
            <p style={{ color: "#475569", fontSize: 13 }}>Kerala's #1 PSC Exam Preparation App</p>
          </div>
          
          {!showForgotPassword ? (
            <>
              <button onClick={loginGoogle} disabled={authLoading} style={{ ...styles.btn("rgba(255,255,255,0.08)", "#e2e8f0"), width: "100%", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, border: "1px solid rgba(255,255,255,0.15)", padding: 16, fontSize: 15, borderRadius: 14 }}>
                <div style={{ width: 24, height: 24, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#4285f4" }}>G</div>
                Continue with Google
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                <span style={{ color: "#334155", fontSize: 12 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              </div>
              <div style={{ ...styles.glass(), padding: 22 }}>
                <div style={{ display: "flex", marginBottom: 16, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4 }}>
                  {["login", "register"].map(m => (
                    <button key={m} onClick={() => setAuthMode(m)} style={{ flex: 1, padding: "9px 0", background: authMode === m ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent", border: "none", borderRadius: 10, color: authMode === m ? "#fff" : "#64748b", cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s" }}>
                      {m === "login" ? "🔐 Login" : "📝 Register"}
                    </button>
                  ))}
                </div>
                {authMode === "register" && <input value={dn} onChange={e => setDn(e.target.value)} placeholder="Your Name" style={styles.inp} />}
                <input value={em} onChange={e => setEm(e.target.value)} placeholder="Email address" type="email" style={styles.inp} />
                <input value={pw} onChange={e => setPw(e.target.value)} placeholder="Password (minimum 6 characters)" type="password" style={styles.inp} />
                {authErr && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 12px", color: "#ef4444", fontSize: 13, marginBottom: 10 }}>{authErr}</div>}
                <button onClick={loginEmail} disabled={authLoading} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width: "100%", padding: 14, fontSize: 14, borderRadius: 12, marginBottom: 12 }}>
                  {authLoading ? "⏳ Please wait..." : authMode === "login" ? "🔐 Sign In" : "✅ Create Account"}
                </button>
                
                {/* Forgot Password Link */}
                {authMode === "login" && (
                  <button onClick={() => setShowForgotPassword(true)} style={{ background: "none", border: "none", color: "#6366f1", fontSize: 12, cursor: "pointer", textDecoration: "underline", marginTop: 8 }}>
                    Forgot Password?
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ ...styles.glass(), padding: 22 }}>
              <h3 style={{ marginBottom: 16, color: "#c7d2fe" }}>Reset Password</h3>
              <input 
                value={forgotPasswordEmail} 
                onChange={e => setForgotPasswordEmail(e.target.value)} 
                placeholder="Enter your email address" 
                type="email" 
                style={styles.inp} 
              />
              {forgotPasswordMsg && <div style={{ background: forgotPasswordMsg.includes("✅") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${forgotPasswordMsg.includes("✅") ? "#10b981" : "#ef4444"}`, borderRadius: 10, padding: "10px 12px", color: forgotPasswordMsg.includes("✅") ? "#10b981" : "#ef4444", fontSize: 13, marginBottom: 10 }}>{forgotPasswordMsg}</div>}
              <button onClick={handleForgotPassword} disabled={authLoading} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width: "100%", padding: 14, fontSize: 14, borderRadius: 12, marginBottom: 12 }}>
                {authLoading ? "⏳ Sending..." : "📧 Send Reset Email"}
              </button>
              <button onClick={() => { setShowForgotPassword(false); setForgotPasswordMsg(""); setForgotPasswordEmail(""); }} style={{ ...styles.btn("rgba(255,255,255,0.08)", "#94a3b8"), width: "100%", padding: 12, fontSize: 13 }}>
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Bottom Navigation Component
  const BottomNav = () => (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(5,5,15,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "8px 0 12px", zIndex: 100 }}>
      {[["home", "🏠", "Home"], ["contribute", "✍️", "Contribute"], ["battle_select", "⚔️", "Battle"], ["forum", "💬", "Forum"], ["myprogress", "📊", "Progress"]].map(([s, icon, label]) => (
        <button key={s} onClick={() => goTo(s)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 12px", background: "none", border: "none", cursor: "pointer", color: screen === s ? "#a5b4fc" : "#475569", transition: "color 0.2s" }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
        </button>
      ))}
    </div>
  );

  // Back Button Component
  const BackBtn = ({ label = "← Back" }) => (
    <button onClick={goBack} style={{ ...styles.btn("rgba(255,255,255,0.06)", "#94a3b8"), padding: "8px 14px", fontSize: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
      ← {label}
    </button>
  );

  // Header Component
  const Header = () => (
    <div style={{ background: "linear-gradient(135deg,rgba(19,16,58,0.95),rgba(30,27,75,0.95))", backdropFilter: "blur(20px)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(99,102,241,0.2)", position: "sticky", top: 0, zIndex: 100 }}>
      <div onClick={() => goTo("home")} style={{ cursor: "pointer" }}>
        <div style={{ fontSize: 15, fontWeight: 800, background: "linear-gradient(135deg,#a5b4fc,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>🎓 PSC Quiz Kerala</div>
        <div style={{ fontSize: 10, color: "#4f46e5", marginTop: 1 }}>Hi, {user?.displayName || user?.email?.split("@")[0]}! {isSuperAdmin ? "👑" : isAdmin ? "🛡️" : ""}</div>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {isAdmin && (
          <button onClick={() => goTo("admin")} style={{ ...styles.btn("rgba(251,191,36,0.15)", "#fbbf24"), padding: "6px 10px", fontSize: 12, position: "relative" }}>
            👑{pendingQ.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{pendingQ.length}</span>}
          </button>
        )}
        <button onClick={logout} style={{ ...styles.btn("rgba(255,255,255,0.06)", "#94a3b8"), padding: "6px 10px", fontSize: 12 }}>🚪</button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes pop{from{transform:scale(0.93);opacity:0}to{transform:scale(1);opacity:1}}.pop{animation:pop 0.25s cubic-bezier(.34,1.56,.64,1)}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}.blink{animation:blink 0.7s infinite}@keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}.slideDown{animation:slideDown 0.3s ease}input,select,textarea{font-family:inherit}input:focus,select:focus{outline:none;border-color:#6366f1!important}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#4f46e5;border-radius:3px}.forum-message{border-radius:16px;max-width:85%;word-wrap:break-word}.forum-own{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;margin-left:auto}.forum-other{background:rgba(255,255,255,0.08);color:#e2e8f0}`}</style>

      {notif && (
        <div className="slideDown" style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: notif.type === "error" ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#10b981,#059669)", color: "#fff", padding: "10px 22px", borderRadius: 30, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
          {notif.msg}
        </div>
      )}

      <Header />
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "0 14px 90px" }}>
        
        {/* HOME SCREEN */}
        {screen === "home" && (
          <div className="pop">
            <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
              <div style={{ fontSize: 48, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(99,102,241,0.5))" }}>🎯</div>
              <h1 style={{ fontSize: 20, fontWeight: 900, background: "linear-gradient(135deg,#c7d2fe,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>Kerala PSC Exam Prep</h1>
              <p style={{ color: "#475569", fontSize: 12 }}>{allQ.length} Questions • {categories.length} Categories • Community Powered 🔥</p>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[{ l: "Questions", v: allQ.length, i: "📝", c: "#6366f1" }, { l: "Categories", v: categories.length, i: "📚", c: "#8b5cf6" }, { l: "My Best", v: Object.values(myStats).reduce((a, s) => Math.max(a, s.best || 0), 0), i: "🏆", c: "#f59e0b" }].map((x, i) => (
                <div key={i} style={{ ...styles.card(), flex: 1, padding: "12px 6px", textAlign: "center", borderTop: `2px solid ${x.c}` }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{x.i}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: x.c }}>{x.v}</div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{x.l}</div>
                </div>
              ))}
            </div>

            <div style={{ ...styles.glass(), padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>📊 Questions per Quiz:</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => setQuizCount(n)} style={{ flex: 1, padding: "8px 0", background: quizCount === n ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.05)", border: `1px solid ${quizCount === n ? "#6366f1" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: quizCount === n ? "#fff" : "#64748b", cursor: "pointer", fontWeight: 800, fontSize: 14, transition: "all 0.2s" }}>{n}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => startQuiz("mock")} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 10px", background: "linear-gradient(135deg,rgba(236,72,153,0.15),rgba(139,92,246,0.1))", border: "1px solid rgba(236,72,153,0.25)", borderRadius: 14, cursor: "pointer" }}>
                <span style={{ fontSize: 28 }}>🎯</span>
                <span style={{ fontWeight: 700, color: "#f0abfc", fontSize: 13 }}>Mock Test</span>
                <span style={{ color: "#475569", fontSize: 10 }}>{quizCount} Random Q</span>
              </button>
              <button onClick={() => goTo("battle_select")} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 10px", background: "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(245,158,11,0.1))", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, cursor: "pointer" }}>
                <span style={{ fontSize: 28 }}>⚔️</span>
                <span style={{ fontWeight: 700, color: "#fca5a5", fontSize: 13 }}>Quiz Battle</span>
                <span style={{ color: "#475569", fontSize: 10 }}>1v1 • Multi • Random</span>
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#475569", marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>📚 Categories</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {categories.map(cat => {
                const qCount = allQ.filter(q => q.cat === cat.id).length;
                const best = myStats[cat.id]?.best || 0;
                return (
                  <button key={cat.id} onClick={() => startQuiz(cat.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)`, borderLeft: `3px solid ${cat.color}`, borderRadius: 13, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                    <span style={{ fontSize: 22, width: 36, height: 36, background: `${cat.color}20`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{cat.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{cat.label}</div>
                      {best > 0 && <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>Best: {best}/{quizCount} • {myStats[cat.id]?.attempts || 0}x played</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ background: `${cat.color}25`, color: cat.color, borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>{qCount}Q</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* QUIZ SCREEN */}
        {screen === "quiz" && questions[curr] && (() => {
          const q = questions[curr];
          const catInfo = categories.find(c => c.id === q.cat) || { label: q.cat, icon: "📋", color: "#6366f1" };
          const pct = Math.round((curr / questions.length) * 100);
          return (
            <div className="pop" style={{ paddingTop: 14 }}>
              <div style={{ ...styles.glass(), padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <span style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 13 }}>{curr + 1}</span>
                    <span style={{ color: "#475569", fontSize: 13 }}>/{questions.length}</span>
                    <span style={{ color: "#64748b", fontSize: 11, marginLeft: 6 }}>{catInfo.icon} {catInfo.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, padding: "3px 10px", color: "#10b981", fontWeight: 700, fontSize: 12 }}>✅ {score}</div>
                    <div className={timer <= 5 ? "blink" : ""} style={{ background: timer <= 5 ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.12)", border: `1px solid ${timer <= 5 ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`, borderRadius: 20, padding: "3px 10px", color: timer <= 5 ? "#ef4444" : "#a5b4fc", fontWeight: 800, fontSize: 13 }}>⏱{timer}</div>
                  </div>
                </div>
                <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 5 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${catInfo.color},#a855f7)`, borderRadius: 5, transition: "width 0.5s ease" }} />
                </div>
              </div>

              <div style={{ ...styles.card(), padding: 18, marginBottom: 12, background: `linear-gradient(135deg,${catInfo.color}12,rgba(168,85,247,0.06))`, borderColor: `${catInfo.color}25` }}>
                <div style={{ fontSize: 10, color: catInfo.color, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>{catInfo.icon} {catInfo.label}</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.65 }}>{q.q}</p>
                {q.qm && <p style={{ fontSize: 13, color: "#64748b", marginTop: 7, lineHeight: 1.55 }}>{q.qm}</p>}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {q.options.map((opt, i) => {
                  let bg = "rgba(255,255,255,0.04)", bdr = "rgba(255,255,255,0.09)", col = "#e2e8f0", icon = "";
                  if (picked !== null) {
                    if (i === q.answer) { bg = "rgba(16,185,129,0.14)"; bdr = "#10b981"; col = "#10b981"; icon = "✅"; }
                    else if (i === picked && picked !== q.answer) { bg = "rgba(239,68,68,0.14)"; bdr = "#ef4444"; col = "#ef4444"; icon = "❌"; }
                    else { bg = "rgba(255,255,255,0.02)"; col = "#64748b"; }
                  }
                  return (
                    <button key={i} onClick={() => handleAns(i)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 15px", background: bg, border: `1.5px solid ${bdr}`, borderRadius: 12, color: col, textAlign: "left", fontSize: 14, cursor: picked === null ? "pointer" : "default", lineHeight: 1.5, transition: "all 0.2s" }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: `${bdr}30`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0, border: `1px solid ${bdr}` }}>{["A", "B", "C", "D"][i]}</span>
                      <span style={{ flex: 1 }}>{opt}</span>
                      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
                    </button>
                  );
                })}
              </div>

              {picked !== null && (
                <div className="pop">
                  {q.explanation && (
                    <div style={{ ...styles.card(), padding: 12, marginBottom: 10, borderLeft: "3px solid #f59e0b", background: "rgba(245,158,11,0.06)" }}>
                      <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 4, fontWeight: 700 }}>💡 Explanation</div>
                      <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{q.explanation}</div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => reportQ(q.id, q.q)} style={{ ...styles.btn("rgba(239,68,68,0.1)", "#ef4444"), padding: "10px 14px", fontSize: 12 }}>🚩 Report</button>
                    <button onClick={nextQ} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), flex: 1, padding: 12 }}>{curr + 1 >= questions.length ? "📊 See Result →" : "Next Question →"}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* RESULT SCREEN */}
        {screen === "result" && (
          <div className="pop" style={{ paddingTop: 18 }}>
            <BackBtn label="Home" />
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 64, marginBottom: 8, filter: `drop-shadow(0 0 30px ${score >= questions.length * 0.8 ? "#f59e0b" : score >= questions.length * 0.5 ? "#10b981" : "#6366f1"})` }}>{score >= questions.length * 0.8 ? "🏆" : score >= questions.length * 0.5 ? "🎉" : "💪"}</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#c7d2fe", marginBottom: 8 }}>Quiz Complete!</h2>
              <div style={{ fontSize: 52, fontWeight: 900, background: "linear-gradient(135deg,#6366f1,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "8px 0" }}>{score}<span style={{ fontSize: 24, opacity: 0.5 }}>/{questions.length}</span></div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, padding: "5px 16px", color: "#10b981", fontWeight: 700, fontSize: 13 }}>Accuracy: {Math.round((score / questions.length) * 100)}%</div>
              </div>
            </div>
            <h3 style={{ fontSize: 11, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Answer Review</h3>
            {answers.map((a, i) => (
              <div key={i} style={{ ...styles.card(), padding: 11, marginBottom: 6, borderLeft: `3px solid ${a.ok ? "#10b981" : "#ef4444"}` }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>Q{i + 1}: {a.q.q}</div>
                <div style={{ fontSize: 12, color: a.ok ? "#10b981" : "#ef4444", marginBottom: a.q.explanation && !a.ok ? 4 : 0 }}>{a.ok ? "✅" : "❌"} {a.sel === -1 ? "⏱ Time out" : a.q.options[a.sel]}{!a.ok && a.sel !== -1 && <span style={{ color: "#10b981" }}> → {a.q.options[a.q.answer]}</span>}</div>
                {a.q.explanation && !a.ok && <div style={{ fontSize: 11, color: "#475569" }}>💡 {a.q.explanation}</div>}
                <button onClick={() => reportQ(a.q.id, a.q.q)} style={{ fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}>🚩 Report</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => startQuiz(selCat)} style={{ ...styles.btn("rgba(99,102,241,0.15)", "#a5b4fc"), flex: 1 }}>🔄 Again</button>
              <button onClick={() => { setScreen("home"); setHistory(["home"]); }} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), flex: 1 }}>🏠 Home</button>
            </div>
          </div>
        )}

        {/* BATTLE SELECT SCREEN */}
        {screen === "battle_select" && (
          <div className="pop" style={{ paddingTop: 18 }}>
            <BackBtn />
            <h2 style={{ fontSize: 20, fontWeight: 900, background: "linear-gradient(135deg,#fca5a5,#f87171)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>⚔️ Quiz Battle</h2>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 20 }}>Choose your battle mode!</p>

            <div style={{ ...styles.glass(), padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>📊 Questions per Battle:</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[5, 10, 15, 20].map(n => <button key={n} onClick={() => setQuizCount(n)} style={{ flex: 1, padding: "8px 0", background: quizCount === n ? "linear-gradient(135deg,#ef4444,#f97316)" : "rgba(255,255,255,0.05)", border: `1px solid ${quizCount === n ? "#ef4444" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: quizCount === n ? "#fff" : "#64748b", cursor: "pointer", fontWeight: 800, fontSize: 14 }}>{n}</button>)}
              </div>
            </div>

            {[
              { type: "1v1", icon: "🤺", title: "1 vs 1", subtitle: "Challenge your friend with a room code", color: "#6366f1", desc: "Private Battle" },
              { type: "multi", icon: "👥", title: "Multiplayer", subtitle: "Up to 100 players at the same time!", color: "#10b981", desc: "Up to 100 Players" },
              { type: "random", icon: "🎲", title: "Random Match", subtitle: "Find random opponent online", color: "#f59e0b", desc: "vs AI if no players" },
            ].map(b => (
              <button key={b.type} onClick={() => { setBattleType(b.type); goTo("battle_lobby"); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 16px", background: `linear-gradient(135deg,${b.color}15,${b.color}08)`, border: `1px solid ${b.color}30`, borderRadius: 16, cursor: "pointer", textAlign: "left", width: "100%", marginBottom: 10, transition: "all 0.2s" }}>
                <div style={{ width: 52, height: 52, background: `${b.color}20`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{b.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: "#f1f5f9", fontSize: 16, marginBottom: 3 }}>{b.title}</div>
                  <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.4 }}>{b.subtitle}</div>
                </div>
                <div style={{ background: `${b.color}20`, color: b.color, borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 700 }}>{b.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* BATTLE LOBBY SCREEN */}
        {screen === "battle_lobby" && (
          <div className="pop" style={{ paddingTop: 18 }}>
            <BackBtn />
            <h2 style={{ fontSize: 19, fontWeight: 900, color: "#c7d2fe", marginBottom: 4 }}>⚔️ {battleType === "1v1" ? "1 vs 1" : battleType === "multi" ? "Multiplayer" : "Random Match"}</h2>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 16 }}>{battleType === "random" ? "Find random opponent" : "Create or join a room"}</p>

            {battleType !== "random" && (
              <>
                <div style={{ ...styles.card(), padding: 16, marginBottom: 10, borderLeft: "3px solid #6366f1" }}>
                  <div style={{ fontWeight: 700, color: "#a5b4fc", marginBottom: 8 }}>🆕 Create Room</div>
                  <button onClick={() => createRoom(battleType)} disabled={battleLoading} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width: "100%" }}>
                    {battleLoading ? "⏳ Creating..." : "🎮 Create Room"}
                  </button>
                </div>
                <div style={{ ...styles.card(), padding: 16, borderLeft: "3px solid #10b981" }}>
                  <div style={{ fontWeight: 700, color: "#10b981", marginBottom: 8 }}>🔗 Join Room</div>
                  <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ROOM CODE" style={{ ...styles.inp, textTransform: "uppercase", letterSpacing: 6, textAlign: "center", fontSize: 22, fontWeight: 900 }} />
                  {roomErr && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{roomErr}</div>}
                  <button onClick={joinRoom} disabled={battleLoading} style={{ ...styles.btn("#10b981"), width: "100%" }}>
                    {battleLoading ? "⏳ Joining..." : "🚀 Join"}
                  </button>
                </div>
              </>
            )}

            {battleType === "random" && (
              <div style={{ ...styles.card(), padding: 24, textAlign: "center" }}>
                {waitingRandom ? (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                    <h3 style={{ color: "#a5b4fc", marginBottom: 8 }}>Searching for opponent...</h3>
                    <p style={{ color: "#475569", fontSize: 13, marginBottom: 16 }}>If no player found in 10 seconds, you'll play against AI!</p>
                    <div style={{ width: 60, height: 4, background: "linear-gradient(90deg,#6366f1,#a855f7)", borderRadius: 4, margin: "0 auto", animation: "load 1.5s ease infinite" }} />
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
                    <h3 style={{ color: "#c7d2fe", marginBottom: 8 }}>Random Match</h3>
                    <p style={{ color: "#475569", fontSize: 13, marginBottom: 16 }}>Find random opponent from online players. If no one found, AI opponent!</p>
                    <button onClick={findRandom} disabled={battleLoading} style={{ ...styles.btn("linear-gradient(135deg,#f59e0b,#ef4444)"), width: "100%", padding: 14, fontSize: 15 }}>
                      {battleLoading ? "⏳ Finding..." : "🎲 Find Opponent!"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ROOM SCREEN */}
        {screen === "room" && (
          <div className="pop" style={{ paddingTop: 14 }}>
            <BackBtn label="Leave Room" />
            <div style={{ ...styles.glass(), padding: 20, marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>Room Code</div>
              <div style={{ fontSize: 36, fontWeight: 900, background: "linear-gradient(135deg,#a5b4fc,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 8, margin: "4px 0" }}>{roomCode}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>Share this code with friends!</div>
            </div>

            <div style={{ ...styles.card(), padding: 14, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 10, fontSize: 13 }}>
                Players ({Object.keys(roomData?.players || {}).length}/{roomData?.maxPlayers || 2})
              </div>
              {Object.entries(roomData?.players || {}).map(([uid, p]) => (
                <div key={uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>{p.isComputer ? "🤖" : p.avatar || "U"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: uid === user?.uid ? "#a5b4fc" : "#e2e8f0" }}>{p.name} {uid === user?.uid ? "(You)" : ""}</div>
                    {p.isComputer && <div style={{ fontSize: 10, color: "#f59e0b" }}>AI Opponent • 65% accuracy</div>}
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} />
                </div>
              ))}
            </div>

            {(roomData?.hostUid === user?.uid) && (
              <button onClick={startBattleGame} disabled={battleLoading} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width: "100%", padding: 14, fontSize: 15, marginBottom: 10 }}>
                {battleLoading ? "⏳ Starting..." : `🚀 Start Battle! (${Object.keys(roomData?.players || {}).length} players)`}
              </button>
            )}
            {roomData?.hostUid !== user?.uid && <div style={{ textAlign: "center", color: "#475569", fontSize: 13, padding: 14 }}>⏳ Waiting for host to start the battle...</div>}
          </div>
        )}

        {/* BATTLE SCREEN */}
        {screen === "battle" && battleQ[battleCurr] && (() => {
          const q = battleQ[battleCurr];
          const players = roomData?.players || {};
          return (
            <div className="pop" style={{ paddingTop: 10 }}>
              <div style={{ ...styles.glass(), padding: "10px 12px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 700 }}>Q{battleCurr + 1}/{battleQ.length}</div>
                <div className={battleTimer <= 5 ? "blink" : ""} style={{ background: battleTimer <= 5 ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.15)", border: `1px solid ${battleTimer <= 5 ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.3)"}`, borderRadius: 20, padding: "4px 14px", color: battleTimer <= 5 ? "#ef4444" : "#a5b4fc", fontWeight: 900, fontSize: 16 }}>⏱ {battleTimer}</div>
                <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>Score: {battleScore}</div>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {Object.entries(players).slice(0, 4).map(([uid, p]) => (
                  <div key={uid} style={{ flex: 1, ...styles.card(), padding: "8px 6px", textAlign: "center", borderTop: `2px solid ${uid === user?.uid ? "#6366f1" : "#ef4444"}` }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{p.isComputer ? "🤖" : p.avatar || "👤"}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: uid === user?.uid ? "#a5b4fc" : "#e2e8f0" }}>{p.score || 0}</div>
                    <div style={{ fontSize: 9, color: "#475569", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{uid === user?.uid ? "You" : p.name.split(" ")[0]}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...styles.card(), padding: 16, marginBottom: 10, background: "rgba(99,102,241,0.07)", borderColor: "rgba(99,102,241,0.15)" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.6 }}>{q.q}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
                {q.options.map((opt, i) => {
                  let bg = "rgba(255,255,255,0.04)", bdr = "rgba(255,255,255,0.09)", col = "#e2e8f0";
                  if (battlePicked !== null) {
                    if (i === q.answer) { bg = "rgba(16,185,129,0.14)"; bdr = "#10b981"; col = "#10b981"; }
                    else if (i === battlePicked) { bg = "rgba(239,68,68,0.14)"; bdr = "#ef4444"; col = "#ef4444"; }
                  }
                  return (
                    <button key={i} onClick={() => handleBattleAns(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: bg, border: `1.5px solid ${bdr}`, borderRadius: 12, color: col, textAlign: "left", fontSize: 13, cursor: battlePicked === null ? "pointer" : "default", transition: "all 0.2s" }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: `${bdr}30`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{["A", "B", "C", "D"][i]}</span>{opt}
                    </button>
                  );
                })}
              </div>

              {battlePicked !== null && <button onClick={nextBattle} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width: "100%", padding: 12, marginBottom: 10 }}>{battleCurr + 1 >= battleQ.length ? "🏆 See Results" : "Next →"}</button>}

              <div style={{ ...styles.card(), padding: 12 }}>
                <div style={{ fontWeight: 700, color: "#64748b", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>💬 Battle Chat</div>
                <div style={{ height: 80, overflowY: "auto", marginBottom: 8 }}>
                  {chatMessages.length === 0 && <div style={{ color: "#334155", fontSize: 11, textAlign: "center", padding: "10px 0" }}>No messages yet...</div>}
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ fontSize: 11, marginBottom: 4, color: m.uid === user?.uid ? "#a5b4fc" : "#94a3b8" }}>
                      <strong>{m.uid === user?.uid ? "You" : m.name}:</strong> {m.msg}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Message..." style={{ ...styles.inp, marginBottom: 0, flex: 1, padding: "8px 12px", fontSize: 12 }} />
                  <button onClick={sendChat} style={{ ...styles.btn("rgba(99,102,241,0.2)", "#a5b4fc"), padding: "8px 12px", fontSize: 12 }}>Send</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* BATTLE RESULT SCREEN */}
        {screen === "battle_result" && (
          <div className="pop" style={{ paddingTop: 18, textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#c7d2fe", marginBottom: 16 }}>Battle Over!</h2>
            <div style={{ ...styles.card(), padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>Final Scores</div>
              {Object.entries(roomData?.players || {}).sort((a, b) => b[1].score - a[1].score).map(([uid, p], i) => (
                <div key={uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: 20, width: 28 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                  <div style={{ flex: 1, textAlign: "left", fontWeight: 700, color: uid === user?.uid ? "#a5b4fc" : "#e2e8f0" }}>{p.name} {uid === user?.uid ? "(You)" : ""}</div>
                  <div style={{ fontWeight: 900, color: "#6366f1", fontSize: 20 }}>{p.score || 0}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { cleanupRoomListeners(); goTo("battle_select"); }} style={{ ...styles.btn("rgba(99,102,241,0.15)", "#a5b4fc"), flex: 1 }}>🔄 Play Again</button>
              <button onClick={() => { cleanupRoomListeners(); setScreen("home"); setHistory(["home"]); }} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), flex: 1 }}>🏠 Home</button>
            </div>
          </div>
        )}

        {/* CONTRIBUTE SCREEN */}
        {screen === "contribute" && (
          <div className="pop" style={{ paddingTop: 16 }}>
            <BackBtn />
            <h2 style={{ fontSize: 19, fontWeight: 900, color: "#10b981", marginBottom: 4 }}>✍️ Contribute a Question</h2>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 14 }}>Submit → Admin reviews → Published to all users! 🎉</p>

            {myContributions.length > 0 && (
              <div style={{ ...styles.glass(), padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#e2e8f0", marginBottom: 8 }}>My Submissions ({myContributions.length})</div>
                {myContributions.slice(0, 3).map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ flex: 1, fontSize: 12, color: "#94a3b8" }}>{c.q?.substring(0, 35)}...</div>
                    <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.status === "approved" ? "rgba(16,185,129,0.15)" : c.status === "rejected" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color: c.status === "approved" ? "#10b981" : c.status === "rejected" ? "#ef4444" : "#f59e0b" }}>
                      {c.status === "approved" ? "✅" : c.status === "rejected" ? "❌" : "⏳"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...styles.card(), padding: 16, borderLeft: "3px solid #10b981" }}>
              <input value={contributeQ.q} onChange={e => setContributeQ({ ...contributeQ, q: e.target.value })} placeholder="Question (English) *" style={styles.inp} />
              <input value={contributeQ.qm} onChange={e => setContributeQ({ ...contributeQ, qm: e.target.value })} placeholder="Question (Malayalam) — Optional" style={styles.inp} />
              {["o1", "o2", "o3", "o4"].map((k, i) => <input key={k} value={contributeQ[k]} onChange={e => setContributeQ({ ...contributeQ, [k]: e.target.value })} placeholder={`Option ${["A", "B", "C", "D"][i]} *`} style={styles.inp} />)}
              <input value={contributeQ.explanation} onChange={e => setContributeQ({ ...contributeQ, explanation: e.target.value })} placeholder="💡 Explanation (Why is this the answer?)" style={styles.inp} />
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <select value={contributeQ.answer} onChange={e => setContributeQ({ ...contributeQ, answer: e.target.value })} style={{ ...styles.sel, flex: 1, marginBottom: 0 }}>
                  <option value="0">✅ Answer: A</option><option value="1">✅ Answer: B</option><option value="2">✅ Answer: C</option><option value="3">✅ Answer: D</option>
                </select>
                <select value={contributeQ.cat} onChange={e => setContributeQ({ ...contributeQ, cat: e.target.value })} style={{ ...styles.sel, flex: 1, marginBottom: 0 }}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              {contribStatus && <div style={{ fontSize: 13, marginBottom: 10, color: contribStatus.includes("✅") ? "#10b981" : "#ef4444" }}>{contribStatus}</div>}
              <button onClick={submitContribution} style={{ ...styles.btn("linear-gradient(135deg,#10b981,#06b6d4)"), width: "100%", padding: 13, fontSize: 14 }}>✍️ Submit for Review</button>
            </div>
          </div>
        )}

        {/* ADMIN SCREEN */}
        {screen === "admin" && isAdmin && (
          <div className="pop" style={{ paddingTop: 16 }}>
            <BackBtn />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 28 }}>👑</div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "#fbbf24", marginBottom: 2 }}>Admin Panel</h2>
                <p style={{ color: "#475569", fontSize: 11 }}>{isSuperAdmin ? "Super Admin — Full Access" : "Admin — Approve/Reject Only"}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
              {[["pending", `⏳ Pending (${pendingQ.length})`], ["reports", "🚩 Reports"], ["json", "📦 JSON Import"], isSuperAdmin && ["addq", "➕ Add Q"], isSuperAdmin && ["cats", "📁 Categories"], isSuperAdmin && ["admins", "👑 Admins"], isSuperAdmin && ["members", "🟢 Members"]].filter(Boolean).map(([t, l]) => (
                <button key={t} onClick={() => setAdminTab(t)} style={{ padding: "7px 12px", background: adminTab === t ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.06)", border: `1px solid ${adminTab === t ? "#6366f1" : "rgba(255,255,255,0.1)"}`, borderRadius: 20, color: adminTab === t ? "#fff" : "#64748b", cursor: "pointer", fontWeight: 700, fontSize: 11, transition: "all 0.2s" }}>
                  {l}
                </button>
              ))}
            </div>

            {/* JSON IMPORT TAB */}
            {adminTab === "json" && (
              <div style={{ ...styles.card(), padding: 20, borderLeft: "3px solid #10b981" }}>
                <div style={{ fontWeight: 700, color: "#10b981", marginBottom: 10, fontSize: 16 }}>📦 JSON File Import</div>
                <p style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>
                  Upload a JSON file with questions. Format: Array of objects with 'q', 'options', 'answer', 'explanation' fields.
                </p>
                
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>📚 Select Category:</div>
                  <select value={jsonCategory} onChange={e => setJsonCategory(e.target.value)} style={styles.sel}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>⭐ Select Difficulty:</div>
                  <select value={jsonDifficulty} onChange={e => setJsonDifficulty(e.target.value)} style={styles.sel}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                
                <div style={{ ...styles.glass(), padding: 16, marginBottom: 16, borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>📋 JSON Format Example:</div>
                  <pre style={{ background: "#0f0f1e", padding: 12, borderRadius: 8, fontSize: 11, overflowX: "auto", color: "#94a3b8" }}>
{`[
  {
    "q": "Which district in Kerala has the highest literacy rate?",
    "options": ["Thiruvananthapuram", "Kollam", "Kottayam", "Pathanamthitta"],
    "answer": 2,
    "explanation": "Kottayam is the first district to achieve 100% literacy"
  }
]`}
                  </pre>
                </div>
                
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <button onClick={downloadSampleJSON} style={{ ...styles.btn("rgba(99,102,241,0.2)", "#a5b4fc"), flex: 1, padding: "10px" }}>
                    📄 Download Sample JSON
                  </button>
                </div>
                
                <div style={{ border: "2px dashed rgba(16,185,129,0.3)", borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 12 }}>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importJSONFile}
                    style={{ display: "none" }}
                    id="jsonFileInput"
                  />
                  <label htmlFor="jsonFileInput" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 48 }}>📁</span>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>Click to select JSON file</span>
                  </label>
                </div>
                
                {jsonImportStatus && (
                  <div style={{ 
                    background: jsonImportStatus.includes("✅") ? "rgba(16,185,129,0.1)" : jsonImportStatus.includes("❌") ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)", 
                    border: `1px solid ${jsonImportStatus.includes("✅") ? "#10b981" : jsonImportStatus.includes("❌") ? "#ef4444" : "#6366f1"}`,
                    borderRadius: 10, 
                    padding: 12, 
                    marginTop: 12,
                    fontSize: 13,
                    color: jsonImportStatus.includes("✅") ? "#10b981" : jsonImportStatus.includes("❌") ? "#ef4444" : "#a5b4fc"
                  }}>
                    {jsonImportStatus}
                  </div>
                )}
              </div>
            )}

            {/* PENDING TAB */}
            {adminTab === "pending" && (
              <div>
                {pendingQ.length === 0 ? (
                  <div style={{ ...styles.card(), padding: 40, textAlign: "center", color: "#475569" }}>
                    <div style={{ fontSize: 40 }}>✅</div>
                    <p style={{ marginTop: 10 }}>No pending questions!</p>
                  </div>
                ) : (
                  pendingQ.map(pq => (
                    <div key={pq.id} style={{ ...styles.card(), padding: 14, marginBottom: 10, borderLeft: "3px solid #f59e0b" }}>
                      <div style={{ fontSize: 10, color: "#f59e0b", marginBottom: 6, fontWeight: 700 }}>⏳ By: {pq.submittedByName} • {categories.find(c => c.id === pq.cat)?.label || pq.cat}</div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{pq.q}</p>
                      {pq.qm && <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{pq.qm}</p>}
                      {pq.options.map((o, i) => <div key={i} style={{ fontSize: 12, color: i === pq.answer ? "#10b981" : "#94a3b8", padding: "3px 0" }}>{["A", "B", "C", "D"][i]}. {o} {i === pq.answer ? "✅" : ""}</div>)}
                      {pq.explanation && <p style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>💡 {pq.explanation}</p>}
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={() => approveQ(pq)} style={{ ...styles.btn("rgba(16,185,129,0.2)", "#10b981", { border: "1px solid rgba(16,185,129,0.4)" }), flex: 1, padding: "10px 0" }}>✅ Approve</button>
                        <button onClick={() => rejectQ(pq)} style={{ ...styles.btn("rgba(239,68,68,0.15)", "#ef4444", { border: "1px solid rgba(239,68,68,0.3)" }), flex: 1, padding: "10px 0" }}>❌ Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* REPORTS TAB */}
            {adminTab === "reports" && <ReportsPanel db={db} categories={categories} showNotif={showNotif} deleteQ={deleteQ} />}

            {/* ADD QUESTION TAB */}
            {adminTab === "addq" && isSuperAdmin && (
              <div style={{ ...styles.card(), padding: 14, borderLeft: "3px solid #6366f1" }}>
                <div style={{ fontWeight: 700, color: "#a5b4fc", marginBottom: 10 }}>➕ Add Question Directly</div>
                <input value={newQ.q} onChange={e => setNewQ({ ...newQ, q: e.target.value })} placeholder="Question (English) *" style={styles.inp} />
                <input value={newQ.qm} onChange={e => setNewQ({ ...newQ, qm: e.target.value })} placeholder="Question (Malayalam)" style={styles.inp} />
                {["o1", "o2", "o3", "o4"].map((k, i) => <input key={k} value={newQ[k]} onChange={e => setNewQ({ ...newQ, [k]: e.target.value })} placeholder={`Option ${["A", "B", "C", "D"][i]} *`} style={styles.inp} />)}
                <input value={newQ.explanation} onChange={e => setNewQ({ ...newQ, explanation: e.target.value })} placeholder="Explanation" style={styles.inp} />
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <select value={newQ.answer} onChange={e => setNewQ({ ...newQ, answer: e.target.value })} style={{ ...styles.sel, flex: 1, marginBottom: 0 }}>
                    <option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option>
                  </select>
                  <select value={newQ.cat} onChange={e => setNewQ({ ...newQ, cat: e.target.value })} style={{ ...styles.sel, flex: 1, marginBottom: 0 }}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                {addQStatus && <div style={{ color: addQStatus.includes("✅") ? "#10b981" : "#ef4444", fontSize: 13, marginBottom: 8 }}>{addQStatus}</div>}
                <button onClick={addDirectQ} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width: "100%" }}>➕ Add to Firebase</button>
              </div>
            )}

            {/* CATEGORIES TAB */}
            {adminTab === "cats" && isSuperAdmin && (
              <div>
                <div style={{ ...styles.card(), padding: 14, marginBottom: 10, borderLeft: "3px solid #6366f1" }}>
                  <div style={{ fontWeight: 700, color: "#a5b4fc", marginBottom: 10 }}>➕ Add New Category</div>
                  <input value={newCat.label} onChange={e => setNewCat({ ...newCat, label: e.target.value })} placeholder="Category Name *" style={styles.inp} />
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Icon:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>{ICONS.map(ic => <button key={ic} onClick={() => setNewCat({ ...newCat, icon: ic })} style={{ width: 34, height: 34, fontSize: 17, background: newCat.icon === ic ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)", border: `1px solid ${newCat.icon === ic ? "#6366f1" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, cursor: "pointer" }}>{ic}</button>)}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Color:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>{COLORS.map(cl => <button key={cl} onClick={() => setNewCat({ ...newCat, color: cl })} style={{ width: 28, height: 28, background: cl, borderRadius: "50%", border: `3px solid ${newCat.color === cl ? "#fff" : "transparent"}`, cursor: "pointer" }} />)}</div>
                  <button onClick={addCategory} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), width: "100%" }}>➕ Add Category</button>
                </div>
                <div style={{ ...styles.card(), padding: 14 }}>
                  <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 10 }}>Firebase Categories</div>
                  {categories.filter(c => !DEFAULT_CATS.find(d => d.id === c.id)).map(cat => (
                    <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 22, width: 36, height: 36, background: `${cat.color}20`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{cat.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{cat.label}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>{allQ.filter(q => q.cat === cat.id).length} questions</div>
                      </div>
                      <button onClick={() => deleteCat(cat.id)} style={{ ...styles.btn("rgba(239,68,68,0.1)", "#ef4444"), padding: "5px 9px", fontSize: 12 }}>🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADMINS TAB */}
            {adminTab === "admins" && isSuperAdmin && (
              <div>
                <div style={{ ...styles.card(), padding: 14, marginBottom: 10, borderLeft: "3px solid #fbbf24" }}>
                  <div style={{ fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>👑 Add New Admin</div>
                  <p style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>User with this email will be able to approve/reject questions (No super admin access)</p>
                  <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="admin@email.com" type="email" style={styles.inp} />
                  {adminStatus && <div style={{ color: adminStatus.includes("✅") ? "#10b981" : "#ef4444", fontSize: 13, marginBottom: 8 }}>{adminStatus}</div>}
                  <button onClick={addAdmin} style={{ ...styles.btn("linear-gradient(135deg,#f59e0b,#fbbf24)", "#000"), width: "100%" }}>👑 Make Admin</button>
                </div>
                <div style={{ ...styles.card(), padding: 14 }}>
                  <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 10 }}>Current Admins</div>
                  <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 700 }}>👑 {SUPER_ADMIN}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>Super Admin — Cannot be removed</div>
                  </div>
                  {adminList.map(a => (
                    <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>🛡️ {a.email}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>Can approve/reject questions only</div>
                      </div>
                      <button onClick={() => removeAdmin(a.key)} style={{ ...styles.btn("rgba(239,68,68,0.1)", "#ef4444"), padding: "5px 9px", fontSize: 11 }}>Remove</button>
                    </div>
                  ))}
                  {adminList.length === 0 && <p style={{ color: "#475569", fontSize: 12, marginTop: 8 }}>No additional admins yet.</p>}
                </div>
              </div>
            )}

            {/* MEMBERS TAB */}
            {adminTab === "members" && isSuperAdmin && <MembersPanel db={db} activeMembers={activeMembers} />}
          </div>
        )}

        {/* FORUM SCREEN - WhatsApp Style */}
        {screen === "forum" && (
          <div className="pop" style={{ paddingTop: 16 }}>
            <h2 style={{ fontSize: 19, fontWeight: 900, background: "linear-gradient(135deg,#a5b4fc,#e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>💬 Discussion Forum</h2>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 14 }}>PSC students community • Share knowledge, ask doubts!</p>

            {/* Category Filter */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 14 }}>
              {[{ id: "all", label: "All", icon: "🌐", color: "#6366f1" }, ...FORUM_CATS].map(cat => (
                <button key={cat.id} onClick={() => setForumCategory(cat.id)} style={{ flexShrink: 0, padding: "6px 12px", background: forumCategory === cat.id ? `${cat.color}30` : "rgba(255,255,255,0.05)", border: `1px solid ${forumCategory === cat.id ? cat.color : "rgba(255,255,255,0.1)"}`, borderRadius: 20, color: forumCategory === cat.id ? cat.color : "#64748b", cursor: "pointer", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* New Post Box */}
            <div style={{ ...styles.glass(), padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                </div>
                <textarea
                  value={forumMsg}
                  onChange={e => setForumMsg(e.target.value)}
                  placeholder="Type your message here..."
                  rows={2}
                  style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "12px 16px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                <select value={forumCategory === "all" ? "general" : forumCategory} onChange={e => setForumCategory(e.target.value)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "6px 12px", color: "#94a3b8", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                  {FORUM_CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
                <button onClick={sendForumPost} disabled={!forumMsg.trim()} style={{ background: forumMsg.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.06)", color: forumMsg.trim() ? "#fff" : "#475569", border: "none", borderRadius: 20, padding: "8px 20px", cursor: forumMsg.trim() ? "pointer" : "default", fontWeight: 600, fontSize: 13, fontFamily: "inherit", transition: "all 0.2s" }}>
                  Send 📤
                </button>
              </div>
            </div>

            {/* Posts - WhatsApp Style Chat */}
            {!forumLoaded && <div style={{ textAlign: "center", padding: 20, color: "#475569" }}>Loading...</div>}
            {forumLoaded && forumPosts.length === 0 && <div style={{ ...styles.card(), padding: 40, textAlign: "center", color: "#475569" }}><div style={{ fontSize: 40 }}>💬</div><p style={{ marginTop: 10 }}>No posts yet! Be the first to post!</p></div>}
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {forumPosts
                .filter(p => forumCategory === "all" || p.category === forumCategory)
                .map(post => {
                  const catInfo = FORUM_CATS.find(c => c.id === post.category) || { icon: "💬", color: "#6366f1", label: "General" };
                  const isOwn = post.uid === user?.uid;
                  const timeAgo = (ts) => {
                    const diff = Date.now() - ts;
                    if (diff < 60000) return "just now";
                    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                    return `${Math.floor(diff / 86400000)}d ago`;
                  };
                  
                  return (
                    <div key={post.id} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", marginBottom: 8 }}>
                      <div style={{ maxWidth: "85%", width: "auto" }}>
                        {/* Message Bubble */}
                        <div style={{
                          background: isOwn ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.08)",
                          borderRadius: 20,
                          borderTopRightRadius: isOwn ? 4 : 20,
                          borderTopLeftRadius: isOwn ? 20 : 4,
                          padding: "10px 14px",
                          marginBottom: 4
                        }}>
                          {!isOwn && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <div style={{ width: 24, height: 24, borderRadius: 12, background: `linear-gradient(135deg,${catInfo.color},${catInfo.color}aa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                                {post.avatar || post.name[0].toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 700, fontSize: 12, color: "#a5b4fc" }}>{post.name}</span>
                              <span style={{ fontSize: 9, background: `${catInfo.color}20`, color: catInfo.color, padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>{catInfo.label}</span>
                            </div>
                          )}
                          {isOwn && (
                            <div style={{ fontSize: 10, color: "#a5b4fc", marginBottom: 4, textAlign: "right" }}>You</div>
                          )}
                          <p style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.5, wordWrap: "break-word", margin: 0 }}>{post.msg}</p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: isOwn ? "flex-end" : "flex-start", gap: 8, marginTop: 6 }}>
                            <span style={{ fontSize: 10, color: "#64748b" }}>{timeAgo(post.time)}</span>
                            <button onClick={() => likePost(post)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                              👍 {post.likes || 0}
                            </button>
                            <button onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11 }}>
                              💬 Reply
                            </button>
                            {(isOwn || isAdmin) && (
                              <button onClick={() => deleteForumPost(post.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11 }}>
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Replies */}
                        {post.replies && post.replies.length > 0 && (
                          <div style={{ marginLeft: isOwn ? 0 : 40, marginTop: 4, marginBottom: 4 }}>
                            {post.replies.map((reply, idx) => (
                              <div key={idx} style={{
                                background: reply.uid === user?.uid ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                                borderRadius: 16,
                                padding: "8px 12px",
                                marginBottom: 6,
                                marginLeft: reply.uid === user?.uid ? "auto" : 0,
                                marginRight: reply.uid === user?.uid ? 0 : "auto",
                                maxWidth: "90%",
                                width: "fit-content"
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                  <span style={{ fontWeight: 600, fontSize: 11, color: reply.uid === user?.uid ? "#a5b4fc" : "#94a3b8" }}>
                                    {reply.uid === user?.uid ? "You" : reply.name}
                                  </span>
                                  <span style={{ fontSize: 9, color: "#475569" }}>{timeAgo(reply.time)}</span>
                                </div>
                                <p style={{ fontSize: 12, color: "#cbd5e1", margin: 0 }}>{reply.msg}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Reply Input */}
                        {replyingTo === post.id && (
                          <div style={{ marginTop: 8, marginLeft: isOwn ? 0 : 40, display: "flex", gap: 8 }}>
                            <input
                              value={replyMsg}
                              onChange={e => setReplyMsg(e.target.value)}
                              placeholder="Write a reply..."
                              style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "8px 14px", color: "#e2e8f0", fontSize: 12, outline: "none" }}
                              onKeyPress={e => e.key === "Enter" && sendReply(post.id)}
                            />
                            <button onClick={() => sendReply(post.id)} style={{ ...styles.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"), padding: "8px 16px", fontSize: 12 }}>
                              Send
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* LEADERBOARD SCREEN */}
        {screen === "leaderboard" && (
          <div className="pop" style={{ paddingTop: 16 }}>
            <h2 style={{ fontSize: 19, fontWeight: 900, background: "linear-gradient(135deg,#fbbf24,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>🏆 Global Leaderboard</h2>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 14 }}>Real-time • Firebase powered 🔥</p>
            {leaderboard.length === 0 ? (
              <div style={{ ...styles.card(), padding: 40, textAlign: "center", color: "#475569" }}>
                <div style={{ fontSize: 40 }}>🏆</div>
                <p style={{ marginTop: 10 }}>No scores yet!</p>
              </div>
            ) : (
              leaderboard.map((e, i) => (
                <div key={e.id} style={{ ...styles.card(), display: "flex", alignItems: "center", gap: 10, padding: 12, marginBottom: 7, borderLeft: `3px solid ${i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c2f" : "#334155"}`, background: e.uid === user?.uid ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: e.uid === user?.uid ? "#a5b4fc" : "#e2e8f0", fontSize: 13 }}>{e.name} {e.uid === user?.uid ? "(You)" : ""}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>{e.categoryLabel || e.category} • {e.accuracy}% accuracy</div>
                  </div>
                  <div style={{ fontWeight: 900, color: "#6366f1", fontSize: 18 }}>{e.score}<span style={{ fontSize: 12, color: "#475569" }}>/{e.total}</span></div>
                </div>
              ))
            )}
          </div>
        )}

        {/* MY PROGRESS SCREEN */}
        {screen === "myprogress" && (
          <div className="pop" style={{ paddingTop: 16 }}>
            <h2 style={{ fontSize: 19, fontWeight: 900, color: "#c7d2fe", marginBottom: 4 }}>📊 My Progress</h2>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 14 }}>{user?.displayName || user?.email}</p>
            <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
              {[{ l: "Submitted", v: myContributions.length, i: "✍️" }, { l: "Approved", v: myContributions.filter(c => c.status === "approved").length, i: "✅" }, { l: "Pending", v: myContributions.filter(c => c.status === "pending").length, i: "⏳" }].map((x, i) => (
                <div key={i} style={{ ...styles.card(), flex: 1, padding: "10px 5px", textAlign: "center", borderTop: `2px solid ${i === 0 ? "#6366f1" : i === 1 ? "#10b981" : "#f59e0b"}` }}>
                  <div style={{ fontSize: 18 }}>{x.i}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: i === 0 ? "#a5b4fc" : i === 1 ? "#10b981" : "#f59e0b" }}>{x.v}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{x.l}</div>
                </div>
              ))}
            </div>
            {Object.keys(myStats).length === 0 ? (
              <div style={{ ...styles.card(), padding: 36, textAlign: "center", color: "#475569" }}>
                <div style={{ fontSize: 36 }}>📊</div>
                <p style={{ marginTop: 8 }}>No quiz history yet!</p>
              </div>
            ) : (
              Object.entries(myStats).map(([catId, data]) => {
                const catInfo = categories.find(c => c.id === catId) || { label: catId, icon: "📋", color: "#6366f1" };
                const total = data.attempts * quizCount;
                const pct = total > 0 ? Math.round((data.correct / total) * 100) : 0;
                return (
                  <div key={catId} style={{ ...styles.card(), padding: 14, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{catInfo.icon} {catInfo.label}</span>
                      <span style={{ color: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444", fontWeight: 800, fontSize: 14 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 6, marginBottom: 7 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct >= 80 ? "linear-gradient(90deg,#10b981,#059669)" : pct >= 50 ? "linear-gradient(90deg,#f59e0b,#d97706)" : "linear-gradient(90deg,#ef4444,#dc2626)", borderRadius: 6, transition: "width 0.5s ease" }} />
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#475569" }}>
                      <span>🎮 {data.attempts}x played</span><span>🏆 Best: {data.best}</span><span>✅ {data.correct} correct</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}

// Reports Panel Component
function ReportsPanel({ db, categories, showNotif, deleteQ }) {
  const [reports, setReports] = useState([]);
  useEffect(() => {
    const unsubscribe = onValue(ref(db, "reports"), (snap) => {
      if (snap.exists()) {
        const d = [];
        snap.forEach(c => d.push({ id: c.key, ...c.val() }));
        setReports(d.filter(r => r.status === "pending"));
      } else {
        setReports([]);
      }
    });
    return () => unsubscribe();
  }, [db]);

  const resolveReport = async (r) => {
    try {
      await update(ref(db, `reports/${r.id}`), { status: "resolved" });
      showNotif("Report resolved!");
    } catch (error) {
      console.error("Error resolving report:", error);
      showNotif("Failed to resolve report!", "error");
    }
  };

  const deleteReportedQ = async (r) => {
    if (!window.confirm("Delete this question permanently?")) return;
    try {
      await deleteQ(r.qId);
      await update(ref(db, `reports/${r.id}`), { status: "deleted" });
    } catch (error) {
      console.error("Error deleting reported question:", error);
      showNotif("Failed to delete question!", "error");
    }
  };

  return (
    <div>
      {reports.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 40, textAlign: "center", color: "#475569" }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <p style={{ marginTop: 10 }}>No pending reports!</p>
        </div>
      ) : (
        reports.map(r => (
          <div key={r.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: 14, marginBottom: 10, borderLeft: "3px solid #ef4444" }}>
            <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 6, fontWeight: 700 }}>🚩 Reported by: {r.reportedByName}</div>
            <p style={{ fontSize: 13, color: "#e2e8f0", marginBottom: 6 }}>{r.qText?.substring(0, 60)}...</p>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>Reason: {r.reason}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => resolveReport(r)} style={{ flex: 1, background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "8px 0", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>✅ Resolve</button>
              <button onClick={() => deleteReportedQ(r)} style={{ flex: 1, background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "8px 0", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>🗑️ Delete Q</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Members Panel Component
function MembersPanel({ db, activeMembers }) {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    const unsubscribe = onValue(ref(db, "online"), (snap) => {
      if (snap.exists()) {
        const d = [];
        snap.forEach(c => d.push({ id: c.key, ...c.val() }));
        setMembers(d);
      } else {
        setMembers([]);
      }
    });
    return () => unsubscribe();
  }, [db]);

  return (
    <div>
      <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: 16, marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: "#10b981" }}>{activeMembers}</div>
        <div style={{ color: "#475569", fontSize: 13 }}>Active Members Online 🟢</div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 14 }}>
        <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 10, fontSize: 13 }}>Online Users</div>
        {members.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
            <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0", flex: 1 }}>{m.name}</div>
          </div>
        ))}
        {members.length === 0 && <p style={{ color: "#475569", fontSize: 12 }}>No active users.</p>}
      </div>
    </div>
  );
}
