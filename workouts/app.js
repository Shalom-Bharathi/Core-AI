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

// Standardized workout data structure
const WORKOUT_REFERENCE = {
  name: "Full Body HIIT Workout", // Example name
  type: "hiit", // hiit, strength, cardio, flexibility
  duration: "30 minutes",
  difficulty: "intermediate", // beginner, intermediate, advanced
  targetMuscleGroups: ["legs", "core", "arms", "shoulders"],
  equipment: ["dumbbells", "yoga mat"],
  estimatedCalories: "300 calories",
  sections: {
    warmUp: {
      duration: "5 minutes",
      exercises: [
        {
          name: "Dynamic Leg Swings",
          duration: 30, // in seconds
          rest: 15, // in seconds
          instructions: "Stand holding a wall for balance. Swing right leg forward and back 10 times, then switch legs. Keep core engaged and maintain good posture.",
          targetMuscles: ["hip flexors", "hamstrings"]
        },
        {
          name: "Arm Circles",
          duration: 30,
          rest: 15,
          instructions: "Stand with feet shoulder-width apart. Make large circular motions with both arms, 10 forward then 10 backward. Keep shoulders relaxed.",
          targetMuscles: ["shoulders", "upper back"]
        },
        {
          name: "Bodyweight Squats",
          duration: 30,
          rest: 15,
          instructions: "Stand with feet hip-width apart. Lower into squat position keeping chest up and knees tracking over toes. Return to start.",
          targetMuscles: ["quadriceps", "glutes"]
        }
      ]
    },
    mainWorkout: {
      duration: "20 minutes",
      exercises: [
        {
          name: "Dumbbell Goblet Squats",
          duration: 40,
          rest: 20,
          sets: 3,
          reps: "12-15",
          instructions: "Hold dumbbell at chest. Feet shoulder-width apart. Lower into squat keeping chest up. Drive through heels to stand.",
          targetMuscles: ["quadriceps", "glutes", "core"],
          equipment: "dumbbell"
        }
        // ... 9 more exercises with similar structure
      ]
    },
    coolDown: {
      duration: "5 minutes",
      exercises: [
        {
          name: "Standing Forward Fold",
          duration: 30,
          rest: 15,
          instructions: "Stand with feet hip-width apart. Slowly fold forward, letting arms hang. Bend knees slightly if needed. Hold and breathe deeply.",
          targetMuscles: ["hamstrings", "lower back"]
        },
        {
          name: "Cat-Cow Stretch",
          duration: 30,
          rest: 15,
          instructions: "On hands and knees, alternate between arching and rounding spine. Coordinate movement with breath.",
          targetMuscles: ["spine", "core"]
        },
        {
          name: "Child's Pose",
          duration: 30,
          rest: 15,
          instructions: "Kneel on mat, sit back on heels. Extend arms forward and rest forehead on mat. Breathe deeply and relax.",
          targetMuscles: ["back", "shoulders"]
        }
      ]
    }
  },
  tips: [
    "Stay hydrated throughout the workout",
    "Focus on form over speed",
    "Modify exercises as needed for your fitness level"
  ],
  precautions: [
    "Stop if you feel sharp pain",
    "Maintain proper breathing throughout",
    "Take additional rest if needed"
  ]
};

export async function generateWorkout(type, length) {
  try {
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;

    if (!user) throw new Error('User not authenticated');

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

    Use EXACTLY this JSON format and structure (fill in with appropriate values):
    ${JSON.stringify(WORKOUT_REFERENCE, null, 2)}

    Critical requirements:
    1. Generate EXACTLY 10 different exercises for mainWorkout
    2. Generate EXACTLY 3 exercises each for warmUp and coolDown
    3. Duration format: numbers only for exercise duration and rest (30 not "30 seconds")
    4. For ${type} workouts:
       - Strength: 40-45 seconds exercise, 20-30 seconds rest
       - HIIT: 30-40 seconds exercise, 15-20 seconds rest
       - Cardio: 45-60 seconds exercise, 15-20 seconds rest
       - Flexibility: 30-45 seconds exercise, 10-15 seconds rest
    5. All instructions must include form cues
    6. Exercise names must be specific (e.g., "Dumbbell Goblet Squats" not "Squats")
    7. Include equipment only if necessary
    8. Every exercise must have targetMuscles array`;

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
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const workoutData = JSON.parse(data.choices[0].message.content);

    // Validate the workout data
    validateWorkoutData(workoutData);

    // Add metadata
    const enrichedWorkout = {
      ...workoutData,
      userId: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      completed: false,
      actualDuration: calculateTotalDuration(workoutData)
    };

    // Save to Firestore
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

function validateWorkoutData(data) {
  if (!data.sections?.mainWorkout?.exercises || 
      data.sections.mainWorkout.exercises.length !== 10) {
    throw new Error('Invalid workout data: Must have exactly 10 main exercises');
  }

  if (!data.sections?.warmUp?.exercises || 
      data.sections.warmUp.exercises.length !== 3) {
    throw new Error('Invalid workout data: Must have exactly 3 warm-up exercises');
  }

  if (!data.sections?.coolDown?.exercises || 
      data.sections.coolDown.exercises.length !== 3) {
    throw new Error('Invalid workout data: Must have exactly 3 cool-down exercises');
  }
}

async function saveWorkoutToFirebase(workoutData) {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const workoutRef = await db.collection('workouts').add({
    ...workoutData,
    userId: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    completed: false
  });

  return workoutRef;
}

export function processWorkoutForSession(workoutData) {
  return {
    ...workoutData,
    exercises: [
      ...workoutData.sections.warmUp.exercises.map(ex => ({
        ...ex,
        phase: 'Warm Up',
        sets: 1,
        rest: parseInt(ex.rest) || 15
      })),
      ...workoutData.sections.mainWorkout.exercises.map(ex => ({
        ...ex,
        phase: 'Main Workout',
        sets: parseInt(ex.sets) || 1,
        rest: parseInt(ex.rest) || 20
      })),
      ...workoutData.sections.coolDown.exercises.map(ex => ({
        ...ex,
        phase: 'Cool Down',
        sets: 1,
        rest: parseInt(ex.rest) || 15
      }))
    ]
  };
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