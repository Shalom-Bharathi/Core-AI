// db is already available from firebase-config.js

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication and load diet plan
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
    }
  });

  // Update navigation links
  const generateDietLink = document.querySelector('a[href="#"].nav-link:not(.active)');
  if (generateDietLink) {
    generateDietLink.addEventListener('click', (e) => {
      e.preventDefault();
      const user = firebase.auth().currentUser;
      if (user) {
        db.collection('dietPlans').doc(user.uid).delete()
          .then(() => {
            window.location.href = '../generate-diets/index.html';
          })
          .catch(error => console.error('Error deleting diet plan:', error));
      }
    });
  }

  // Initialize food analysis
  initializeFoodAnalysis();
});

function initializeDashboard(plan) {
  console.log('Initializing dashboard with plan:', plan); // Debug log

  // Update overview section
  document.getElementById('planName').textContent = plan.planName || 'Your Diet Plan';
  document.getElementById('planOverview').textContent = plan.overview || '';
  document.getElementById('dailyCalories').textContent = plan.dailyCalories || '0';
  document.getElementById('waterIntake').textContent = plan.waterIntake || '0L';
  document.getElementById('exerciseFreq').textContent = 
    plan.exerciseRecommendations ? 
    `${plan.exerciseRecommendations.frequency} × ${plan.exerciseRecommendations.duration}min` : 
    'Not specified';

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
  // Wait for next tick to ensure DOM is ready
  setTimeout(() => {
    const canvas = document.getElementById('macroChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Convert percentage strings to numbers
    const proteinValue = parseInt(macros.protein) || 0;
    const carbsValue = parseInt(macros.carbs) || 0;
    const fatsValue = parseInt(macros.fats) || 0;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Protein', 'Carbs', 'Fats'],
        datasets: [{
          data: [proteinValue, carbsValue, fatsValue],
          backgroundColor: ['#4F46E5', '#10B981', '#F59E0B'],
          borderWidth: 0,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: {
                family: 'Inter',
                size: 12
              }
            }
          }
        }
      }
    });
  }, 0);
}

function updateMealCards(mealStructure) {
  const mealCardsContainer = document.querySelector('.meal-cards');
  if (!mealCardsContainer) return;
  
  mealCardsContainer.innerHTML = ''; // Clear existing cards

  Object.entries(mealStructure).forEach(([meal, data]) => {
    const card = document.createElement('div');
    card.className = 'meal-card';
    
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
  if (!scheduleContainer) return;

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

  if (includeFoodsList) {
    includeFoodsList.innerHTML = foodList.include
      .map(food => `<li>${food}</li>`)
      .join('');
  }
    
  if (avoidFoodsList) {
    avoidFoodsList.innerHTML = foodList.avoid
      .map(food => `<li>${food}</li>`)
      .join('');
  }
}

function updateTips(tips) {
  const tipsGrid = document.getElementById('tipsGrid');
  if (tipsGrid) {
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
}

// Food Analysis Feature
function initializeFoodAnalysis() {
  const uploadButton = document.getElementById('uploadButton');
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const analysisResults = document.getElementById('analysisResults');

  uploadButton.addEventListener('click', () => {
    imageInput.click();
  });

  imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="Food preview">`;
    };
    reader.readAsDataURL(file);

    // Analyze image
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Show loading state
      analysisResults.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Analyzing your food...</p>
        </div>
      `;

      const response = await fetch('https://api.logmeal.es/v2/image/recognition/complete', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer ca01efa88f621340ab3df2b3ec6c1943c15302ed'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response:', data); // Add this to see the response
      displayNutritionInfo(data);
    } catch (error) {
      console.error('Error analyzing food:', error);
      analysisResults.innerHTML = `
        <div class="error-message">
          Failed to analyze image: ${error.message}
        </div>
      `;
    }
  });
}

function displayNutritionInfo(data) {
  const nutritionInfo = document.querySelector('.nutrition-info');
  
  // Format the nutrition data
  const nutrients = {
    calories: data.nutritional_info?.calories || 'N/A',
    protein: data.nutritional_info?.protein || 'N/A',
    carbs: data.nutritional_info?.carbohydrates || 'N/A',
    fat: data.nutritional_info?.fat || 'N/A',
    fiber: data.nutritional_info?.fiber || 'N/A'
  };

  // Create nutrition cards
  nutritionInfo.innerHTML = `
    <div class="nutrition-card">
      <h4>Calories</h4>
      <div class="value">${nutrients.calories} kcal</div>
    </div>
    <div class="nutrition-card">
      <h4>Protein</h4>
      <div class="value">${nutrients.protein}g</div>
    </div>
    <div class="nutrition-card">
      <h4>Carbs</h4>
      <div class="value">${nutrients.carbs}g</div>
    </div>
    <div class="nutrition-card">
      <h4>Fat</h4>
      <div class="value">${nutrients.fat}g</div>
    </div>
    <div class="nutrition-card">
      <h4>Fiber</h4>
      <div class="value">${nutrients.fiber}g</div>
    </div>
  `;

  // Add food recognition results
  if (data.recognition_results?.length > 0) {
    const foodItems = data.recognition_results.map(item => 
      `<div class="food-item">
        <span class="food-name">${item.name}</span>
        <span class="confidence">${Math.round(item.confidence * 100)}%</span>
      </div>`
    ).join('');

    nutritionInfo.insertAdjacentHTML('beforeend', `
      <div class="recognized-foods">
        <h4>Recognized Foods</h4>
        ${foodItems}
      </div>
    `);
  }
}

// Add these styles to your CSS
const additionalStyles = `
  .nutrition-card {
    background: white;
    padding: 1rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .nutrition-card h4 {
    color: var(--muted);
    margin-bottom: 0.5rem;
  }

  .nutrition-card .value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary);
  }

  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--primary-light);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .recognized-foods {
    grid-column: 1 / -1;
    margin-top: 1rem;
  }

  .food-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    background: white;
    border-radius: 0.5rem;
    margin-top: 0.5rem;
  }

  .confidence {
    color: var(--primary);
    font-weight: 500;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
