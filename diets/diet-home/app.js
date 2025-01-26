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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Global variables
let currentUser = null;
let userDiet = null;
let nutritionChart = null;
let progressChart = null;

// DOM Elements
const userNameElement = document.querySelector('.user-name');
const logoutBtn = document.querySelector('.logout-btn');
const mealLogForm = document.getElementById('meal-log-form');
const mealList = document.querySelector('.meal-list');
const uploadArea = document.getElementById('upload-area');
const mealImageInput = document.getElementById('meal-image-input');
const analysisResults = document.querySelector('.analysis-results');

// Authentication state observer
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    userNameElement.textContent = user.email;
    await loadUserDiet();
    await loadTodaysMeals();
    initializeCharts();
  } else {
    window.location.href = '../generate-diets/index.html';
  }
});

// Logout functionality
logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

// Load user's diet plan
async function loadUserDiet() {
  try {
    const dietRef = db.collection('diets').doc(currentUser.uid);
    const doc = await dietRef.get();

    if (doc.exists) {
      userDiet = doc.data();
      displayDietPlan(userDiet);
      updateProgress();
    } else {
      window.location.href = '../generate-diets/index.html';
    }
  } catch (error) {
    console.error('Error loading diet:', error);
  }
}

// Display diet plan
function displayDietPlan(diet) {
  const dietDetails = document.querySelector('.diet-details');
  dietDetails.innerHTML = `
    <div class="diet-info">
      <h3>Daily Goals</h3>
      <p>Calories: ${diet.dailyCalories} kcal</p>
      <p>Protein: ${diet.macros.protein}g</p>
      <p>Carbs: ${diet.macros.carbs}g</p>
      <p>Fats: ${diet.macros.fats}g</p>
    </div>
    <div class="diet-restrictions">
      <h3>Dietary Preferences</h3>
      <p>${diet.preferences || 'No specific preferences'}</p>
    </div>
  `;
}

// Meal logging functionality
mealLogForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const mealType = document.getElementById('meal-type').value;
  const foodItem = document.getElementById('food-item').value;
  const portionSize = document.getElementById('portion-size').value;

  try {
    const meal = {
      userId: currentUser.uid,
      mealType,
      foodItem,
      portionSize: Number(portionSize),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      date: new Date().toISOString().split('T')[0]
    };

    await db.collection('meals').add(meal);
    mealLogForm.reset();
    await loadTodaysMeals();
    updateProgress();
  } catch (error) {
    console.error('Error logging meal:', error);
  }
});

// Load today's meals
async function loadTodaysMeals() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const mealsRef = db.collection('meals')
      .where('userId', '==', currentUser.uid)
      .where('date', '==', today);

    const snapshot = await mealsRef.get();
    mealList.innerHTML = '';

    snapshot.forEach(doc => {
      const meal = doc.data();
      const mealElement = document.createElement('div');
      mealElement.className = 'meal-item';
      mealElement.innerHTML = `
        <div class="meal-info">
          <strong>${meal.mealType}</strong>
          <p>${meal.foodItem} - ${meal.portionSize}g</p>
        </div>
        <button class="delete-meal" data-id="${doc.id}">
          <i class='bx bx-trash'></i>
        </button>
      `;
      mealList.appendChild(mealElement);
    });

    // Add delete functionality
    document.querySelectorAll('.delete-meal').forEach(button => {
      button.addEventListener('click', async () => {
        const mealId = button.dataset.id;
        await db.collection('meals').doc(mealId).delete();
        await loadTodaysMeals();
        updateProgress();
      });
    });
  } catch (error) {
    console.error('Error loading meals:', error);
  }
}

// Initialize charts
function initializeCharts() {
  // Nutrition Distribution Chart
  const nutritionCtx = document.getElementById('nutrition-chart').getContext('2d');
  nutritionChart = new Chart(nutritionCtx, {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Carbs', 'Fats'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: ['#28a745', '#007bff', '#ffc107']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  // Progress Chart
  const progressCtx = document.getElementById('progress-chart').getContext('2d');
  progressChart = new Chart(progressCtx, {
    type: 'line',
    data: {
      labels: getLastSevenDays(),
      datasets: [{
        label: 'Calories',
        data: [],
        borderColor: '#007bff',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  updateCharts();
}

// Update progress bars and charts
async function updateProgress() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const mealsRef = await db.collection('meals')
      .where('userId', '==', currentUser.uid)
      .where('date', '==', today)
      .get();

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    mealsRef.forEach(doc => {
      const meal = doc.data();
      // This is a simplified calculation. In a real app, you'd want to use a food database API
      totalCalories += meal.portionSize * 2; // Example calculation
      totalProtein += meal.portionSize * 0.1;
      totalCarbs += meal.portionSize * 0.2;
      totalFats += meal.portionSize * 0.05;
    });

    // Update progress bars
    updateProgressBar('Calories', totalCalories, userDiet.dailyCalories);
    updateProgressBar('Protein', totalProtein, userDiet.macros.protein);
    updateProgressBar('Carbs', totalCarbs, userDiet.macros.carbs);
    updateProgressBar('Fats', totalFats, userDiet.macros.fats);

    // Update charts
    updateCharts();
  } catch (error) {
    console.error('Error updating progress:', error);
  }
}

// Update individual progress bar
function updateProgressBar(nutrient, current, target) {
  const progressBar = document.querySelector(`.stat:contains('${nutrient}') .progress`);
  const percentage = Math.min((current / target) * 100, 100);
  progressBar.style.width = `${percentage}%`;
}

// Update charts with new data
async function updateCharts() {
  if (!nutritionChart || !progressChart) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const mealsRef = await db.collection('meals')
      .where('userId', '==', currentUser.uid)
      .where('date', '==', today)
      .get();

    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    mealsRef.forEach(doc => {
      const meal = doc.data();
      totalProtein += meal.portionSize * 0.1;
      totalCarbs += meal.portionSize * 0.2;
      totalFats += meal.portionSize * 0.05;
    });

    // Update Nutrition Chart
    nutritionChart.data.datasets[0].data = [totalProtein, totalCarbs, totalFats];
    nutritionChart.update();

    // Update Progress Chart
    const weeklyData = await getWeeklyCalories();
    progressChart.data.datasets[0].data = weeklyData;
    progressChart.update();
  } catch (error) {
    console.error('Error updating charts:', error);
  }
}

// Get calories for the last 7 days
async function getWeeklyCalories() {
  const calories = [];
  const dates = getLastSevenDays();

  for (const date of dates) {
    const mealsRef = await db.collection('meals')
      .where('userId', '==', currentUser.uid)
      .where('date', '==', date)
      .get();

    let totalCalories = 0;
    mealsRef.forEach(doc => {
      const meal = doc.data();
      totalCalories += meal.portionSize * 2; // Example calculation
    });

    calories.push(totalCalories);
  }

  return calories;
}

// Get array of last 7 days
function getLastSevenDays() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Meal AI functionality
uploadArea.addEventListener('click', () => {
  mealImageInput.click();
});

mealImageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    // Upload image to Firebase Storage
    const storageRef = storage.ref(`meal-images/${currentUser.uid}/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    const imageUrl = await storageRef.getDownloadURL();

    // Here you would integrate with a food recognition API (e.g., LogMeal AI)
    // For now, we'll show a mock analysis
    showMealAnalysis(imageUrl);
  } catch (error) {
    console.error('Error processing image:', error);
  }
});

// Show meal analysis results
function showMealAnalysis(imageUrl) {
  analysisResults.style.display = 'block';
  analysisResults.innerHTML = `
    <div class="image-preview">
      <img src="${imageUrl}" alt="Meal" style="width: 100%; height: 100%; object-fit: cover;">
    </div>
    <div class="analysis-data">
      <div class="nutrient-card">
        <h4>Estimated Calories</h4>
        <p>350 kcal</p>
      </div>
      <div class="nutrient-card">
        <h4>Protein</h4>
        <p>15g</p>
      </div>
      <div class="nutrient-card">
        <h4>Carbs</h4>
        <p>45g</p>
      </div>
      <div class="nutrient-card">
        <h4>Fats</h4>
        <p>12g</p>
      </div>
    </div>
    <div class="diet-compatibility mt-4">
      <h4>Diet Compatibility</h4>
      <p class="text-success">✓ This meal aligns with your diet plan</p>
    </div>
  `;
}

// Helper function for jQuery-like contains selector
Element.prototype.contains = function(text) {
  return this.textContent.includes(text);
}; 