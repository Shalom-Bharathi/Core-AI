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
      "exercises": [
        {
          "name": "Exercise Name",
          "duration": 60,
          "rest": 15,
          "instructions": "Detailed step by step instructions for performing the exercise",
          "targetMuscles": ["muscle1", "muscle2"],
          "equipment": "required equipment",
          "sets": 3,
          "reps": "12-15",
          "restBetweenSets": 30
        }
      ],
      "sections": {
        "warmUp": {
          "duration": "X minutes",
          "exercises": [
            {
              "name": "Warm-up Exercise",
              "duration": 60,
              "instructions": "Detailed instructions",
              "targetMuscles": ["muscle1", "muscle2"]
            }
          ]
        },
        "mainWorkout": {
          "duration": "X minutes",
          "exercises": [
            {
              "name": "Main Exercise",
              "duration": 45,
              "sets": 3,
              "reps": "12 per set",
              "rest": 30,
              "instructions": "Detailed instructions",
              "targetMuscles": ["muscle1", "muscle2"],
              "equipment": "required equipment"
            }
          ]
        },
        "coolDown": {
          "duration": "X minutes",
          "exercises": [
            {
              "name": "Cool-down Exercise",
              "duration": 60,
              "instructions": "Detailed instructions"
            }
          ]
        }
      },
      "tips": ["tip1", "tip2"],
      "precautions": ["precaution1", "precaution2"]
    }

    Make sure:
    1. Each exercise has a specific duration in seconds
    2. Rest periods are appropriate for the exercise type
    3. Instructions are clear and detailed
    4. The total duration of exercises + rest matches the requested workout length
    5. Exercises are ordered in a logical sequence
    6. Include both detailed view data (sections) and session view data (exercises)
    7. For strength exercises, include sets, reps, and rest between sets
    8. For cardio/HIIT exercises, focus on duration and intensity
    `;

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

    // Process the workout data for session view
    const processedExercises = [
      ...workoutData.sections.warmUp.exercises.map(ex => ({
        ...ex,
        phase: 'Warm Up',
        rest: 15 // Default rest for warm-up
      })),
      ...workoutData.sections.mainWorkout.exercises.map(ex => ({
        ...ex,
        phase: 'Main Workout'
      })),
      ...workoutData.sections.coolDown.exercises.map(ex => ({
        ...ex,
        phase: 'Cool Down',
        rest: 10 // Default rest for cool-down
      }))
    ];

    // Return both the full workout data and processed exercises
    return {
      ...workoutData,
      exercises: processedExercises
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