# EnrollMate - CAMU Course Extractor

A Chrome extension that automatically extracts course enrollment data from the CAMU portal and transfers it to the EnrollMate React application for intelligent timetable planning.

---

## 🎯 Overview

**EnrollMate Extension** is a Manifest V3 Chrome extension designed to streamline course enrollment for students using the CAMU education management system. It extracts structured course data directly from the CAMU enrollment page and seamlessly transfers it to the EnrollMate web application.

### Key Features

- 🚀 **One-Click Extraction** - Extract all available courses with a single click
- 🔍 **Smart Parsing** - Automatically identifies and parses course details including name, credits, staff, and time slots
- 📦 **Direct Transfer** - Sends data directly to EnrollMate via Chrome storage
- 🔒 **Secure & Private** - Works only on CAMU domain, no external data sharing
- ⚡ **Real-time Updates** - Instantly opens EnrollMate with your extracted courses

---

## 📹 Demo

Watch how EnrollMate Extension works:

<video src="https://github.com/user-attachments/assets/fb0ab2f1-5b84-4ef2-8967-d8c68b7b8515" width="600" controls></video>

---

## 🚀 How to Use

### 1. Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer Mode** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `EnrollMate-Extension` folder
6. Extension icon should appear in your toolbar

### 2. Usage Workflow

#### Step 1: Navigate to CAMU Enrollment Page
```
https://www.mycamu.co.in/#/home/feed/enrolement
```
- Login to your CAMU account
- Ensure course cards are fully loaded

#### Step 2: Click Extension Icon
- Click the EnrollMate extension icon in your Chrome toolbar
- The extension will automatically:
  - Scan the page for course cards
  - Extract course information (name, credits, staff, time slots)
  - Save data to Chrome storage
  - Open EnrollMate application in a new tab

#### Step 3: View in EnrollMate
- EnrollMate automatically loads the extracted courses
- Create your optimal timetable using the interactive interface
- Save and manage your course selections

---

## 📊 Extracted Data Format

The extension extracts the following information for each course:

```json
{
  "uniqueId": "T1-Q5",
  "courseName": "Mathematics for Artificial Intelligence",
  "displayName": "Math AI",
  "staff": "Premila S C",
  "credits": 4,
  "slots": [
    { "day": "Monday", "time": "10-12" },
    { "day": "Thursday", "time": "10-12" }
  ]
}
```

### Data Mapping

- **Course Names** → Short names via `Course-Short-Name.json`
- **Time Slots** → Automatically consolidated into time ranges
- **Staff Names** → Extracted from department-staff format

---

## 🔧 Technical Details

### Architecture
- **Manifest Version**: V3
- **Content Script**: Runs on CAMU pages to extract DOM data
- **Background Worker**: Handles data storage and tab management
- **Storage**: Chrome storage API for cross-tab data sharing

### Permissions
- `activeTab` - Access current tab when extension is clicked
- `scripting` - Inject content script for data extraction
- `storage` - Store extracted data for EnrollMate access

### Supported URLs
- `https://www.mycamu.co.in/*` (Production)
- `http://localhost:5173/*` (Local development)
- `https://enroll-mate.vercel.app/*` (Deployed app)

---

## 🛠️ Configuration

### Custom Course Name Mapping

Edit `Course-Short-Name.json` to customize course display names:

```json
{
  "Your Full Course Name": "Short Name",
  "Advanced C Programming": "Adv C"
}
```

### Change Target Application URL

Edit `background.js`:

```javascript
chrome.tabs.create({ 
  url: 'https://your-custom-url.com/home#from-extension'
});
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not working | Verify you're on `mycamu.co.in` enrollment page |
| No courses extracted | Ensure page is fully loaded, check console for errors |
| EnrollMate doesn't open | Check if URL is correct in `background.js` |
| Data not appearing | Clear Chrome storage and try again |

### Debug Mode

Open Chrome DevTools:
- **Content Script Console**: Right-click page → Inspect → Console
- **Background Worker**: `chrome://extensions/` → Service Worker link

---

## 👥 Credits

- **Developer**: Santhosh Sandy
- **Concept**: Prahathieswaran
- **Organization**: RW Tech Society

---

## 📄 License

For educational and personal use only.

---

**Built with ❤️ for CAMU students**
