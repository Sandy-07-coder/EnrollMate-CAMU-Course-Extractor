// EnrollMate Extension - Content Script
// Runs in the context of the CAMU/test page
// Extracts course data and saves to localStorage

// Course name to short name mapping (loaded from JSON file)
let COURSE_SHORT_NAMES = {};

// Load course name mappings from JSON file
async function loadCourseNameMappings() {
  try {
    const response = await fetch(chrome.runtime.getURL('Course-Short-Name.json'));
    COURSE_SHORT_NAMES = await response.json();
    console.log('✅ Loaded course name mappings:', Object.keys(COURSE_SHORT_NAMES).length, 'courses');
  } catch (error) {
    console.error('❌ Failed to load Course-Short-Name.json:', error);
    // Fallback: empty mapping (will use full course names)
    COURSE_SHORT_NAMES = {};
  }
}

// Helper function to get short name for a course
function getShortName(courseName) {
  // Try exact match first
  if (COURSE_SHORT_NAMES[courseName]) {
    return COURSE_SHORT_NAMES[courseName];
  }
  
  // Try case-insensitive match
  const lowerCourseName = courseName.toLowerCase();
  for (const [fullName, shortName] of Object.entries(COURSE_SHORT_NAMES)) {
    if (fullName.toLowerCase() === lowerCourseName) {
      return shortName;
    }
  }
  
  // Try partial match (if course name contains the key)
  for (const [fullName, shortName] of Object.entries(COURSE_SHORT_NAMES)) {
    if (courseName.includes(fullName) || fullName.includes(courseName)) {
      return shortName;
    }
  }
  
  // Fallback: generate short name from course name
  // Extract capital letters and significant words
  return generateShortName(courseName);
}

// Generate a short name from a course name by extracting capital letters
function generateShortName(courseName) {
  // Remove common words and extract initials
  const stopWords = ['the', 'of', 'in', 'to', 'and', 'for', 'with', 'using', 'a', 'an'];
  
  // Split by spaces and filter out stop words
  const words = courseName
    .split(/\s+/)
    .filter(word => !stopWords.includes(word.toLowerCase()));
  
  // Try to extract capital letters first (for acronym-style names)
  const capitals = courseName.match(/[A-Z]/g);
  
  // If we have 2-4 capital letters, use them as acronym
  if (capitals && capitals.length >= 2 && capitals.length <= 4) {
    return capitals.join('');
  }
  
  // Otherwise, take first letter of each significant word (max 4 letters)
  if (words.length > 0) {
    return words
      .slice(0, 4)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }
  
  // Final fallback: take first 2-3 letters of the course name
  return courseName.substring(0, Math.min(3, courseName.length)).toUpperCase();
}

// Load mappings on script initialization
loadCourseNameMappings();

console.log('🟢 EnrollMate content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received message:', message.type);

  if (message.type === 'START_EXTRACTION') {
    extractAndStoreCourses()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        console.error('❌ Extraction error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate async response
    return true;
  }
});

/**
 * Main extraction function
 * Extracts course data from DOM and stores in localStorage
 */
async function extractAndStoreCourses() {
  try {
    console.log('🔎 Starting course extraction...');
    
    // Try MyCamu portal structure first
    let courseCards = document.querySelectorAll('.filter-view_list.ng-scope');
    let isRealPortal = courseCards.length > 0;
    
    console.log(`Found ${courseCards.length} MyCamu course cards`);
    
    // Fallback to demo site structure
    if (courseCards.length === 0) {
      courseCards = document.querySelectorAll('[id^="priceTab_"]');
      console.log(`Found ${courseCards.length} demo course cards`);
    }
    
    if (courseCards.length === 0) {
      alert('❌ No course cards found. Please ensure:\n1. You are on the enrollment page\n2. Course cards are loaded\n3. Portal is fully rendered');
      return { success: false, error: 'No course cards found' };
    }

    const coursesData = [];

    if (isRealPortal) {
      // Extract from real MyCamu portal
      // Each card can have multiple schedules, extract each separately
      courseCards.forEach((card, cardIndex) => {
        try {
          // Get all schedule blocks within this card
          const scheduleBlocks = card.querySelectorAll('.view-status_block');
          
          if (scheduleBlocks.length === 0) {
            console.warn(`No schedule blocks found in card ${cardIndex}`);
            return;
          }
          
          // Extract each schedule as a separate course
          scheduleBlocks.forEach((scheduleBlock, schedIndex) => {
            try {
              const courseData = extractFromRealPortal(card, scheduleBlock, cardIndex, schedIndex);
              if (courseData) {
                coursesData.push(courseData);
                console.log(`✅ Extracted: ${courseData.courseName} (${courseData.uniqueId})`);
              }
            } catch (error) {
              console.error(`❌ Error parsing schedule ${schedIndex} in card ${cardIndex}:`, error);
            }
          });
        } catch (error) {
          console.error(`❌ Error parsing course card ${cardIndex}:`, error);
        }
      });
    } else {
      // Extract from demo site
      courseCards.forEach((card, index) => {
        try {
          const courseData = extractFromDemoSite(card, index);
          if (courseData) {
            coursesData.push(courseData);
            console.log(`✅ Extracted: ${courseData.courseName}`);
          }
        } catch (error) {
          console.error(`❌ Error parsing course card ${card.id}:`, error);
        }
      });
    }

    if (coursesData.length === 0) {
      return { success: false, error: 'Failed to extract any course data' };
    }

    console.log(`✅ Successfully extracted ${coursesData.length} courses`);

    // Store in chrome.storage.local (shared across extension)
    try {
      await chrome.storage.local.set({
        'enrollmate_courses': coursesData,
        'enrollmate_timestamp': new Date().toISOString()
      });
      console.log('💾 Saved to chrome.storage.local');
    } catch (storageError) {
      console.error('❌ chrome.storage error:', storageError);
      return { success: false, error: `Storage failed: ${storageError.message}` };
    }

    // Also store in localStorage as backup (for same-origin access)
    try {
      localStorage.setItem('enrollmate_courses', JSON.stringify(coursesData));
      localStorage.setItem('enrollmate_timestamp', new Date().toISOString());
      console.log('💾 Also saved to localStorage');
    } catch (err) {
      console.warn('⚠️ localStorage failed (expected for cross-origin):', err.message);
    }

    // Notify background script to open React app
    chrome.runtime.sendMessage(
      { 
        type: 'OPEN_REACT_APP', 
        data: coursesData 
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error sending to background:', chrome.runtime.lastError);
        } else {
          console.log('📤 Sent data to background script');
        }
      }
    );

    return { 
      success: true, 
      count: coursesData.length,
      message: `Successfully extracted ${coursesData.length} courses` 
    };

  } catch (error) {
    console.error('❌ Fatal error in extraction:', error);
    return { success: false, error: error.message };
  }
}

// Auto-extract if we detect we're on the enrollment page
// (optional - removes need to click extension icon)
if (window.location.href.includes('enrolement') || window.location.href.includes('enrollment')) {
  console.log('📍 Detected enrollment page - ready for extraction');
}

/**
 * Extract course data from real MyCamu portal
 * Target: .filter-view_list.ng-scope elements with .view-status_block schedules
 */
function extractFromRealPortal(card, scheduleBlock, cardIndex, schedIndex) {
  try {
    // Extract course name from .enroll-num_sub (at card level)
    const courseNameElement = card.querySelector('.enroll-num_sub');
    const courseName = courseNameElement ? courseNameElement.textContent.trim() : `Course ${cardIndex + 1}`;

    // Extract course code and credits from .enroll-sub_label (at card level)
    // Format: "19AI305 [3 Credits]"
    const labelElement = card.querySelector('.enroll-sub_label');
    const labelText = labelElement ? labelElement.textContent.trim() : '';
    
    // Extract course code (e.g., 19AI305)
    const courseCodeMatch = labelText.match(/([A-Z0-9]+)/);
    const courseCode = courseCodeMatch ? courseCodeMatch[1] : `COURSE${cardIndex}`;
    
    // Extract credits (e.g., 3 from "[3 Credits]")
    const creditsMatch = labelText.match(/\[(\d+)\s*Credits?\]/i);
    const credits = creditsMatch ? parseInt(creditsMatch[1], 10) : 3;

    // Extract staff & uniqueId from .stud-enroll_details (at schedule block level)
    // Format: "UG - 25, T1-Q5, Maths - Premila S C"
    const detailsElement = scheduleBlock.querySelector('.stud-enroll_details');
    const detailsText = detailsElement ? detailsElement.textContent.trim() : '';
    
    // Split by comma and extract parts
    const parts = detailsText.split(',').map(p => p.trim());
    
    // Extract uniqueId (e.g., T1-Q5) - second part
    const uniqueId = parts[1] || `${courseCode}-${schedIndex}`;
    
    // Extract staff name from last part
    // Format can be: "Maths - Premila S C" or "Department - Staff Name"
    let staff = 'TBA';
    if (parts.length > 2) {
      const staffPart = parts[parts.length - 1];
      
      // If there's a dash, the staff name is after the dash
      if (staffPart.includes('-')) {
        const staffMatch = staffPart.split('-');
        staff = staffMatch.length > 1 ? staffMatch[staffMatch.length - 1].trim() : staffPart.trim();
      } else {
        // No dash means it's just the staff name
        staff = staffPart.trim();
      }
    }

    // Extract schedule slots from .enroll-date_details (at schedule block level)
    const slots = [];
    const scheduleElements = scheduleBlock.querySelectorAll('.enroll-date_details');
    
    scheduleElements.forEach(scheduleEl => {
      // Find all day sections within this schedule element
      const dayElements = scheduleEl.querySelectorAll('div[ng-repeat*="daykey"]');
      
      dayElements.forEach(dayEl => {
        const dayText = dayEl.textContent.trim();
        
        // Extract day name (e.g., "Monday:", "Friday:")
        const dayMatch = dayText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):/i);
        if (!dayMatch) return;
        
        const day = dayMatch[1];
        
        // Extract all time spans for this day
        const timeSpans = dayEl.querySelectorAll('span[ng-repeat*="hr in dayvalue.Hrs"]');
        
        if (timeSpans.length === 0) return;
        
        // Parse all times and find the min start and max end
        let minStart = 24;
        let maxEnd = 0;
        
        timeSpans.forEach(span => {
          const timeText = span.textContent.trim();
          const timeMatch = timeText.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
          
          if (timeMatch) {
            const startHour = parseInt(timeMatch[1], 10);
            const endHour = parseInt(timeMatch[3], 10);
            
            if (startHour < minStart) minStart = startHour;
            if (endHour > maxEnd) maxEnd = endHour;
          }
        });
        
        if (minStart < 24 && maxEnd > 0) {
          // Convert to 12-hour format
          const start12 = minStart > 12 ? minStart - 12 : (minStart === 0 ? 12 : minStart);
          const end12 = maxEnd > 12 ? maxEnd - 12 : (maxEnd === 0 ? 12 : maxEnd);
          
          slots.push({
            day: day,
            time: `${start12}-${end12}`
          });
        }
      });
    });

    // If no slots found, add placeholder
    if (slots.length === 0) {
      console.warn(`No slots found for ${uniqueId}, adding placeholder`);
      slots.push({
        day: 'Monday',
        time: '8-9'
      });
    }

    // Create course object matching MongoDB schema
    return {
      uniqueId: uniqueId,
      courseName: courseName,
      displayName: getShortName(courseName),
      staff: staff,
      credits: credits,
      slots: slots
    };

  } catch (error) {
    console.error('Error extracting from real portal:', error);
    return null;
  }
}

/**
 * Extract course data from demo site
 * Target: elements with id^="priceTab_"
 */
function extractFromDemoSite(card, index) {
  try {
    // Extract the unique ID from the card (remove 'priceTab_' prefix)
    const uniqueId = card.id.replace('priceTab_', '');

    // Extract course name
    const courseNameElement = card.querySelector(
      '.course-name, .courseName, [class*="course-name"], ' +
      '.course-title, [class*="course-title"], ' +
      'h3, h4, .title'
    );
    const courseName = courseNameElement ? courseNameElement.textContent.trim() : `Course ${index + 1}`;

    // Extract display name - use mapping or fallback to element
    const displayNameElement = card.querySelector(
      '.display-name, .displayName, [class*="display-name"], ' +
      '.short-name, [class*="short"]'
    );
    const displayName = displayNameElement ? displayNameElement.textContent.trim() : getShortName(courseName);

    // Extract staff
    const staffElement = card.querySelector(
      '.staff, .instructor, [class*="staff"], [class*="instructor"], ' +
      '.teacher, [class*="teacher"], .faculty, [class*="faculty"]'
    );
    const staff = staffElement ? staffElement.textContent.trim() : 'TBA';

    // Extract credits
    const creditsElement = card.querySelector(
      '.credits, [class*="credit"], [class*="hour"]'
    );
    const creditsText = creditsElement ? creditsElement.textContent.trim() : '';
    const creditsMatch = creditsText.match(/\d+/);
    const credits = creditsMatch ? parseInt(creditsMatch[0], 10) : 3;

    // Extract slots
    const slots = [];
    const slotsElements = card.querySelectorAll(
      '.slot, .time-slot, [class*="slot"], ' +
      '.schedule, [class*="schedule"], ' +
      '.timing, [class*="timing"]'
    );

    slotsElements.forEach(slotElement => {
      const slotText = slotElement.textContent.trim();
      
      const dayMatch = slotText.match(
        /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i
      );
      const timeMatch = slotText.match(/(\d{1,2})-(\d{1,2})/);

      if (dayMatch && timeMatch) {
        let day = dayMatch[0];
        const dayMap = {
          'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
          'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
        };
        day = dayMap[day] || day;
        
        slots.push({
          day: day,
          time: timeMatch[0]
        });
      }
    });

    // Fallback: scan text content
    if (slots.length === 0) {
      const allText = card.textContent;
      const dayTimePattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[:\s,]*(\d{1,2})-(\d{1,2})/gi;
      let match;
      
      while ((match = dayTimePattern.exec(allText)) !== null) {
        let day = match[1];
        const dayMap = {
          'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
          'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
        };
        day = dayMap[day] || day;
        
        slots.push({
          day: day,
          time: `${match[2]}-${match[3]}`
        });
      }
    }

    // Add placeholder if no slots
    if (slots.length === 0) {
      console.warn(`No slots found for ${uniqueId}, adding placeholder`);
      slots.push({
        day: 'Monday',
        time: '8-10'
      });
    }

    return {
      uniqueId,
      courseName,
      displayName,
      staff,
      credits,
      slots
    };

  } catch (error) {
    console.error('Error extracting from demo site:', error);
    return null;
  }
}
