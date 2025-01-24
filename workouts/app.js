import { getAuth } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js';

let API_KEY;
let thingsRefx;
let unsubscribex;
let db = firebase.firestore();
thingsRefx = db.collection('API');

unsubscribex = thingsRefx.onSnapshot(querySnapshot => {
  querySnapshot.docs.forEach(doc => {
    API_KEY = doc.data().API;
  });
});

export async function generateWorkout(type, length) {
  try {
    // Get user's body details from Firebase
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const userDetailsRef = doc(db, 'body-details', user.uid);
    const userDetailsDoc = await getDoc(userDetailsRef);

    if (!userDetailsDoc.exists()) {
      throw new Error('Please complete your body details first');
    }

    const bodyDetails = userDetailsDoc.data();

    const prompt = `Generate a detailed ${type} workout routine for ${length} minutes.
    The user has the following details:
    Height: ${bodyDetails.height}cm
    Weight: ${bodyDetails.weight}kg
    Age: ${bodyDetails.age}
    Body Type: ${bodyDetails.bodyType}
    Body Fat: ${bodyDetails.fatComposition}%

    Format the response in JSON with the following structure:
    {
      "name": "Name of the workout",
      "type": "${type}",
      "duration": "${length} minutes",
      "difficulty": "beginner/intermediate/advanced",
      "targetMuscleGroups": ["muscle1", "muscle2"],
      "equipment": ["equipment1", "equipment2"],
      "estimatedCalories": "XXX calories",
      "sections": {
        "warmUp": {
          "duration": "5 minutes",
          "exercises": [
            {
              "name": "Exercise name",
              "duration": 30,
              "rest": 10,
              "instructions": "Detailed instructions",
              "targetMuscles": ["muscle1", "muscle2"]
            },
            {
              "name": "Exercise name",
              "duration": 30,
              "rest": 10,
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
              "duration": 45,
              "rest": 15,
              "sets": 3,
              "reps": "12-15",
              "instructions": "Detailed instructions",
              "targetMuscles": ["muscle1", "muscle2"],
              "equipment": "equipment needed"
            }
            // Generate 8-10 different exercises
          ]
        },
        "coolDown": {
          "duration": "5 minutes",
          "exercises": [
            {
              "name": "Exercise name",
              "duration": 30,
              "rest": 10,
              "instructions": "Detailed instructions"
            },
            {
              "name": "Exercise name",
              "duration": 30,
              "rest": 10,
              "instructions": "Detailed instructions"
            }
          ]
        }
      },
      "tips": ["tip1", "tip2"],
      "precautions": ["precaution1", "precaution2"]
    }

    Make sure:
    1. Include 8-10 different exercises in the main workout
    2. Each exercise should be 30-45 seconds with 15-30 seconds rest
    3. Alternate between different muscle groups
    4. Include proper warm-up and cool-down exercises
    5. Total time should match the requested duration
    6. Instructions should be clear and detailed
    7. Rest periods should be appropriate for the exercise type`;

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
          content: prompt
        }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error:', errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
      }
    }

    const data = await response.json();
    const workoutData = JSON.parse(data.choices[0].message.content);

    // Store workout in Firebase
    const workoutRef = await db.collection('workouts').add({
      ...workoutData,
      userId: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Return workout data with ID
    return {
      id: workoutRef.id,
      ...workoutData
    };
  } catch (error) {
    console.error('Error details:', error);
    throw error;
  }
}

export function formatWorkoutForSession(workout) {
  // Helper function to format workout data for the session view
  return {
    name: workout.name,
    type: workout.type,
    difficulty: workout.difficulty,
    duration: workout.duration,
    exercises: workout.exercises.map(ex => ({
      name: ex.name,
      duration: ex.duration,
      rest: ex.rest || 15,
      instructions: ex.instructions,
      phase: ex.phase || 'Exercise'
    }))
  };
} 