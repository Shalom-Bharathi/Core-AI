// API Keys and configuration
let API_KEY;
let thingsRefx;
let unsubscribex;
let db = firebase.firestore();
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

// Remove PlayHT configuration and update ElevenLabs configuration
let db2 = firebase.firestore();
let thingsRef2EL = db2.collection('11LabsAPI');
let ELEVEN_LABS_KEY;

// Get ElevenLabs credentials
unsubscribex = thingsRef2EL.onSnapshot(querySnapshot => {
  querySnapshot.docs.forEach(doc => {
    ELEVEN_LABS_KEY = doc.data().API;
    console.log("ElevenLabs credentials loaded");
  });
});

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

// Initialize Firebase and get user's diet plan
let dietPlan = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.replace('../generate-diets/index.html');
      return;
    }

    try {
      const doc = await db.collection('dietPlans').doc(user.uid).get();
      if (!doc.exists) {
        window.location.replace('../generate-diets/index.html');
        return;
      }

      const dietPlan = doc.data().plan;
      initializeDashboard(dietPlan);
    } catch (error) {
      console.error('Error loading diet plan:', error);
      window.location.replace('../generate-diets/index.html');
    }
  });

  // Update navigation links
  const generateDietLink = document.querySelector('a[href="#"].nav-link:not(.active)');
  generateDietLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '../generate-diets/index.html';
  });
});

function initializeDashboard(plan) {
  // Update overview section
  document.getElementById('planName').textContent = plan.planName;
  document.getElementById('planOverview').textContent = plan.overview;
  document.getElementById('dailyCalories').textContent = plan.dailyCalories;
  document.getElementById('waterIntake').textContent = plan.waterIntake;
  document.getElementById('exerciseFreq').textContent = 
    `${plan.exerciseRecommendations.frequency} × ${plan.exerciseRecommendations.duration}min`;

  // Initialize macro chart
  initializeMacroChart(plan.macroSplit);

  // Update meal cards
  updateMealCards(plan.mealStructure);

  // Update weekly schedule
  updateWeeklySchedule(plan.weeklySchedule);

  // Update food lists
  updateFoodLists(plan.foodList);

  // Update tips
  updateTips(plan.tips);
}

function initializeMacroChart(macros) {
  const ctx = document.getElementById('macroChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Carbs', 'Fats'],
      datasets: [{
        data: [macros.protein, macros.carbs, macros.fats],
        backgroundColor: ['#4F46E5', '#10B981', '#F59E0B']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function updateMealCards(mealStructure) {
  const mealCardsContainer = document.querySelector('.meal-cards');
  mealCardsContainer.innerHTML = ''; // Clear existing cards

  // Create cards for each meal type
  Object.entries(mealStructure).forEach(([meal, data]) => {
    const card = document.createElement('div');
    card.className = 'meal-card';
    card.id = `${meal}Card`;
    
    card.innerHTML = `
      <h3>${meal.charAt(0).toUpperCase() + meal.slice(1)}</h3>
      <div class="meal-time">${data.timing}</div>
      <div class="meal-calories">${data.calories}</div>
      <div class="meal-suggestions">
        ${data.suggestions.map(suggestion => 
          `<div class="suggestion">${suggestion}</div>`
        ).join('')}
      </div>
    `;
    
    mealCardsContainer.appendChild(card);
  });
}

function updateWeeklySchedule(weeklySchedule) {
  const scheduleContainer = document.getElementById('weeklySchedule');
  scheduleContainer.innerHTML = `
    <div class="schedule-grid">
      ${Object.entries(weeklySchedule).map(([day, meals]) => `
        <div class="day-card">
          <h3>${day.charAt(0).toUpperCase() + day.slice(1)}</h3>
          ${Object.entries(meals).map(([mealType, meal]) => `
            <div class="schedule-meal">
              <strong>${mealType}:</strong> ${meal || 'Not specified'}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function updateFoodLists(foodList) {
  const includeFoodsList = document.getElementById('includeFoods');
  const avoidFoodsList = document.getElementById('avoidFoods');

  includeFoodsList.innerHTML = foodList.include
    .map(food => `<li>${food}</li>`)
    .join('');
    
  avoidFoodsList.innerHTML = foodList.avoid
    .map(food => `<li>${food}</li>`)
    .join('');
}

function updateTips(tips) {
  const tipsGrid = document.getElementById('tipsGrid');
  tipsGrid.innerHTML = tips
    .map(tip => `
      <div class="tip-card">
        <svg xmlns="http://www.w3.org/2000/svg" class="tip-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <p>${tip}</p>
      </div>
    `)
    .join('');
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

// Update the speak function to handle speech synthesis directly
async function speak(text) {
  updateStatus('Speaking...', true);
  await playAnimation('speaking');
  
  try {
    await generateSpeech(text);
    await playAnimation('greeting');
    updateStatus('Ready', false);
  } catch (error) {
    console.error('Error in speak function:', error);
    // Fall back to browser speech synthesis if PlayHT fails
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    } catch (fallbackError) {
      console.error('Fallback speech synthesis failed:', fallbackError);
    }
    updateStatus('Voice temporarily unavailable', false);
    await playAnimation('greeting');
  }
}

// Update generateSpeech to use ElevenLabs
async function generateSpeech(text) {
  return new Promise(async (resolve, reject) => {
    if (!ELEVEN_LABS_KEY) {
      console.error('ElevenLabs key not loaded');
      reject(new Error('ElevenLabs key not loaded'));
      return;
    }

    try {
      // Using Rachel voice - energetic and friendly female voice
      const VOICE_ID = "XiPS9cXxAVbaIWtGDHDh";
      
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
      
      audio.onended = () => {
        URL.revokeObjectURL(audio.src); // Clean up
        resolve();
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(audio.src); // Clean up
        reject(error);
      };

      await audio.play();

    } catch (error) {
      console.error('Error generating speech:', error);
      // Fall back to browser's speech synthesis
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
      
      utterance.onend = () => resolve();
      utterance.onerror = reject;
      speechSynthesis.speak(utterance);
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
    'Generating personalized diet plan...'
  ];

  const popup = showLoadingPopup(loadingStates[0]);
  
  try {
    // Simulate loading states
    for (let i = 0; i < loadingStates.length; i++) {
      popup.querySelector('p').textContent = loadingStates[i];
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const prompt = `
      Generate a detailed diet plan based on the following user responses:
      ${userResponses.map((response, index) => `Response ${index + 1}: ${response}`).join('\n')}
      
      Please provide a structured response including:
      1. Diet Plan Name
      2. Overview
      3. Daily Meal Structure
      4. Foods to Include
      5. Foods to Avoid
      6. Tips and Recommendations
      
      Format the response in markdown.
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
        max_tokens: 1000 // Increase token limit for detailed plan
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from API');
    }

    const dietPlan = data.choices[0].message.content;
    
    // Remove loading popup
    popup.remove();
    
    // Display the diet plan
    displayDietPlan(dietPlan);
    
    // Speak the completion message
    const completionMessage = "Your personalized diet plan is ready! Take a moment to review it.";
    await speak(completionMessage);

  } catch (error) {
    console.error('Error generating diet plan:', error);
    popup.remove();
    updateStatus('Error generating diet plan. Please try again.');
    conversationComplete = false;
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
  // Only initialize if API key is already loaded
  if (API_KEY) {
    initializeDietGeneration();
  }
  // Otherwise, the onSnapshot callback will initialize when API key loads
});

// Add favicon link to prevent 404
const link = document.createElement('link');
link.rel = 'icon';
link.href = 'data:;base64,iVBORw0KGgo='; // Empty favicon
document.head.appendChild(link); 