# EnrollMate Chrome Extension - localStorage Implementation

## ✅ Architecture

```
Extension Page → Extract DOM → localStorage.setItem() → Open React App
React App → localStorage.getItem() → Parse & Render
```

### Flow
1. User clicks extension icon on CAMU/test page
2. Content script extracts course data from DOM
3. Data stored in `localStorage` (key: `enrollmate_courses`)
4. Background script opens React app at `http://localhost:5173/`
5. React app reads from `localStorage` on mount
6. Courses displayed in UI

---

## 📁 File Structure

```
EnrollMate-Extension/
├── manifest.json          # MV3 manifest with storage permission
├── background.js          # Service worker (opens React app)
├── content.js            # Extraction & localStorage logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md

EnrollMate/frontend/
└── src/
    └── App.jsx           # Reads from localStorage
```

---

## 🔧 Installation

### 1. Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `EnrollMate-Extension` folder
5. Extension should appear with icon

### 2. Start React App

```bash
cd EnrollMate/frontend
npm install
npm run dev
```

React app runs at: `http://localhost:5173/`

---

## 🚀 Usage

### Test with Demo Site

1. Start the demo MyCamu site:
```bash
cd Demo-MyCamu
npm install
npm run dev
```

Demo runs at: `http://localhost:5174/`

2. Open `http://localhost:5174/` in Chrome
3. Click the **EnrollMate extension icon** in toolbar
4. Extension extracts courses → saves to localStorage
5. New tab opens with React app showing courses

### Use with Real CAMU

1. Navigate to: `https://www.mycamu.co.in/#/home/feed/enrolement`
2. Click EnrollMate extension icon
3. Courses extracted and opened in React app

---

## 📝 Key Files Explained

### manifest.json
```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "scripting", "storage"],
  "content_scripts": [{
    "matches": ["https://www.mycamu.co.in/*", "http://localhost:5174/*"],
    "js": ["content.js"]
  }]
}
```

### content.js
```javascript
// Extract courses from DOM
const coursesData = extractCourseData();

// Store in localStorage
localStorage.setItem('enrollmate_courses', JSON.stringify(coursesData));

// Notify background to open React app
chrome.runtime.sendMessage({ type: 'OPEN_REACT_APP', data: coursesData });
```

### background.js
```javascript
// Listen for message from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'OPEN_REACT_APP') {
    // Open React app (data already in localStorage)
    chrome.tabs.create({ url: 'http://localhost:5173/' });
  }
});
```

### App.jsx
```javascript
useEffect(() => {
  // Read from localStorage on mount
  const storedData = localStorage.getItem('enrollmate_courses');
  if (storedData) {
    const courses = JSON.parse(storedData);
    setCourses(courses);
    navigate('/home');
  }
}, []);
```

---

## 🔍 Debugging

### Check if data is in localStorage:

1. Open React app: `http://localhost:5173/`
2. Open DevTools (F12) → Console
3. Run:
```javascript
localStorage.getItem('enrollmate_courses')
```

### Check extension logs:

1. Go to `chrome://extensions/`
2. Find EnrollMate extension
3. Click **Inspect views: service worker**
4. Check Console for logs

### Check content script:

1. On CAMU/test page, open DevTools (F12)
2. Console should show: `🟢 EnrollMate content script loaded`
3. Click extension icon
4. Watch for extraction logs

---

## ⚙️ Configuration

### Change React App Port

Edit `background.js` and `content.js`:
```javascript
// Change this line:
chrome.tabs.create({ url: 'http://localhost:5173/' });

// To your port:
chrome.tabs.create({ url: 'http://localhost:YOUR_PORT/' });
```

### localStorage Keys

- `enrollmate_courses` - JSON array of course data
- `enrollmate_timestamp` - ISO timestamp of extraction

---

## 🐛 Troubleshooting

### Extension icon doesn't work
- Refresh the CAMU/test page
- Check you're on correct URL (localhost:5174 or mycamu.co.in)
- Check console for errors

### React app doesn't show courses
- Check localStorage in DevTools
- Verify data format is correct JSON array
- Check App.jsx console logs

### "No course cards found"
- Ensure page has elements with `id^="priceTab_"`
- Check if page is fully loaded
- Inspect DOM structure matches expectations

---

## ✨ Benefits of localStorage Approach

✅ **No URL length limits** - handles 200+ courses easily  
✅ **No 431 errors** - headers stay small  
✅ **Cleaner URLs** - no massive query params  
✅ **Faster** - no encoding/decoding overhead  
✅ **Persistent** - data survives page refreshes  
✅ **Simple** - standard Web API, no dependencies  

---

## 🔄 Data Flow Diagram

```
┌─────────────────┐
│  CAMU Website   │
│  (DOM Loaded)   │
└────────┬────────┘
         │
         │ User clicks extension icon
         ▼
┌─────────────────┐
│  content.js     │
│  • Extract DOM  │
│  • Parse slots  │
└────────┬────────┘
         │
         │ Save to localStorage
         ▼
┌─────────────────┐
│  localStorage   │
│  'enrollmate_   │
│   courses'      │
└────────┬────────┘
         │
         │ Notify background.js
         ▼
┌─────────────────┐
│  background.js  │
│  Open new tab   │
└────────┬────────┘
         │
         │ Opens http://localhost:5173/
         ▼
┌─────────────────┐
│  React App      │
│  App.jsx        │
└────────┬────────┘
         │
         │ useEffect reads localStorage
         ▼
┌─────────────────┐
│  Course Store   │
│  setCourses()   │
└────────┬────────┘
         │
         │ Navigate to /home
         ▼
┌─────────────────┐
│  HomePage       │
│  Display courses│
└─────────────────┘
```

---

## 📚 Additional Resources

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

---

## 🎯 Testing Checklist

- [ ] Extension loads without errors
- [ ] Content script injects on target pages
- [ ] Clicking icon triggers extraction
- [ ] Data appears in localStorage
- [ ] React app opens in new tab
- [ ] Courses display correctly
- [ ] Works with 200+ courses
- [ ] No 431 errors
- [ ] Console shows success logs
