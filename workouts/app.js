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
              "rest": 15,
              "instructions": "Detailed instructions",
              "targetMuscles": ["muscle1", "muscle2"]
            },
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
              "targetMuscles": ["muscle1", "muscle2"],
              "equipment": "equipment needed"
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
            },
            {
              "name": "Exercise name",
              "duration": 30,
              "rest": 15,
              "instructions": "Detailed instructions"
            }
          ]
        }
      },
      "tips": ["tip1", "tip2"],
      "precautions": ["precaution1", "precaution2"]
    }

    Requirements:
    1. Generate EXACTLY 10 different exercises for the main workout
    2. For ${type} workouts:
       - Strength: 40-45 seconds per exercise, 20-30 seconds rest
       - HIIT: 30-40 seconds per exercise, 15-20 seconds rest
       - Cardio: 45-60 seconds per exercise, 15-20 seconds rest
       - Flexibility: 30-45 seconds per exercise, 10-15 seconds rest
    3. Warm-up should have 3 exercises
    4. Cool-down should have 3 exercises
    5. Alternate between different muscle groups in main workout
    6. Instructions must be detailed and clear
    7. Include proper form cues in instructions
    8. Rest periods must match the workout type
    9. Exercise names should be specific and clear
    10. Include equipment only if necessary for the exercise`;

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

    // Validate workout data
    if (!workoutData.sections?.mainWorkout?.exercises || 
        workoutData.sections.mainWorkout.exercises.length !== 10) {
      throw new Error('Invalid workout data: Must have exactly 10 main exercises');
    }

    // Store workout in Firebase
    const workoutRef = await db.collection('workouts').add({
      ...workoutData,
      userId: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Process exercises for session view
    const processedWorkout = {
      id: workoutRef.id,
      ...workoutData,
      exercises: [
        ...workoutData.sections.warmUp.exercises.map(ex => ({
          ...ex,
          phase: 'Warm Up',
          sets: 1
        })),
        ...workoutData.sections.mainWorkout.exercises.map(ex => ({
          ...ex,
          phase: 'Main Workout',
          sets: ex.sets || 1
        })),
        ...workoutData.sections.coolDown.exercises.map(ex => ({
          ...ex,
          phase: 'Cool Down',
          sets: 1
        }))
      ]
    };

    return processedWorkout;
  } catch (error) {
    console.error('Error details:', error);
    throw error;
  }
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function calculateTotalDuration(workout) {
  let total = 0;
  workout.exercises.forEach(ex => {
    total += (ex.duration + ex.rest) * (ex.sets || 1);
  });
  return total;
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