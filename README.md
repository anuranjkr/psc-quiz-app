# 🎓 PSC Quiz Kerala — APK Build Guide

## ഈ Folder-ലുള്ള Files GitHub-ൽ Upload ചെയ്ത് APK ഉണ്ടാക്കാം!

---

## Step-by-Step Guide

### 1️⃣ GitHub Repository ഉണ്ടാക്കുക
1. github.com തുറക്കുക
2. "+" → "New repository" click ചെയ്യുക
3. Repository name: `psc-quiz-app`
4. **Public** select ചെയ്യുക
5. "Create repository" click ചെയ്യുക

---

### 2️⃣ Files Upload ചെയ്യുക
1. Repository page-ൽ "uploading an existing file" link click ചെയ്യുക
2. ഈ folder-ലെ **എല്ലാ files-ഉം** drag & drop ചെയ്യുക
   - `.github/` folder (workflows ഉള്ളത്)
   - `src/` folder
   - `public/` folder
   - `package.json`
   - `capacitor.config.json`
3. "Commit changes" click ചെയ്യുക

---

### 3️⃣ APK Build ആകുന്നത് കാണുക
1. Repository-ൽ **"Actions"** tab click ചെയ്യുക
2. "Build PSC Quiz APK" workflow കാണും
3. Build complete ആകാൻ ~10-15 minutes എടുക്കും
4. ✅ Green checkmark കണ്ടാൽ build success!

---

### 4️⃣ APK Download ചെയ്യുക
1. Actions → Build click ചെയ്യുക
2. Page bottom-ൽ **"Artifacts"** section-ൽ
3. **"PSC-Quiz-Kerala-APK"** download ചെയ്യുക
4. ZIP extract ചെയ്ത് `app-debug.apk` install ചെയ്യുക

---

## ⚠️ APK Install ചെയ്യാൻ
Phone Settings → Security → **"Unknown Sources"** enable ചെയ്യുക

---

## 📊 Daily Questions Update ചെയ്യാൻ
`src/App.jsx` file-ൽ FALLBACK_QUESTIONS array-ൽ questions add ചെയ്ത് commit ചെയ്യുക
→ Auto build ആകും → പുതിയ APK download ചെയ്യാം

**അല്ലെങ്കിൽ Google Sheets connect ചെയ്യുക (App-ൽ ⚙️ Setup)**
