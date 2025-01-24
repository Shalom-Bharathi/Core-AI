import { db, firestore } from '../firebase-config.js';
import { calculateTotalDuration, formatTime } from './workout-utils.js';

let API_KEY;

// Get API key from Firebase
async function initializeAPI() {
  const apiCollection = firestore.collection(db, 'API');
  const apiSnapshot = await firestore.getDocs(apiCollection);
  apiSnapshot.forEach(doc => {
    API_KEY = doc.data().API;
  });
}

initializeAPI();

export async function generateWorkout(type, length, userId) {
  try {
    if (!userId) throw new Error('User not authenticated');

    const userDetailsRef = firestore.doc(db, 'body-details', userId);
    const userDetailsDoc = await firestore.getDoc(userDetailsRef);

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
      createdAt: firestore.serverTimestamp(),
      completed: false,
      actualDuration: calculateTotalDuration(workoutData)
    };

    const workoutsCollection = firestore.collection(db, 'workouts');
    const workoutRef = await firestore.addDoc(workoutsCollection, enrichedWorkout);

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
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `Generate a detailed ${type} workout routine for ${length} minutes.
          The user has the following details:
          Height: ${bodyDetails.height}cm
          Weight: ${bodyDetails.weight}kg
          Age: ${bodyDetails.age}
          Body Type: ${bodyDetails.bodyType}
          Body Fat: ${bodyDetails.fatComposition}%

          Return a JSON object with this exact structure:
          {
            "name": "Workout name",
            "type": "${type}",
            "duration": "${length} minutes",
            "difficulty": "beginner/intermediate/advanced",
            "sections": {
              "warmUp": {
                "duration": "5 minutes",
                "exercises": [
                  {
                    "name": "Exercise name",
                    "duration": 30,
                    "rest": 15,
                    "instructions": "Detailed instructions",
                    "targetMuscles": ["muscle1", "muscle2"]
                  }
                ]
              },
              "mainWorkout": {
                "duration": "${length - 10} minutes",
                "exercises": [
                  {
                    "name": "Exercise name",
                    "duration": 40,
                    "rest": 20,
                    "sets": 3,
                    "reps": "12-15",
                    "instructions": "Detailed instructions",
                    "targetMuscles": ["muscle1", "muscle2"]
                  }
                ]
              },
              "coolDown": {
                "duration": "5 minutes",
                "exercises": [
                  {
                    "name": "Exercise name",
                    "duration": 30,
                    "rest": 15,
                    "instructions": "Detailed instructions"
                  }
                ]
              }
            }
          }`
        }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate workout');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error in fetchWorkoutFromAI:', error);
    throw error;
  }
} 