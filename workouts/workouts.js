import { auth, db } from '../firebase-config.js';
import { generateWorkout } from './workout-generator.js';
import { formatTime } from './workout-utils.js';

export async function loadSavedWorkouts() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const snapshot = await db.collection('workouts')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(6)
      .get();

    updateWorkoutGrid(snapshot);
  } catch (error) {
    console.error('Error loading saved workouts:', error);
  }
}

export async function handleWorkoutSubmit(type, length) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const workout = await generateWorkout(type, length, user.uid);
    localStorage.setItem('currentWorkout', JSON.stringify(workout));
    return workout;
  } catch (error) {
    console.error('Error creating workout:', error);
    throw error;
  }
}

function updateWorkoutGrid(snapshot) {
  // ... Update workout grid UI ...
} 