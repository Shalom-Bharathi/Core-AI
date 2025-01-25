// Workout Session Management
class WorkoutSession {
  constructor() {
    this.workout = null;
    this.currentExerciseIndex = 0;
    this.timeRemaining = 0;
    this.isResting = false;
    this.isPaused = false;
    this.timer = null;
    this.currentSet = 1;
    this.totalSets = 1;
    this.startTime = null;
    this.calorieInterval = null;
  }

  processWorkoutData(workoutData) {
    const exercises = [];
    
    // Add warm-up exercises
    workoutData.sections.warmUp.exercises.forEach(ex => {
      exercises.push({
        ...ex,
        phase: 'Warm Up',
        sets: 1,
        rest: parseInt(ex.rest) || 15
      });
    });

    // Add main workout exercises
    workoutData.sections.mainWorkout.exercises.forEach(ex => {
      exercises.push({
        ...ex,
        phase: 'Main Workout',
        sets: parseInt(ex.sets) || 1,
        rest: parseInt(ex.rest) || 30
      });
    });

    // Add cool-down exercises
    workoutData.sections.coolDown.exercises.forEach(ex => {
      exercises.push({
        ...ex,
        phase: 'Cool Down',
        sets: 1,
        rest: parseInt(ex.rest) || 15
      });
    });

    return {
      ...workoutData,
      exercises: exercises
    };
  }

  async loadWorkout() {
    try {
      const workoutData = JSON.parse(localStorage.getItem('currentWorkout'));
      if (!workoutData) {
        window.location.href = '../';
        return;
      }

      this.workout = this.processWorkoutData(workoutData);
      
      document.getElementById('workoutName').textContent = this.workout.name;
      document.getElementById('workoutDescription').textContent = 
        `${this.workout.type} workout - ${this.workout.difficulty} level`;
      document.getElementById('exerciseCount').textContent = 
        `1/${this.workout.exercises.length}`;
      
      this.updateUpcomingExercises();
    } catch (error) {
      console.error('Error loading workout:', error);
      alert('Error loading workout');
    }
  }

  startExercise(index) {
    this.currentExerciseIndex = index;
    const exercise = this.workout.exercises[index];
    this.currentSet = 1;
    this.totalSets = exercise.sets || 1;
    
    this.updateExerciseDisplay(exercise);
    this.timeRemaining = parseInt(exercise.duration) || 30;
    this.isResting = false;
    this.updateTimer();
    this.startTimer();
    this.calculateTotalTimeLeft();
  }

  updateExerciseDisplay(exercise) {
    const exerciseElement = document.getElementById('currentExercise');
    exerciseElement.innerHTML = `
      <h2 class="exercise-name">${exercise.name}</h2>
      <p class="exercise-instructions">${exercise.instructions}</p>
      ${this.totalSets > 1 ? `<p class="exercise-sets">Set ${this.currentSet}/${this.totalSets}</p>` : ''}
      ${exercise.targetMuscles ? `
        <div class="target-muscles">
          <span class="label">Target Muscles:</span>
          <span class="muscles">${exercise.targetMuscles.join(', ')}</span>
        </div>
      ` : ''}
    `;
    
    document.getElementById('currentPhase').textContent = exercise.phase;
    document.getElementById('exerciseCount').textContent = 
      `${this.currentExerciseIndex + 1}/${this.workout.exercises.length}`;
  }

  updateTimer() {
    const timerDisplay = document.getElementById('timeRemaining');
    const timerPhase = document.getElementById('timerPhase');
    const circle = document.querySelector('.progress-ring-circle');
    
    if (!timerDisplay || !timerPhase || !circle) return;

    timerDisplay.textContent = this.formatTime(this.timeRemaining);
    timerPhase.textContent = this.isResting ? 'Rest' : 'Exercise';

    const exercise = this.workout.exercises[this.currentExerciseIndex];
    const totalTime = this.isResting ? exercise.rest : exercise.duration;
    const progress = (this.timeRemaining / totalTime) * 100;
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (progress / 100) * circumference;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
  }

  startTimer() {
    if (this.timer) clearInterval(this.timer);
    
    this.timer = setInterval(() => {
      if (this.isPaused) return;

      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        this.updateTimer();
      } else {
        const exercise = this.workout.exercises[this.currentExerciseIndex];
        
        if (this.isResting) {
          if (this.currentSet < this.totalSets) {
            this.currentSet++;
            this.isResting = false;
            this.timeRemaining = exercise.duration;
            this.updateExerciseDisplay(exercise);
          } else if (this.currentExerciseIndex < this.workout.exercises.length - 1) {
            this.startExercise(this.currentExerciseIndex + 1);
          } else {
            this.completeWorkout();
          }
        } else {
          this.isResting = true;
          this.timeRemaining = exercise.rest;
          this.updateTimer();
        }
      }
    }, 1000);
  }

  updateUpcomingExercises() {
    const container = document.getElementById('upcomingExercises');
    container.innerHTML = '';

    for (let i = this.currentExerciseIndex + 1; i < Math.min(this.currentExerciseIndex + 4, this.workout.exercises.length); i++) {
      const exercise = this.workout.exercises[i];
      const exerciseElement = document.createElement('div');
      exerciseElement.className = `upcoming-exercise${i === this.currentExerciseIndex + 1 ? ' next' : ''}`;
      exerciseElement.innerHTML = `
        <h4>${exercise.name}</h4>
        <p>${exercise.duration}s · ${exercise.phase}</p>
      `;
      container.appendChild(exerciseElement);
    }
  }

  async completeWorkout() {
    clearInterval(this.timer);
    clearInterval(this.calorieInterval);
    try {
      if (this.workout.id) {
        await db.collection('workouts').doc(this.workout.id).update({
          completed: true,
          completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      window.location.href = '../';
    } catch (error) {
      console.error('Error completing workout:', error);
      window.location.href = '../';
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    document.getElementById('pauseButton').innerHTML = this.isPaused ? 
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>' :
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  }

  skipExercise() {
    if (this.currentExerciseIndex < this.workout.exercises.length - 1) {
      this.startExercise(this.currentExerciseIndex + 1);
    } else {
      this.completeWorkout();
    }
  }

  previousExercise() {
    if (this.currentExerciseIndex > 0) {
      this.startExercise(this.currentExerciseIndex - 1);
    }
  }

  startWorkout() {
    this.startTime = Date.now();
    this.calorieInterval = setInterval(() => this.updateCalories(), 60000);
    this.startExercise(0);
    document.getElementById('startWorkoutBtn').style.display = 'none';
  }

  calculateTotalTimeLeft() {
    let totalTime = 0;
    for (let i = this.currentExerciseIndex; i < this.workout.exercises.length; i++) {
      const exercise = this.workout.exercises[i];
      totalTime += parseInt(exercise.duration) + parseInt(exercise.rest);
    }
    document.getElementById('totalTimeLeft').textContent = this.formatTime(totalTime);
  }

  updateCalories() {
    const caloriesPerMinute = 5; // Approximate calories burned per minute
    const totalMinutes = Math.floor((Date.now() - this.startTime) / 60000);
    const calories = totalMinutes * caloriesPerMinute;
    document.getElementById('caloriesBurned').textContent = calories.toString();
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Initialize workout session
const workoutSession = new WorkoutSession();

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logoutButton')?.addEventListener('click', handleSignOut);
  document.getElementById('pauseButton').addEventListener('click', () => workoutSession.togglePause());
  document.getElementById('skipButton').addEventListener('click', () => workoutSession.skipExercise());
  document.getElementById('previousButton').addEventListener('click', () => workoutSession.previousExercise());
  document.getElementById('startWorkoutBtn').addEventListener('click', () => workoutSession.startWorkout());
  workoutSession.loadWorkout();
});
