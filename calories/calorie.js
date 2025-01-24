import './calorie.css';


let stream = null;
let selectedImage = null;

// DOM Elements
const cameraPreview = document.getElementById('camera-preview');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const captureButton = document.getElementById('capture-button');
const cameraToggle = document.getElementById('camera-toggle');
const analyzeButton = document.getElementById('analyze-button');
const dietInput = document.getElementById('diet-input');
const loadingSpinner = document.getElementById('loading-spinner');
const analyzeText = document.getElementById('analyze-text');
const resultsSection = document.getElementById('results-section');

// Camera handling
window.toggleCamera = async () => {
  if (stream) {
    stopCamera();
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment'
      } 
    });
    cameraPreview.srcObject = stream;
    cameraPreview.play();
    cameraPreview.classList.remove('hidden');
    imagePreviewContainer.classList.add('hidden');
    captureButton.classList.remove('hidden');
    cameraToggle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:scale-110 transition-transform duration-200">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
      Close Camera
    `;
    selectedImage = null;
    updateAnalyzeButton();
  } catch (err) {
    console.error('Error accessing camera:', err);
    alert('Unable to access camera. Please ensure you have granted camera permissions.');
  }
};

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  cameraPreview.classList.add('hidden');
  captureButton.classList.add('hidden');
  cameraToggle.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:scale-110 transition-transform duration-200">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
    Open Camera
  `;
};

window.captureImage = () => {
  const canvas = document.createElement('canvas');
  canvas.width = cameraPreview.videoWidth;
  canvas.height = cameraPreview.videoHeight;
  canvas.getContext('2d').drawImage(cameraPreview, 0, 0);
  selectedImage = canvas.toDataURL('image/jpeg');
  
  imagePreview.src = selectedImage;
  imagePreviewContainer.classList.remove('hidden');
  stopCamera();
  updateAnalyzeButton();
};

window.handleImageUpload = (event) => {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      selectedImage = reader.result;
      imagePreview.src = selectedImage;
      imagePreviewContainer.classList.remove('hidden');
      stopCamera();
      updateAnalyzeButton();
    };
    reader.readAsDataURL(file);
  }
};

window.clearImage = () => {
  selectedImage = null;
  imagePreviewContainer.classList.add('hidden');
  updateAnalyzeButton();
};

const updateAnalyzeButton = () => {
  const diet = dietInput.value.trim();
  const canAnalyze = selectedImage && diet;
  analyzeButton.disabled = !canAnalyze;
  analyzeButton.className = `w-full py-4 px-6 rounded-xl text-white font-medium transition-all duration-200 group ${
    canAnalyze ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-purple-500/20' : 'bg-gray-400'
  }`;
};

dietInput.addEventListener('input', updateAnalyzeButton);

window.analyzeImage = async () => {
  if (!selectedImage || !dietInput.value.trim()) return;

  // Show loading state
  analyzeButton.disabled = true;
  loadingSpinner.classList.remove('hidden');
  loadingSpinner.classList.add('flex');
  analyzeText.classList.add('hidden');
  resultsSection.classList.add('hidden');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this food image and provide a JSON response with the following information:
                {
                  "foodName": "name of the dish",
                  "ingredients": "list of main ingredients",
                  "calories": "estimated calories here",
                  "macronutrients": {
                    "protein": "protein amount",
                    "carbs": "carbs amount",
                    "fat": "fat amount"
                  },
                  "dietCompatibility": "compatibility with ${dietInput.value} diet and explanation"
                }`
              },
              {
                type: "image_url",
                image_url: {
                  url: selectedImage
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in response');
    }

    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Update results with fade-in animation
    resultsSection.style.opacity = '0';
    resultsSection.classList.remove('hidden');
    document.getElementById('food-name-result').textContent = analysis.foodName || 'Unable to determine';
    document.getElementById('ingredients-result').textContent = analysis.ingredients || 'Unable to determine';
    document.getElementById('calories-result').textContent = analysis.calories || 'Unable to determine';
    document.getElementById('protein-result').textContent = analysis.macronutrients?.protein || 'N/A';
    document.getElementById('carbs-result').textContent = analysis.macronutrients?.carbs || 'N/A';
    document.getElementById('fat-result').textContent = analysis.macronutrients?.fat || 'N/A';
    document.getElementById('diet-result').textContent = analysis.dietCompatibility || 'Unable to analyze';
    
    // Trigger reflow for animation
    resultsSection.offsetHeight;
    resultsSection.style.transition = 'opacity 0.3s ease-in-out';
    resultsSection.style.opacity = '1';
  } catch (error) {
    console.error('Error analyzing image:', error);
    
    // Show fallback results
    resultsSection.style.opacity = '0';
    resultsSection.classList.remove('hidden');
    document.getElementById('food-name-result').textContent = 'Unable to determine';
    document.getElementById('ingredients-result').textContent = 'Unable to determine';
    document.getElementById('calories-result').textContent = 'Unable to determine';
    document.getElementById('protein-result').textContent = 'N/A';
    document.getElementById('carbs-result').textContent = 'N/A';
    document.getElementById('fat-result').textContent = 'N/A';
    document.getElementById('diet-result').textContent = 'Unable to analyze';
    
    // Trigger reflow for animation
    resultsSection.offsetHeight;
    resultsSection.style.transition = 'opacity 0.3s ease-in-out';
    resultsSection.style.opacity = '1';
  } finally {
    // Reset loading state
    analyzeButton.disabled = false;
    loadingSpinner.classList.add('hidden');
    loadingSpinner.classList.remove('flex');
    analyzeText.classList.remove('hidden');
    updateAnalyzeButton();
  }
};