import { formatTime } from './workout-utils.js';
import { db } from '../firebase-config.js';

export class WorkoutSession {
  constructor(workout) {
    this.workout = workout;
    this.currentExerciseIndex = 0;
    this.timeRemaining = 0;
    this.isResting = false;
    this.isPaused = false;
    this.timer = null;
    this.currentSet = 1;
    this.totalSets = 1;
    
    this.initializeUI();
    this.startExercise(0);
    this.setupEventListeners();
  }

  initializeUI() {
    document.getElementById('workoutName').textContent = this.workout.name;
    document.getElementById('workoutDescription').textContent = 
      `${this.workout.type} workout - ${this.workout.difficulty} level`;
    this.updateUpcomingExercises();
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
  }

  updateExerciseDisplay(exercise) {
    // ... Update exercise display UI ...
  }

  updateTimer() {
    // ... Update timer UI ...
  }

  startTimer() {
    // ... Timer logic ...
  }

  updateUpcomingExercises() {
    // ... Update upcoming exercises UI ...
  }

  async completeWorkout() {
    try {
      await db.collection('workouts').doc(this.workout.id).update({
        completed: true,
        completedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.location.href = '../';
    } catch (error) {
      console.error('Error completing workout:', error);
    }
  }

  setupEventListeners() {
    // ... Setup event listeners ...
  }
} 