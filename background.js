// EnrollMate Extension - Background Service Worker
// Listens for messages from content script and opens React app

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📬 Background received message:', message.type);

  if (message.type === 'OPEN_REACT_APP') {
    const coursesData = message.data;
    
    if (!coursesData || coursesData.length === 0) {
      console.warn('⚠️ No course data received');
      sendResponse({ success: false, error: 'No course data' });
      return;
    }

    console.log(`✅ Received ${coursesData.length} courses from content script`);

    // Store in chrome.storage.local so React app can retrieve it
    chrome.storage.local.set({
      'enrollmate_courses': coursesData,
      'enrollmate_timestamp': new Date().toISOString()
    }, () => {
      console.log('💾 Saved to chrome.storage.local');
      
      // Open React app in new tab with a signal that data is ready
      chrome.tabs.create({ 
        url: 'https://enroll-mate.vercel.app/home#from-extension'
      }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error opening tab:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('🚀 Opened React app successfully');
          
          // Inject script to transfer data from chrome.storage to localStorage
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: transferDataToLocalStorage
            });
          }, 1000); // Wait for page to load
          
          sendResponse({ success: true });
        }
      });
    });

    // Return true to indicate async response
    return true;
  }

  if (message.type === 'EXTRACT_COURSES') {
    // Trigger content script extraction
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'START_EXTRACTION' }, (response) => {
          sendResponse(response);
        });
      }
    });
    return true;
  }
});

// Function to inject into React app to transfer data from chrome.storage to localStorage
function transferDataToLocalStorage() {
  chrome.storage.local.get(['enrollmate_courses', 'enrollmate_timestamp'], (result) => {
    if (result.enrollmate_courses) {
      localStorage.setItem('enrollmate_courses', JSON.stringify(result.enrollmate_courses));
      localStorage.setItem('enrollmate_timestamp', result.enrollmate_timestamp);
      console.log('✅ Transferred', result.enrollmate_courses.length, 'courses to localStorage');
      
      // Trigger page reload to load the data
      window.location.reload();
    }
  });
}

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Verify we're on the CAMU enrollment page or localhost testing
    const isCAMU = tab.url && tab.url.includes('mycamu.co.in');
    const isLocalhost = tab.url && tab.url.includes('localhost');
    
    if (!isCAMU && !isLocalhost) {
      console.error('❌ This extension only works on CAMU or localhost test site');
      
      // Show notification to user
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          alert('⚠️ Please navigate to:\n• CAMU: https://www.mycamu.co.in/#/home/feed/enrolement\n• OR Local Test: http://localhost:5174/');
        }
      }).catch(err => console.error('Could not show alert:', err));
      
      return;
    }

    console.log('🔍 Triggering course extraction...');

    // Send message to content script to start extraction
    chrome.tabs.sendMessage(tab.id, { type: 'START_EXTRACTION' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error communicating with content script:', chrome.runtime.lastError);
        
        // Show error to user
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            alert('Error: Content script not loaded. Please refresh the page and try again.');
          }
        }).catch(err => console.error('Could not show alert:', err));
      }
    });

  } catch (error) {
    console.error('❌ Error in action handler:', error);
  }
});

console.log('🟢 EnrollMate background service worker loaded');

/**
 * Extraction function that runs in the CAMU page context
 * This function is injected into the active tab to parse the DOM
 * 
 * Targets: Course cards with IDs starting with "priceTab_"
 * Returns: Array of structured course objects
 */
function extractCourseData() {
  console.log('🔎 Starting course extraction...');
  
  // Find all course cards with IDs starting with 'priceTab_'
  const courseCards = document.querySelectorAll('[id^="priceTab_"]');
  
  console.log(`Found ${courseCards.length} course cards`);
  
  if (courseCards.length === 0) {
    return [];
  }

  const coursesData = [];

  courseCards.forEach((card, index) => {
    try {
      // Extract the unique ID from the card (remove 'priceTab_' prefix)
      const uniqueId = card.id.replace('priceTab_', '');

      // Extract course name - try multiple selectors
      const courseNameElement = card.querySelector(
        '.course-name, .courseName, [class*="course-name"], ' +
        '.course-title, [class*="course-title"], ' +
        'h3, h4, .title'
      );
      const courseName = courseNameElement ? courseNameElement.textContent.trim() : `Course ${index + 1}`;

      // Extract display name (shortened name)
      const displayNameElement = card.querySelector(
        '.display-name, .displayName, [class*="display-name"], ' +
        '.short-name, [class*="short"]'
      );
      const displayName = displayNameElement ? displayNameElement.textContent.trim() : courseName;

      // Extract staff/instructor name
      const staffElement = card.querySelector(
        '.staff, .instructor, [class*="staff"], [class*="instructor"], ' +
        '.teacher, [class*="teacher"], .faculty, [class*="faculty"]'
      );
      const staff = staffElement ? staffElement.textContent.trim() : 'TBA';

      // Extract credits - parse number from text
      const creditsElement = card.querySelector(
        '.credits, [class*="credit"], [class*="hour"]'
      );
      const creditsText = creditsElement ? creditsElement.textContent.trim() : '';
      const creditsMatch = creditsText.match(/\d+/);
      const credits = creditsMatch ? parseInt(creditsMatch[0], 10) : 3; // Default to 3 if not found

      // Extract slots (day + time combinations)
      const slots = [];
      
      // Method 1: Look for slot elements
      const slotsElements = card.querySelectorAll(
        '.slot, .time-slot, [class*="slot"], ' +
        '.schedule, [class*="schedule"], ' +
        '.timing, [class*="timing"]'
      );

      slotsElements.forEach(slotElement => {
        const slotText = slotElement.textContent.trim();
        
        // Parse day and time from slot text
        // Formats: "Monday 8-10", "Mon: 10-12", "M 1-3", etc.
        const dayMatch = slotText.match(
          /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun|M|T|W|Th|F|S)/i
        );
        const timeMatch = slotText.match(/(\d{1,2})-(\d{1,2})/);

        if (dayMatch && timeMatch) {
          // Normalize day names
          let day = dayMatch[0];
          const dayMap = {
            'Mon': 'Monday', 'M': 'Monday',
            'Tue': 'Tuesday', 'T': 'Tuesday',
            'Wed': 'Wednesday', 'W': 'Wednesday',
            'Thu': 'Thursday', 'Th': 'Thursday',
            'Fri': 'Friday', 'F': 'Friday',
            'Sat': 'Saturday', 'S': 'Saturday',
            'Sun': 'Sunday'
          };
          day = dayMap[day] || day;
          
          slots.push({
            day: day,
            time: timeMatch[0]
          });
        }
      });

      // Method 2: If no slots found, scan all text content
      if (slots.length === 0) {
        const allText = card.textContent;
        
        // Pattern to find day-time combinations
        const dayTimePattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[:\s,]*(\d{1,2})-(\d{1,2})/gi;
        let match;
        
        while ((match = dayTimePattern.exec(allText)) !== null) {
          let day = match[1];
          
          // Normalize abbreviated days
          const dayMap = {
            'Mon': 'Monday',
            'Tue': 'Tuesday',
            'Wed': 'Wednesday',
            'Thu': 'Thursday',
            'Fri': 'Friday',
            'Sat': 'Saturday',
            'Sun': 'Sunday'
          };
          day = dayMap[day] || day;
          
          slots.push({
            day: day,
            time: `${match[2]}-${match[3]}`
          });
        }
      }

      // Method 3: If still no slots, add a default placeholder
      if (slots.length === 0) {
        console.warn(`No slots found for ${uniqueId}, adding placeholder`);
        slots.push({
          day: 'Monday',
          time: '8-10'
        });
      }

      // Create course object
      const courseData = {
        uniqueId,
        courseName,
        displayName,
        staff,
        credits,
        slots
      };

      coursesData.push(courseData);
      console.log(`✅ Extracted: ${courseName}`);

    } catch (error) {
      console.error(`❌ Error parsing course card ${card.id}:`, error);
    }
  });

  console.log(`✅ Successfully extracted ${coursesData.length} courses`);
  return coursesData;
}
