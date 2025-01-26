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
  
  // Initialize animations and interactions
  function initializeAnimations() {
    // Animate feature cards on scroll
    const featureCards = document.querySelectorAll('.feature-card');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          
          // Animate the icon when card becomes visible
          gsap.from(entry.target.querySelector('.feature-icon'), {
            scale: 0,
            rotation: -180,
            duration: 0.6,
            ease: 'back.out(1.7)'
          });
          
          // Animate list items
          const listItems = entry.target.querySelectorAll('.feature-list li');
          gsap.from(listItems, {
            x: -20,
            opacity: 0,
            duration: 0.4,
            stagger: 0.1,
            ease: 'power2.out'
          });
        }
      });
    }, {
      threshold: 0.2
    });

    featureCards.forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      observer.observe(card);
    });

    // Enhanced hover animations for feature cards
    featureCards.forEach(card => {
      const icon = card.querySelector('.feature-icon');
      const listItems = card.querySelectorAll('.feature-list li');
      
      card.addEventListener('mouseenter', () => {
        gsap.to(card, {
          scale: 1.02,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          duration: 0.3,
          ease: 'power2.out'
        });
        
        gsap.to(icon, {
          scale: 1.1,
          rotation: '+=15',
          duration: 0.4,
          ease: 'power2.out'
        });
        
        gsap.to(listItems, {
          x: 5,
          duration: 0.3,
          stagger: 0.05,
          ease: 'power2.out'
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          scale: 1,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          duration: 0.3,
          ease: 'power2.out'
        });
        
        gsap.to(icon, {
          scale: 1,
          rotation: '-=15',
          duration: 0.4,
          ease: 'power2.out'
        });
        
        gsap.to(listItems, {
          x: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: 'power2.out'
        });
      });
    });
  }

  // Initialize widget container animations
  function initializeWidgetContainer() {
    const widgetSection = document.querySelector('.ai-widget-section');
    
    // Create animated background gradient
    const gradient = document.createElement('div');
    gradient.className = 'gradient-background';
    widgetSection.insertBefore(gradient, widgetSection.firstChild);
    
    // Animate gradient
    gsap.to(gradient, {
      backgroundPosition: '200% 50%',
      duration: 15,
      repeat: -1,
      ease: 'none'
    });

    // Prepare the container for the vapi widget
    const widgetContainer = document.getElementById('vapi-widget');
    if (widgetContainer) {
      widgetContainer.style.minHeight = '300px';
      widgetContainer.style.width = '100%';
      
      // Add loading animation
      const loadingAnimation = document.createElement('div');
      loadingAnimation.className = 'loading-animation';
      loadingAnimation.innerHTML = `
        <div class="pulse"></div>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      `;
      
      widgetContainer.appendChild(loadingAnimation);
      
      gsap.to(loadingAnimation.querySelector('svg'), {
        rotation: 360,
        duration: 1.5,
        repeat: -1,
        ease: 'linear'
      });
    }
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
    initializeWidgetContainer();
    initializeEventListeners();
  });