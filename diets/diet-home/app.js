// Global variables
let db;
let auth;
let storage;
let currentUser = null;
let currentDiet = null;
let API_KEY;

// Initialize Firebase
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

// Initialize Firebase and load API keys
async function initializeApp() {
  // Initialize Firebase if not already initialized
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Initialize Firebase services
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();

  // Load API keys
  try {
    const apiKeysSnapshot = await db.collection('API').get();
    apiKeysSnapshot.forEach(doc => {
      API_KEY = doc.data().API;
      console.log("API Key loaded successfully");
    });
  } catch (error) {
    console.error("Error loading API key:", error);
  }

  // Auth state change listener
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserDiet();
    } else {
      window.location.href = '../auth/login.html';
    }
  });
}

// Load user's diet plan
async function loadUserDiet() {
  try {
    const dietSnapshot = await db.collection('diets')
      .where('userId', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (dietSnapshot.empty) {
      window.location.href = '../generate-diets/index.html';
      return;
    }

    currentDiet = {
      id: dietSnapshot.docs[0].id,
      ...dietSnapshot.docs[0].data()
    };
    
    updateDietOverview();
    await loadMealHistory();
    initializeCharts();
  } catch (error) {
    console.error('Error loading diet:', error);
    showError('Failed to load diet plan');
  }
}

// API Keys and configuration
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

// Function to generate diet plan
async function generateDietPlan() {
  const loadingStates = [
    'Analyzing your preferences...',
    'Calculating nutritional requirements...',
    'Generating personalized diet plan...',
    'Saving your plan...'
  ];

  const popup = showLoadingPopup(loadingStates[0]);
  
  try {
    // Show loading states
    for (let i = 0; i < loadingStates.length - 1; i++) {
      popup.querySelector('p').textContent = loadingStates[i];
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const prompt = `
      Based on the following user responses:
      ${userResponses.map((response, index) => `Response ${index + 1}: ${response}`).join('\n')}
      
      Generate a comprehensive diet plan in the following JSON structure:
      {
        "planName": "Name of the personalized diet plan",
        "overview": "Brief overview of the diet plan",
        "dailyCalories": "Estimated daily calorie intake",
        "macroSplit": {
          "protein": "percentage",
          "carbs": "percentage",
          "fats": "percentage"
        },
        "mealStructure": {
          "breakfast": {
            "timing": "Recommended timing",
            "calories": "Calories for this meal",
            "suggestions": ["3-4 meal suggestions"]
          },
          "lunch": {
            "timing": "Recommended timing",
            "calories": "Calories for this meal",
            "suggestions": ["3-4 meal suggestions"]
          },
          "dinner": {
            "timing": "Recommended timing",
            "calories": "Calories for this meal",
            "suggestions": ["3-4 meal suggestions"]
          },
          "snacks": {
            "timing": "Recommended timing",
            "calories": "Calories per snack",
            "suggestions": ["3-4 snack suggestions"]
          }
        },
        "foodList": {
          "include": ["List of recommended foods"],
          "avoid": ["List of foods to avoid"]
        },
        "weeklySchedule": {
          "monday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
          "tuesday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
          "wednesday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
          "thursday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
          "friday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
          "saturday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
          "sunday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" }
        },
        "tips": ["List of 5-6 important tips and recommendations"],
        "waterIntake": "Daily water intake recommendation in liters",
        "supplements": ["Optional list of recommended supplements"],
        "exerciseRecommendations": {
          "type": "Recommended exercise type",
          "frequency": "Weekly frequency",
          "duration": "Minutes per session"
        }
      }
    `;

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

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const dietPlan = JSON.parse(data.choices[0].message.content);
    
    // Show saving state
    popup.querySelector('p').textContent = loadingStates[3];
    
    // Save to Firebase
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    await db.collection('dietPlans').doc(user.uid).set({
      plan: dietPlan,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      responses: userResponses
    });

    // Remove loading popup
    popup.remove();

    // Redirect to diet-home
    window.location.replace('../diet-home/index.html');

  } catch (error) {
    console.error('Error generating diet plan:', error);
    popup.remove();
    updateStatus('Error generating diet plan. Please try again.');
  }
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

// Update diet overview section
function updateDietOverview() {
  document.getElementById('dailyCalories').textContent = currentDiet.dailyCalories || '2000';
  document.getElementById('progressValue').textContent = calculateProgress() + '%';
  document.getElementById('mealsLogged').textContent = currentDiet.mealsLogged || '0';
}

// Calculate progress based on logged meals and goals
function calculateProgress() {
  if (!currentDiet || !currentDiet.mealsLogged) return 0;
  const totalMealsPerDay = 3;
  const daysActive = Math.ceil((Date.now() - currentDiet.createdAt.toDate()) / (1000 * 60 * 60 * 24));
  const expectedMeals = daysActive * totalMealsPerDay;
  return Math.min(Math.round((currentDiet.mealsLogged / expectedMeals) * 100), 100);
}

// Meal type selection
const mealTypeButtons = document.querySelectorAll('.meal-type-btn');
let selectedMealType = 'breakfast';

mealTypeButtons.forEach(button => {
  button.addEventListener('click', () => {
    mealTypeButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    selectedMealType = button.dataset.mealType;
  });
});

// Log meal functionality
const logMealBtn = document.getElementById('logMealBtn');
const mealInput = document.getElementById('mealInput');

logMealBtn.addEventListener('click', async () => {
  if (!mealInput.value.trim()) return;

  try {
    await logMeal({
      type: selectedMealType,
      description: mealInput.value.trim(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    mealInput.value = '';
    showSuccess('Meal logged successfully');
  } catch (error) {
    console.error('Error logging meal:', error);
    showError('Failed to log meal');
  }
});

// Log meal to Firestore
async function logMeal(mealData) {
  const mealRef = db.collection('meals').doc();
  const dietRef = db.collection('diets').doc(currentDiet.id);

  await db.runTransaction(async (transaction) => {
    // Add meal
    transaction.set(mealRef, {
      ...mealData,
      userId: currentUser.uid,
      dietId: currentDiet.id
    });

    // Update diet stats
    transaction.update(dietRef, {
      mealsLogged: firebase.firestore.FieldValue.increment(1)
    });
  });

  await loadMealHistory();
  updateDietOverview();
}

// Load meal history
async function loadMealHistory() {
  try {
    const mealsSnapshot = await db.collection('meals')
      .where('userId', '==', currentUser.uid)
      .where('dietId', '==', currentDiet.id)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const historyContainer = document.getElementById('mealHistory');
    historyContainer.innerHTML = '';

    mealsSnapshot.forEach(doc => {
      const meal = doc.data();
      const mealElement = createMealHistoryElement(meal);
      historyContainer.appendChild(mealElement);
    });
  } catch (error) {
    console.error('Error loading meal history:', error);
    showError('Failed to load meal history');
  }
}

// Create meal history element
function createMealHistoryElement(meal) {
  const div = document.createElement('div');
  div.className = 'meal-history-item';
  
  const timestamp = meal.timestamp?.toDate() || new Date();
  const timeString = timestamp.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  const dateString = timestamp.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  div.innerHTML = `
    <div class="meal-info">
      <span class="meal-type">${meal.type}</span>
      <span class="meal-time">${timeString} - ${dateString}</span>
    </div>
    <p class="meal-description">${meal.description}</p>
  `;

  return div;
}

// Initialize charts
function initializeCharts() {
  initializeMacrosChart();
  initializeProgressChart();
}

// Initialize macros chart
function initializeMacrosChart() {
  const ctx = document.getElementById('macrosChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [30, 50, 20],
        backgroundColor: [
          'rgba(0, 123, 255, 0.8)',
          'rgba(40, 167, 69, 0.8)',
          'rgba(255, 193, 7, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Initialize progress chart
function initializeProgressChart() {
  const ctx = document.getElementById('progressChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Calories',
        data: [2100, 1950, 2200, 2000, 2300, 1800, 2100],
        borderColor: 'rgba(0, 123, 255, 0.8)',
        tension: 0.4,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Handle meal image upload
const uploadImageBtn = document.getElementById('uploadImageBtn');
const mealImageInput = document.getElementById('mealImage');

uploadImageBtn.addEventListener('click', () => {
  mealImageInput.click();
});

mealImageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    showLoading('Analyzing your meal...');
    
    // Upload image to Firebase Storage
    const storageRef = storage.ref(`meal-images/${currentUser.uid}/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    const imageUrl = await storageRef.getDownloadURL();

    // Call LogMeal AI API for analysis
    const analysis = await analyzeMealImage(imageUrl);
    
    // Display analysis results
    displayMealAnalysis(analysis);
    hideLoading();
  } catch (error) {
    console.error('Error analyzing meal:', error);
    showError('Failed to analyze meal image');
    hideLoading();
  }
});

// Analyze meal image using LogMeal AI
async function analyzeMealImage(imageUrl) {
  // TODO: Implement LogMeal AI API integration
  // This is a placeholder that returns mock data
  return {
    foodItems: ['Grilled Chicken', 'Brown Rice', 'Steamed Broccoli'],
    calories: 450,
    macros: {
      protein: 35,
      carbs: 45,
      fat: 15
    },
    suitability: 0.85
  };
}

// Display meal analysis results
function displayMealAnalysis(analysis) {
  const analysisContainer = document.getElementById('mealAnalysis');
  
  const suitabilityColor = analysis.suitability > 0.7 ? 'var(--success-color)' : 
                          analysis.suitability > 0.4 ? 'var(--warning-color)' : 
                          'var(--danger-color)';

  analysisContainer.innerHTML = `
    <div class="analysis-results">
      <div class="analysis-header">
        <h3>Detected Foods</h3>
        <span class="suitability-score" style="color: ${suitabilityColor}">
          ${Math.round(analysis.suitability * 100)}% Diet Match
        </span>
      </div>
      <ul class="detected-foods">
        ${analysis.foodItems.map(food => `<li>${food}</li>`).join('')}
      </ul>
      <div class="nutrition-info">
        <div class="calories">
          <span class="label">Calories</span>
          <span class="value">${analysis.calories}</span>
        </div>
        <div class="macros">
          <div class="macro">
            <span class="label">Protein</span>
            <span class="value">${analysis.macros.protein}g</span>
          </div>
          <div class="macro">
            <span class="label">Carbs</span>
            <span class="value">${analysis.macros.carbs}g</span>
          </div>
          <div class="macro">
            <span class="label">Fat</span>
            <span class="value">${analysis.macros.fat}g</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// UI Helpers
function showLoading(message) {
  const overlay = document.getElementById('loadingOverlay');
  const loadingMessage = document.getElementById('loadingMessage');
  loadingMessage.textContent = message;
  overlay.classList.remove('hidden');
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.add('hidden');
}

function showError(message) {
  // TODO: Implement error toast notification
  console.error(message);
}

function showSuccess(message) {
  // TODO: Implement success toast notification
  console.log(message);
}

// Initialize the application when the document is ready
document.addEventListener('DOMContentLoaded', initializeApp); 