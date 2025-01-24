// Data
const data = {
    weekly: [
      { name: 'Mon', value: 65, calories: 2100, steps: 8000 },
      { name: 'Tue', value: 75, calories: 2300, steps: 10000 },
      { name: 'Wed', value: 85, calories: 2500, steps: 12000 },
      { name: 'Thu', value: 70, calories: 2200, steps: 9000 },
      { name: 'Fri', value: 90, calories: 2600, steps: 11000 },
      { name: 'Sat', value: 80, calories: 2400, steps: 9500 },
      { name: 'Sun', value: 95, calories: 2700, steps: 13000 }
    ]
  };
  
  const recommendations = [
    { icon: 'trending-up', text: 'Increase cardio intensity by 10%' },
    { icon: 'dumbbell', text: 'Focus on upper body strength today' },
    { icon: 'heart', text: 'Take a recovery day tomorrow' },
    { icon: 'user', text: 'Update your fitness goals' }
  ];
  
  // Chart Configuration
  const chartConfig = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };
  
  // Initialize Charts
  function initializeCharts() {
    // Fitness Progress Chart
    const fitnessCtx = document.getElementById('fitnessChart').getContext('2d');
    new Chart(fitnessCtx, {
      type: 'line',
      data: {
        labels: data.weekly.map(d => d.name),
        datasets: [{
          data: data.weekly.map(d => d.value),
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        ...chartConfig,
        plugins: {
          ...chartConfig.plugins,
          tooltip: {
            callbacks: {
              label: (context) => `Progress: ${context.raw}%`
            }
          }
        }
      }
    });
  
    // Calories Chart
    const caloriesCtx = document.getElementById('caloriesChart').getContext('2d');
    new Chart(caloriesCtx, {
      type: 'bar',
      data: {
        labels: data.weekly.map(d => d.name),
        datasets: [{
          data: data.weekly.map(d => d.calories),
          backgroundColor: '#4f46e5'
        }]
      },
      options: chartConfig
    });
  
    // Steps Chart
    const stepsCtx = document.getElementById('stepsChart').getContext('2d');
    new Chart(stepsCtx, {
      type: 'line',
      data: {
        labels: data.weekly.map(d => d.name),
        datasets: [{
          data: data.weekly.map(d => d.steps),
          borderColor: '#22c55e',
          tension: 0.4
        }]
      },
      options: chartConfig
    });
  }
  
  // Populate Recommendations
  function populateRecommendations() {
    const recommendationsList = document.querySelector('.recommendations-list');
    recommendations.forEach((rec, index) => {
      const item = document.createElement('div');
      item.className = 'recommendation-item fade-in';
      item.style.animationDelay = `${index * 100}ms`;
      
      item.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="recommendation-icon">
          ${getIconPath(rec.icon)}
        </svg>
        <span class="recommendation-text">${rec.text}</span>
      `;
      
      recommendationsList.appendChild(item);
    });
  }
  
  // Helper function to get icon paths
  function getIconPath(icon) {
    const icons = {
      'trending-up': '<line x1="23" y1="6" x2="17" y2="12"></line><line x1="17" y1="12" x2="11" y2="6"></line><line x1="11" y1="6" x2="1" y2="16"></line>',
      'dumbbell': '<path d="m6.5 6.5 17.5 17.5"/><path d="m6.5 17.5 17.5-17.5"/><path d="m2 21 3-3"/><path d="m19 4 3-3"/><path d="m2 3 3 3"/><path d="m19 20 3 3"/>',
      'heart': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
      'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>'
    };
    return icons[icon] || '';
  }
  
  // Animations
  function initializeAnimations() {
    // Add fade-in animation to stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        card.style.transition = 'all 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 100);
    });
  
    // Add hover animations
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
      });
    });
  
    // Sidebar link hover effects
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('mouseenter', () => {
        gsap.to(link, {
          x: 4,
          duration: 0.2,
          ease: 'power2.out'
        });
      });
      
      link.addEventListener('mouseleave', () => {
        gsap.to(link, {
          x: 0,
          duration: 0.2,
          ease: 'power2.out'
        });
      });
    });
  
    // Chart animations
    const chartCards = document.querySelectorAll('.chart-card');
    chartCards.forEach((card, index) => {
      gsap.from(card, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        delay: 0.2 + (index * 0.1),
        ease: 'power2.out'
      });
    });
  }
  
  // Event Listeners
  function initializeEventListeners() {
    // Chart period buttons
    const chartButtons = document.querySelectorAll('.chart-button');
    chartButtons.forEach(button => {
      button.addEventListener('click', () => {
        chartButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
      });
    });
  
    // Start Workout button
    const startWorkoutBtn = document.querySelector('.button-primary');
    startWorkoutBtn.addEventListener('click', () => {
      gsap.to(startWorkoutBtn, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1
      });
    });
  
    // Notification button
    const notificationBtn = document.querySelector('.notification-button');
    notificationBtn.addEventListener('click', () => {
      gsap.to(notificationBtn, {
        scale: 0.9,
        duration: 0.1,
        yoyo: true,
        repeat: 1
      });
    });
  }
  
  // Initialize everything when the DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    populateRecommendations();
    initializeAnimations();
    initializeEventListeners();
  });