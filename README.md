# EnrollMate Chrome Extension - CAMU Integration

A Chrome extension that automatically extracts course information from **CAMU enrollment page** and sends it to your **local React app** for timetable management.

---

## 🎯 Overview

This Manifest V3 Chrome extension extracts course card data from **`https://www.mycamu.co.in/#/home/feed/enrolement`** and passes it to your React app running on **`http://localhost:5173`**.

**✅ No Backend** | **✅ Client-Side Only** | **✅ Local Development Ready**

---

## ✨ Features

- 🎯 **One-Click Extraction**: Click extension icon to extract all CAMU course data
- 🔍 **Smart DOM Parsing**: Targets course cards with IDs starting with `priceTab_`
- 📊 **Structured Data**: Extracts courseName, displayName, staff, credits, and time slots
- 🚀 **Direct Integration**: Opens React app with encoded JSON in URL query params
- 🔒 **Domain-Specific**: Only works on `www.mycamu.co.in` for security
- 💬 **User Feedback**: Alerts and console logs for debugging

---

## 🏗️ Architecture Flow

```
User on CAMU Enrollment Page
         ↓
Click Extension Icon
         ↓
Background Service Worker Activates
         ↓
chrome.scripting.executeScript Injects Extractor
         ↓
Find All: [id^='priceTab_']
         ↓
Parse Each Course Card DOM
         ↓
Build JSON Array
         ↓
Encode with encodeURIComponent()
         ↓
chrome.tabs.create()
         ↓
Open: http://localhost:5173/?data=<encoded_json>
         ↓
React App Parses & Renders
```

---

## 📦 Installation

### Prerequisites
- Google Chrome or Chromium browser
- React app running on `http://localhost:5173` (see frontend setup)

### Load Extension (Development Mode)

1. **Download/Clone** this repository

2. **Open Chrome** and navigate to:
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode** (toggle in top-right corner)

4. **Click "Load unpacked"** button

5. **Select** the `EnrollMate-Extension` folder (containing `manifest.json`)

6. **Verify** the extension appears with a blue "E" icon

---

## 🚀 Local Testing Workflow

### Step 1: Start React App

```bash
cd /path/to/EnrollMate/frontend
npm install
npm run dev
```

✅ App should run at: `http://localhost:5173`

### Step 2: Navigate to CAMU

Open Chrome and go to:
```
https://www.mycamu.co.in/#/home/feed/enrolement
```

**Important**: Login and ensure course cards are visible on the page.

### Step 3: Extract Data

1. **Wait** for all course cards to load
2. **Click** the EnrollMate extension icon (blue "E" in toolbar)
3. **Extension** will:
   - Scan for `[id^="priceTab_"]` elements
   - Extract course details from each card
   - Show alert with count (e.g., "Extracted 15 courses")
   - Open new tab with React app

### Step 4: View in React

React app will:
- Automatically detect `?data=...` query parameter
- Parse and validate JSON
- Load courses into state
- Clean URL (remove query param)
- Navigate to `/home` page
- Display interactive timetable

---

## 📊 Extracted Data Structure

```javascript
[
  {
    uniqueId: "priceTab_CS101",
    courseName: "Introduction to Computer Science [3 Credits]",
    displayName: "Intro to CS",
    staff: "Dr. John Doe",
    credits: 3,
    slots: [
      { day: "Monday", time: "8-10" },
      { day: "Wednesday", time: "10-12" },
      { day: "Friday", time: "1-3" }
    ]
  },
  // ... more courses
]
```

### Field Details

| Field | Type | Description |
|-------|------|-------------|
| `uniqueId` | string | Card's HTML `id` attribute (e.g., `priceTab_101`) |
| `courseName` | string | Full course name with code and credits |
| `displayName` | string | Short/display name for UI |
| `staff` | string | Instructor/faculty name |
| `credits` | number | Credit hours (parsed from text) |
| `slots` | array | Schedule with `day` and `time` objects |

---

## 🔧 Customization for Different DOM Structures

If CAMU's HTML structure changes, update selectors in `background.js`:

```javascript
// Course name selectors
const courseNameElement = card.querySelector(
  '.course-name, .courseName, [class*="course-name"], ' +
  '.course-title, [class*="course-title"], ' +
  'h3, h4, .title'
);

// Staff selectors
const staffElement = card.querySelector(
  '.staff, .instructor, [class*="staff"], [class*="instructor"], ' +
  '.teacher, [class*="teacher"], .faculty, [class*="faculty"]'
);

// Add more selectors as needed...
```

---

## 🔒 Permissions Explained

### Required Permissions

1. **`activeTab`**: Access current tab's content only when clicked
2. **`scripting`**: Inject extraction script into active tab

### Host Permissions

```json
"host_permissions": [
  "https://www.mycamu.co.in/*"
]
```

✅ **Minimal & Secure**: Only works on CAMU domain, nowhere else.

---

## 🐛 Troubleshooting

### Extension Icon Does Nothing

**Check:**
- Are you on `https://www.mycamu.co.in/*`?
- Is the extension enabled in `chrome://extensions/`?
- Open DevTools Console (F12) for error messages

### No Courses Extracted

**Possible Causes:**
1. Page not fully loaded - wait a few seconds
2. No elements with `id^="priceTab_"` - verify HTML structure
3. JavaScript errors - check console

**Debug Steps:**
1. Right-click extension icon → "Inspect popup" (none in this case)
2. Go to `chrome://extensions/` → Click "service worker" under EnrollMate
3. View background script console logs

### React App Doesn't Load Courses

**Check:**
1. React dev server running on `http://localhost:5173`?
2. Check browser console for JSON parsing errors
3. Verify `parseExtensionData()` is called in `App.jsx`

### Alert Says "No course cards found"

**Verify:**
```javascript
// Open DevTools Console on CAMU page and run:
console.log(document.querySelectorAll('[id^="priceTab_"]'));
// Should show NodeList of course cards
```

If empty, CAMU structure may have changed - inspect HTML and update selectors.

---

## 📝 Development Notes

### Testing Without CAMU

Create a local test HTML file:

```html
<!DOCTYPE html>
<html>
<head><title>Test CAMU Page</title></head>
<body>
  <div id="priceTab_TEST1">
    <h3 class="course-name">CS101 [3 Credits]</h3>
    <div class="staff">Dr. Test</div>
    <span class="slot">Monday 8-10</span>
  </div>
</body>
</html>
```

Save as `test.html`, open in Chrome, click extension.

### Viewing Extracted Data

Add to `background.js` after extraction:

```javascript
console.table(extractedData); // View as table
```

### Modifying React URL

To use production URL instead of localhost:

```javascript
// In background.js, change:
const reactUrl = `https://your-deployed-app.vercel.app/?data=${encodedData}`;
```

---

## 🎨 Customizing Icons

Replace placeholder icons in `icons/` folder:

- `icon16.png` - 16x16px (toolbar)
- `icon48.png` - 48x48px (extensions page)
- `icon128.png` - 128x128px (Chrome Web Store)

Use transparent PNG with your branding.

---

## 🚢 Distribution

### For Personal Use
Share the folder with teammates - they load as "unpacked" extension.

### For Public Release
1. Zip the `EnrollMate-Extension` folder
2. Create Chrome Web Store developer account ($5 fee)
3. Upload zip to [Chrome Web Store Dashboard](https://chrome.google.com/webstore/devconsole)
4. Fill metadata and submit for review

---

## 📚 Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [chrome.scripting API](https://developer.chrome.com/docs/extensions/reference/scripting/)

---

## 🔐 Privacy & Security

- ✅ **No data collection**: All processing happens locally
- ✅ **No external requests**: No analytics or tracking
- ✅ **Minimal permissions**: Only CAMU domain access
- ✅ **User-triggered**: Only runs when you click the icon
- ✅ **Open source**: Review all code before installing

---

## 👥 Credits

- 💡 **Concept**: Prahathieswaran
- 💻 **Development**: Santhosh
- 🏫 **Supported by**: Tech Society

---

## 📄 License

Educational and personal use.

---

**Built with ❤️ for CAMU students**

🎓 Happy Course Planning!
