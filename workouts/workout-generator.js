import { db } from '../firebase-config.js';
import { calculateTotalDuration, formatTime } from './workout-utils.js';

let API_KEY;
const apiRef = db.collection('API');

// Get API key from Firebase
apiRef.onSnapshot(querySnapshot => {
  querySnapshot.docs.forEach(doc => {
    API_KEY = doc.data().API;
  });
});

export async function generateWorkout(type, length, userId) {
  try {
    if (!userId) throw new Error('User not authenticated');

    const userDetailsRef = db.collection('body-details').doc(userId);
    const userDetailsDoc = await userDetailsRef.get();

    if (!userDetailsDoc.exists()) {
      throw new Error('Please complete your body details first');
    }

    const bodyDetails = userDetailsDoc.data();
    const workoutData = await fetchWorkoutFromAI(type, length, bodyDetails);
    
    if (!workoutData || !workoutData.sections) {
      throw new Error('Invalid workout data received from AI');
    }

    // Add metadata and save to Firebase
    const enrichedWorkout = {
      ...workoutData,
      userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      completed: false,
      actualDuration: calculateTotalDuration(workoutData)
    };

    const workoutRef = await db.collection('workouts').add(enrichedWorkout);

    return {
      id: workoutRef.id,
      ...enrichedWorkout
    };
  } catch (error) {
    console.error('Error generating workout:', error);
    throw error;
  }
}

async function fetchWorkoutFromAI(type, length, bodyDetails) {
  // ... Your existing AI fetch code ...
  // Make sure this returns data in the correct format with sections
} 