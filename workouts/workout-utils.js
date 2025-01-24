export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function calculateTotalDuration(workout) {
  let total = 0;
  
  // Calculate warm-up duration
  workout.sections.warmUp.exercises.forEach(ex => {
    total += (ex.duration + ex.rest);
  });
  
  // Calculate main workout duration
  workout.sections.mainWorkout.exercises.forEach(ex => {
    total += (ex.duration + ex.rest) * (ex.sets || 1);
  });
  
  // Calculate cool-down duration
  workout.sections.coolDown.exercises.forEach(ex => {
    total += (ex.duration + ex.rest);
  });
  
  return total;
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