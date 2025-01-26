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

// Global variables
let currentUser = null;
let userDietPlan = null;
let nutritionChart = null;
let macrosChart = null;
let API_KEY = null;

// Get API Key from Firebase
db.collection('API').onSnapshot(querySnapshot => {
  querySnapshot.docs.forEach(doc => {
    API_KEY = doc.data().API;
  });
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
  // Check authentication state
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserDietPlan();
      initializeCharts();
      initializeEventListeners();
      updateDashboardStats();
    } else {
      window.location.href = '../auth/login.html';
    }
  });
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

// Load user's diet plan from Firestore
async function loadUserDietPlan() {
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

    userDietPlan = dietSnapshot.docs[0].data();
    displayDietPlanPreview();
  } catch (error) {
    console.error('Error loading diet plan:', error);
  }
}

// Initialize Charts
function initializeCharts() {
  // Nutrition Overview Chart
  const nutritionCtx = document.getElementById('nutritionChart').getContext('2d');
  nutritionChart = new Chart(nutritionCtx, {
    type: 'line',
    data: {
      labels: getLast7Days(),
      datasets: [{
        label: 'Calories Consumed',
        data: [2100, 1950, 2200, 1800, 2300, 2000, 1900],
        borderColor: '#4f46e5',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });

  // Macronutrients Chart
  const macrosCtx = document.getElementById('macrosChart').getContext('2d');
  macrosChart = new Chart(macrosCtx, {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [30, 40, 30],
        backgroundColor: ['#4f46e5', '#22c55e', '#f59e0b']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Initialize Event Listeners
function initializeEventListeners() {
  // Log Meal Button
  document.getElementById('logMealBtn').addEventListener('click', () => {
    document.getElementById('logMealModal').style.display = 'flex';
  });

  // View Full Plan Button
  document.getElementById('viewFullPlanBtn').addEventListener('click', () => {
    document.getElementById('fullDietPlanModal').style.display = 'flex';
    document.getElementById('fullDietPlan').innerHTML = marked.parse(userDietPlan.plan);
  });

  // Meal Log Form
  document.getElementById('mealLogForm').addEventListener('submit', handleMealLog);

  // Meal Photo Input
  document.getElementById('mealPhotoInput').addEventListener('change', handleMealPhoto);
}

// Handle Meal Logging
async function handleMealLog(e) {
  e.preventDefault();

  const mealData = {
    userId: currentUser.uid,
    type: document.getElementById('mealType').value,
    foodItems: document.getElementById('foodItems').value,
    calories: parseInt(document.getElementById('calories').value),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('mealLogs').add(mealData);
    await updateUserStats(mealData.calories);
    closeModal('logMealModal');
    updateDashboardStats();
  } catch (error) {
    console.error('Error logging meal:', error);
  }
}

// Handle Meal Photo Analysis
async function handleMealPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    // First, upload the image and get its URL
    const imageUrl = await uploadImage(file);
    
    // Then analyze the image using GPT-4 Vision
    const analysis = await analyzeMealImage(imageUrl);
    
    // Display the analysis results
    displayMealAnalysis(analysis);
  } catch (error) {
    console.error('Error analyzing meal photo:', error);
  }
}

// Upload image to storage
async function uploadImage(file) {
  const storage = firebase.storage();
  const storageRef = storage.ref();
  const fileRef = storageRef.child(`meal-photos/${currentUser.uid}/${Date.now()}-${file.name}`);
  
  await fileRef.put(file);
  return await fileRef.getDownloadURL();
}

// Analyze meal image using GPT-4 Vision
async function analyzeMealImage(imageUrl) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this meal image and provide: 1) Estimated calories 2) Macronutrient breakdown 3) Whether it fits the user\'s diet plan 4) Suggestions for improvement'
          },
          {
            type: 'image_url',
            image_url: imageUrl
          }
        ]
      }],
      max_tokens: 500
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// Display meal analysis
function displayMealAnalysis(analysis) {
  const analysisContainer = document.getElementById('mealAnalysis');
  analysisContainer.innerHTML = `
    <div class="analysis-results">
      <h4>Meal Analysis</h4>
      <div class="analysis-content">${marked.parse(analysis)}</div>
    </div>
  `;
}

// Update user stats
async function updateUserStats(calories) {
  const userRef = db.collection('users').doc(currentUser.uid);
  await userRef.update({
    totalCalories: firebase.firestore.FieldValue.increment(calories),
    mealsLogged: firebase.firestore.FieldValue.increment(1)
  });
}

// Update Dashboard Stats
async function updateDashboardStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's meals
    const mealsSnapshot = await db.collection('mealLogs')
      .where('userId', '==', currentUser.uid)
      .where('timestamp', '>=', today)
      .get();

    let dailyCalories = 0;
    mealsSnapshot.forEach(doc => {
      dailyCalories += doc.data().calories;
    });

    // Update stats
    document.getElementById('dailyCalories').textContent = 
      `${dailyCalories}/${userDietPlan.dailyCalories}`;
    document.getElementById('mealsLogged').textContent = 
      mealsSnapshot.size;
    
    // Update next meal time
    updateNextMealTime();
    
    // Update charts
    updateCharts();
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Update Next Meal Time
function updateNextMealTime() {
  const now = new Date();
  const hours = now.getHours();
  
  let nextMeal = '';
  if (hours < 9) nextMeal = '9:00 AM (Breakfast)';
  else if (hours < 13) nextMeal = '1:00 PM (Lunch)';
  else if (hours < 19) nextMeal = '7:00 PM (Dinner)';
  else nextMeal = '9:00 AM (Breakfast)';

  document.getElementById('nextMeal').textContent = nextMeal;
}

// Update Charts with real data
async function updateCharts() {
  const last7Days = getLast7Days();
  const caloriesData = await getCaloriesData(last7Days);
  
  nutritionChart.data.datasets[0].data = caloriesData;
  nutritionChart.update();

  macrosChart.data.datasets[0].data = [
    userDietPlan.macros.protein,
    userDietPlan.macros.carbs,
    userDietPlan.macros.fat
  ];
  macrosChart.update();
}

// Get calories data for the last 7 days
async function getCaloriesData(dates) {
  const caloriesData = [];
  
  for (const date of dates) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const snapshot = await db.collection('mealLogs')
      .where('userId', '==', currentUser.uid)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    let dailyCalories = 0;
    snapshot.forEach(doc => {
      dailyCalories += doc.data().calories;
    });
    
    caloriesData.push(dailyCalories);
  }

  return caloriesData;
}

// Display Diet Plan Preview
function displayDietPlanPreview() {
  const previewElement = document.getElementById('dietPlanPreview');
  const fullPlanElement = document.getElementById('fullDietPlan');
  
  // Create a summary version for the preview
  const summary = userDietPlan.plan.split('\n').slice(0, 5).join('\n') + '\n\n...';
  
  previewElement.innerHTML = marked.parse(summary);
  fullPlanElement.innerHTML = marked.parse(userDietPlan.plan);
}

// Utility Functions
function getLast7Days() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
  }
  return dates;
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// Add favicon to prevent 404
const link = document.createElement('link');
link.rel = 'icon';
link.href = 'data:;base64,iVBORw0KGgo=';
document.head.appendChild(link); 