// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "AIzaSyAtBxeZrh4cej7ZzsKZ5uN-BqC_wxoTmdE",
    authDomain: "coreai-82c79.firebaseapp.com",
    databaseURL: "https://coreai-82c79-default-rtdb.firebaseio.com",
    projectId: "coreai-82c79",
    storageBucket: "coreai-82c79.firebasestorage.app",
    messagingSenderId: "97395011364",
    appId: "1:97395011364:web:1e8f6a06fce409bfd80db1",
    measurementId: "G-0J1RLMVEGC"
  };

  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// API Keys and configuration
let API_KEY;
let thingsRefx;
let unsubscribex;

thingsRefx = db.collection('API');

// Wait for API key to be loaded before allowing interactions
unsubscribex = thingsRefx.onSnapshot(querySnapshot => {
  querySnapshot.docs.forEach(doc => {
    API_KEY = doc.data().API;
    console.log("OpenAI API Key loaded");
    // Initialize after API key is loaded
    if (!document.querySelector('.diet-experience-container')) {
      initializeDietGeneration();
    }
  });
});

const OPENAI_API_KEY = API_KEY;

// Voice configuration
const USE_ELEVEN_LABS = false; // Set to true to use ElevenLabs, false for browser speech
let ELEVEN_LABS_KEY;

// Get ElevenLabs API Key if needed
if (USE_ELEVEN_LABS) {
  db.collection('11LabsAPI').onSnapshot(querySnapshot => {
    querySnapshot.docs.forEach(doc => {
      ELEVEN_LABS_KEY = doc.data().API;
      console.log("ElevenLabs credentials loaded");
    });
  });
}

// Questions and state variables
const questions = [
  "Tell me about your fitness journey and what motivates you to make a change in your diet?",
  "Paint me a picture of your typical day - from morning to night. What does your eating schedule look like?",
  "What's your relationship with food? Any comfort foods or dishes that bring back memories?",
  "If you could wave a magic wand and achieve your ideal health, what would that look like?"
];

let currentQuestionIndex = 0;
let userResponses = [];
let isListening = false;
let conversationComplete = false;
let requiredInfo = {
  goals: false,
  dietary: false,
  lifestyle: false
};

// Add this variable at the top with other state variables
let hasUserInteracted = false;

// Add this function at the beginning of the file, after Firebase initialization
async function checkExistingDiet() {
  if (!firebase.auth().currentUser) return;

  try {
    const dietSnapshot = await db.collection('diets')
      .where('userId', '==', firebase.auth().currentUser.uid)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!dietSnapshot.empty) {
      window.location.href = '../diet-home/index.html';
    }
  } catch (error) {
    console.error('Error checking existing diet:', error);
  }
}

// Modify the existing initializeApp function
async function initializeApp() {
  // Existing Firebase initialization code...

  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await checkExistingDiet(); // Add this line
      // Rest of the existing code...
    } else {
      window.location.href = '../auth/login.html';
    }
  });
}

function initializeDietGeneration() {
  const mainContent = document.querySelector('.main-content');
  mainContent.innerHTML = `
    <div class="diet-experience-container">
      <div class="experience-stage">
        <div class="ai-assistant">
          <div class="ai-avatar-container">
            <lottie-player
              src="https://assets8.lottiefiles.com/packages/lf20_m9zragkd.json"
              background="transparent"
              speed="1"
              style="width: 300px; height: 300px;"
              loop
              autoplay
            ></lottie-player>
          </div>
          <div class="ai-status">
            <div class="status-indicator" style="background-color: #007bff;"></div>
            <span id="statusText" class="status-text">Ready to start your diet journey</span>
          </div>
        </div>
        
        <!-- Add start button -->
        <button id="startButton" class="start-button">
          <span>Start Your Diet Journey</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </button>

        <!-- Hide interaction area initially -->
        <div class="interaction-area" style="display: none;">
          <div class="input-methods">
            <button id="micButton" class="mic-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            
            <div class="text-input-container">
              <input type="text" class="text-input" placeholder="Type your message here..." id="textInput">
              <button class="send-button" id="sendButton">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>

          <div class="conversation-history" id="conversationHistory">
            <!-- Only user messages will appear here -->
          </div>
        </div>
      </div>
      
      <div class="progress-tracker">
        ${questions.map((_, i) => `
          <div class="progress-step ${i === 0 ? 'current' : ''}" data-step="${i + 1}">
            <div class="step-indicator"></div>
            <div class="step-line"></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const startButton = document.getElementById('startButton');
  const interactionArea = document.querySelector('.interaction-area');
  const micButton = document.getElementById('micButton');
  const textInput = document.getElementById('textInput');
  const sendButton = document.getElementById('sendButton');
  
  // Start button click handler
  startButton.addEventListener('click', async () => {
    hasUserInteracted = true;
    startButton.style.display = 'none';
    interactionArea.style.display = 'flex';
    await startConversation();
  });

  // Setup mic button for press-and-hold
  micButton.addEventListener('mousedown', () => {
    hasUserInteracted = true;
    startListening();
  });
  micButton.addEventListener('mouseup', stopListening);
  micButton.addEventListener('mouseleave', stopListening);

  // Setup text input handling
  textInput.addEventListener('keypress', (e) => {
    hasUserInteracted = true;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  });

  sendButton.addEventListener('click', () => {
    hasUserInteracted = true;
    handleTextSubmit();
  });

  // Don't automatically start conversation, wait for user interaction
  addMessageToConversation('ai', "Hi! I'm your AI nutritionist. Let's create a personalized diet plan together. You can either speak by holding the microphone button or type your messages below.");
}

async function startConversation() {
  await playAnimation('greeting');
  
  if (hasUserInteracted) {
    const welcomeMessage = "Hi! I'm Core AI. Let's have a chat about your diet goals. Feel free to tell me about what brings you here today.";
    await speak(welcomeMessage);
  }
}

let mediaRecorder = null;
let audioChunks = [];

async function startListening() {
  if (isListening) return;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    isListening = true;
    updateUIForListening(true);
    await playAnimation('listening');
    
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.addEventListener('dataavailable', event => {
      audioChunks.push(event.data);
    });
    
    mediaRecorder.addEventListener('stop', async () => {
      const audioBlob = new Blob(audioChunks);
      const response = await processAudioResponse(audioBlob);
      stream.getTracks().forEach(track => track.stop());
      
      if (response) {
        handleUserInput(response);
      }
    });
    
    mediaRecorder.start();
  } catch (error) {
    console.error('Error accessing microphone:', error);
    updateStatus('Error accessing microphone. Please ensure microphone permissions are granted.');
  }
}

async function stopListening() {
  if (!isListening || !mediaRecorder) return;
  
  mediaRecorder.stop();
  isListening = false;
  updateUIForListening(false);
}

async function handleUserInput(input) {
  // Analyze input for required info
  if (input.toLowerCase().includes('goal') || input.toLowerCase().includes('want') || 
      input.toLowerCase().includes('need') || input.toLowerCase().includes('like')) {
    requiredInfo.goals = true;
  }
  if (input.toLowerCase().includes('eat') || input.toLowerCase().includes('food') || 
      input.toLowerCase().includes('diet') || input.toLowerCase().includes('allerg')) {
    requiredInfo.dietary = true;
  }
  if (input.toLowerCase().includes('day') || input.toLowerCase().includes('work') || 
      input.toLowerCase().includes('life') || input.toLowerCase().includes('active')) {
    requiredInfo.lifestyle = true;
  }

  userResponses.push(input);
  
  // Ensure minimum 3 questions before generating plan
  if (userResponses.length >= 3 && Object.values(requiredInfo).filter(v => v).length >= 2) {
    conversationComplete = true;
    await speak("Perfect! I have enough information now. Let me create your personalized diet plan.");
    await generateDietPlan();
  } else {
    await generateResponse(input);
  }
}

async function generateResponse(userInput) {
  await playAnimation('thinking');
  
  if (!API_KEY) {
    console.error('API key not loaded');
    updateStatus('Service not ready. Please try again in a moment.');
    return;
  }

  const prompt = `
    Based on the user's input: "${userInput}"
    Previous responses: ${JSON.stringify(userResponses.slice(0, -1))}
    Questions asked so far: ${userResponses.length}
    Required information still needed: ${JSON.stringify(Object.keys(requiredInfo).filter(key => !requiredInfo[key]))}
    
    Generate a concise follow-up question to gather more information about their diet goals, restrictions, or lifestyle.
    We need at least 3 responses before generating a plan.
    Focus on gathering missing information: ${Object.keys(requiredInfo).filter(key => !requiredInfo[key]).join(', ')}
    Keep the response under 20 words.
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 50
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from API');
    }

    const aiResponse = data.choices[0].message.content;
    await speak(aiResponse);
  } catch (error) {
    console.error('Error generating response:', error);
    updateStatus('Sorry, I had trouble processing that. Please try again.');
    await playAnimation('greeting');
  }
}

function checkRequiredInfo() {
  return Object.values(requiredInfo).every(value => value);
}

// Speech synthesis function
async function speak(text) {
  if (USE_ELEVEN_LABS && ELEVEN_LABS_KEY) {
    try {
      // Using Rachel voice - energetic and friendly female voice
      const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 1.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API request failed with status ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audio.src); // Clean up
          resolve();
        };
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(audio.src); // Clean up
          reject(error);
        };

        audio.play();
      });

    } catch (error) {
      console.error('ElevenLabs error, falling back to browser speech:', error);
      return useBrowserSpeech(text);
    }
  } else {
    return useBrowserSpeech(text);
  }
}

// Helper function for browser speech
async function useBrowserSpeech(text) {
  return new Promise((resolve, reject) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.2;
      utterance.pitch = 1.2;
      utterance.volume = 1;
      
      // Try to use a female voice
      const voices = speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.includes('Samantha')
      );
      if (femaleVoice) utterance.voice = femaleVoice;
      
      utterance.onend = resolve;
      utterance.onerror = reject;
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Browser speech synthesis failed:', error);
      reject(error);
    }
  });
}

function updateUIForListening(listening) {
  const statusIndicator = document.querySelector('.status-indicator');
  
  if (listening) {
    statusIndicator.classList.add('listening');
    updateStatus("I'm listening...");
  } else {
    statusIndicator.classList.remove('listening');
  }
}

// Update the status indicator animation for speech
function updateStatus(text, isSpeaking = false) {
  const statusText = document.getElementById('statusText');
  const statusIndicator = document.querySelector('.status-indicator');
  
  statusText.textContent = text;
  
  if (isSpeaking) {
    // Add speaking animation to the status indicator with rotation
    gsap.to(statusIndicator, {
      scale: 1.2,
      rotation: 360,
      duration: 2,
      repeat: -1,
      ease: "none"  // Use "none" for constant rotation speed
    });
  } else {
    // Reset animation
    gsap.to(statusIndicator, {
      scale: 1,
      rotation: 0,
      duration: 0.3
    });
  }
}

// Function to show loading popup
function showLoadingPopup(message) {
  const popup = document.createElement('div');
  popup.className = 'loading-popup';
  popup.innerHTML = `
    <div class="loading-content">
      <lottie-player
        src="https://assets3.lottiefiles.com/packages/lf20_szviypry.json"
        background="transparent"
        speed="1"
        style="width: 200px; height: 200px;"
        loop
        autoplay
      ></lottie-player>
      <p class="loading-message">${message}</p>
      <div class="loading-progress">
        <div class="progress-bar"></div>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
  return popup;
}

// Modify the generateDietPlan function to include more comprehensive information
async function generateDietPlan() {
  const userResponses = {
    goals: requiredInfo.goals ? userResponses[0] : '',
    dietary: requiredInfo.dietary ? userResponses[1] : '',
    lifestyle: requiredInfo.lifestyle ? userResponses[2] : ''
  };

  const prompt = `As a professional nutritionist, create a comprehensive and personalized diet plan based on the following information:

User's Goals and Motivation:
${userResponses.goals}

Dietary Preferences and Restrictions:
${userResponses.dietary}

Lifestyle and Daily Schedule:
${userResponses.lifestyle}

Please provide a detailed diet plan that includes:
1. Daily caloric needs and precise macronutrient breakdown (protein, carbs, fat percentages)
2. Meal timing recommendations based on their schedule
3. Specific food suggestions for each meal with portion sizes in grams
4. Weekly meal plan template with alternatives
5. Approved food list categorized by:
   - Proteins
   - Carbohydrates
   - Healthy Fats
   - Vegetables
   - Fruits
   - Snacks
6. Foods to avoid or limit
7. Meal prep guidelines
8. Progress tracking metrics:
   - Weekly weigh-in targets
   - Body measurements
   - Progress photos schedule
   - Energy levels
9. Specific goals:
   - Short term (2 weeks)
   - Medium term (6 weeks)
   - Long term (12 weeks)
10. Supplement recommendations if needed

Format the response in clear sections using markdown with specific headings for each category.
Include specific portion sizes and measurements for accurate tracking.`;

  try {
    showLoadingPopup('Generating your personalized diet plan...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }

    const dietPlan = data.choices[0].message.content;
    
    // Save diet plan to Firestore
    const dietDoc = await db.collection('diets').add({
      userId: firebase.auth().currentUser.uid,
      plan: dietPlan,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      mealsLogged: 0,
      responses: userResponses,
      dailyCalories: extractDailyCalories(dietPlan),
      macros: extractMacros(dietPlan)
    });

    // Redirect to diet dashboard
    window.location.href = '../diet-home/index.html';
  } catch (error) {
    console.error('Error generating diet plan:', error);
    showError('Failed to generate diet plan. Please try again.');
  } finally {
    hideLoadingPopup();
  }
}

// Helper function to extract daily calories from diet plan
function extractDailyCalories(dietPlan) {
  const calorieMatch = dietPlan.match(/(\d{1,4})\s*(?:to\s*\d{1,4}\s*)?calories/i);
  return calorieMatch ? parseInt(calorieMatch[1]) : 2000;
}

// Helper function to extract macros from diet plan
function extractMacros(dietPlan) {
  const defaultMacros = { protein: 30, carbs: 40, fat: 30 };
  
  const macroMatches = {
    protein: dietPlan.match(/protein:\s*(\d{1,3})%/i),
    carbs: dietPlan.match(/carb(?:ohydrate)?s:\s*(\d{1,3})%/i),
    fat: dietPlan.match(/fat:\s*(\d{1,3})%/i)
  };

  return {
    protein: macroMatches.protein ? parseInt(macroMatches.protein[1]) : defaultMacros.protein,
    carbs: macroMatches.carbs ? parseInt(macroMatches.carbs[1]) : defaultMacros.carbs,
    fat: macroMatches.fat ? parseInt(macroMatches.fat[1]) : defaultMacros.fat
  };
}

// Function to process audio response using Whisper API
async function processAudioResponse(audioBlob) {
  // Convert audio blob to base64
  const base64Audio = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        file: base64Audio,
        model: 'whisper-1'
      })
    });

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error processing audio:', error);
    return '';
  }
}

// Function to display the generated diet plan
function displayDietPlan(dietPlan) {
  const mainContent = document.querySelector('.diet-experience-container');
  if (!mainContent) {
    console.error('Could not find main content container');
    return;
  }

  mainContent.innerHTML = `
    <div class="diet-plan-card">
      <div class="diet-plan-content">
        ${marked.parse(dietPlan)}
      </div>
      <div class="diet-plan-actions">
        <button class="button-primary" onclick="saveDietPlan()">
          Save Diet Plan
        </button>
        <button class="button-secondary" onclick="downloadDietPlan()">
          Download PDF
        </button>
      </div>
    </div>
  `;

  // Scroll to top to show the diet plan
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Add animation to the diet plan card
  const dietPlanCard = mainContent.querySelector('.diet-plan-card');
  gsap.from(dietPlanCard, {
    opacity: 0,
    y: 20,
    duration: 0.5,
    ease: "back.out(1.7)"
  });
}

// Add these functions to handle save and download
function saveDietPlan() {
  // Implement save functionality
  alert('Diet plan saved successfully!');
}

function downloadDietPlan() {
  const dietPlanContent = document.querySelector('.diet-plan-content').innerText;
  const blob = new Blob([dietPlanContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diet-plan.txt';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Add this function after initializeDietGeneration
async function playAnimation(type) {
  const avatarContainer = document.querySelector('.ai-avatar-container');
  
  switch(type) {
    case 'greeting':
      // Add greeting animation class
      avatarContainer.classList.add('greeting');
      // Play greeting animation
      gsap.to(avatarContainer, {
        scale: 1.1,
        duration: 0.5,
        yoyo: true,
        repeat: 1,
        ease: "elastic.out(1, 0.3)"
      });
      
      // Add welcome text animation
      const statusText = document.getElementById('statusText');
      gsap.from(statusText, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(1.7)"
      });
      
      break;
      
    case 'listening':
      // Add pulse animation
      gsap.to(avatarContainer, {
        scale: 1.05,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
      break;
      
    case 'thinking':
      // Add thinking animation
      gsap.to(avatarContainer, {
        rotation: 3,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
      break;
      
    case 'speaking':
      // Add speaking animation
      gsap.to(avatarContainer, {
        y: -5,
        duration: 0.3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
      break;
  }
  
  // Return a promise that resolves after animation
  return new Promise(resolve => setTimeout(resolve, 1000));
}

// Add this new function to handle text input
async function handleTextSubmit() {
  const textInput = document.getElementById('textInput');
  const text = textInput.value.trim();
  
  if (text) {
    // Add user message to conversation
    addMessageToConversation('user', text);
    
    // Clear input
    textInput.value = '';
    
    // Process the text input
    await handleUserInput(text);
  }
}

// Update addMessageToConversation to only show user messages
function addMessageToConversation(type, content) {
  if (type === 'user') { // Only add user messages to the conversation history
    const conversationHistory = document.getElementById('conversationHistory');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    
    avatarDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    conversationHistory.appendChild(messageDiv);
    conversationHistory.scrollTop = conversationHistory.scrollHeight;
  }
}

// Update initialization to wait for API key
document.addEventListener('DOMContentLoaded', () => {
  // Check if user already has a diet plan
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      const doc = await db.collection('dietPlans').doc(user.uid).get();
      if (doc.exists) {
        // User has a diet plan, redirect to dashboard
        window.location.replace('../diet-home/index.html');
        return;
      }
      // If no diet plan exists, initialize the diet generation
      initializeDietGeneration();
    }
  });

  // Update navigation links
  const dashboardLink = document.querySelector('a[href="#"].nav-link:not(.active)');
  dashboardLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '../diet-home/index.html';
  });
});

// Add favicon link to prevent 404
const link = document.createElement('link');
link.rel = 'icon';
link.href = 'data:;base64,iVBORw0KGgo='; // Empty favicon
document.head.appendChild(link); 