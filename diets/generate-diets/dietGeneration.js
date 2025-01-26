// // Add this variable at the top of the file
// const USE_ELEVEN_LABS = false; // Set this to false to use browser's default speech

// // Update the generateDietPlan function with a structured prompt
// async function generateDietPlan() {
//   const loadingStates = [
//     'Analyzing your preferences...',
//     'Calculating nutritional requirements...',
//     'Generating personalized diet plan...',
//     'Saving your plan...'
//   ];

//   const popup = showLoadingPopup(loadingStates[0]);
  
//   try {
//     // Show loading states
//     for (let i = 0; i < loadingStates.length - 1; i++) {
//       popup.querySelector('p').textContent = loadingStates[i];
//       await new Promise(resolve => setTimeout(resolve, 1500));
//     }

//     const prompt = `
//       Based on the following user responses:
//       ${userResponses.map((response, index) => `Response ${index + 1}: ${response}`).join('\n')}
      
//       Generate a comprehensive diet plan in the following JSON structure:
//       {
//         "planName": "Name of the personalized diet plan",
//         "overview": "Brief overview of the diet plan",
//         "dailyCalories": "Estimated daily calorie intake",
//         "macroSplit": {
//           "protein": "percentage",
//           "carbs": "percentage",
//           "fats": "percentage"
//         },
//         "mealStructure": {
//           "breakfast": {
//             "timing": "Recommended timing",
//             "calories": "Calories for this meal",
//             "suggestions": ["3-4 meal suggestions"]
//           },
//           "lunch": {
//             "timing": "Recommended timing",
//             "calories": "Calories for this meal",
//             "suggestions": ["3-4 meal suggestions"]
//           },
//           "dinner": {
//             "timing": "Recommended timing",
//             "calories": "Calories for this meal",
//             "suggestions": ["3-4 meal suggestions"]
//           },
//           "snacks": {
//             "timing": "Recommended timing",
//             "calories": "Calories per snack",
//             "suggestions": ["3-4 snack suggestions"]
//           }
//         },
//         "foodList": {
//           "include": ["List of recommended foods"],
//           "avoid": ["List of foods to avoid"]
//         },
//         "weeklySchedule": {
//           "monday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
//           "tuesday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
//           "wednesday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
//           "thursday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
//           "friday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
//           "saturday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" },
//           "sunday": { "breakfast": "", "lunch": "", "dinner": "", "snacks": "" }
//         },
//         "tips": ["List of 5-6 important tips and recommendations"],
//         "waterIntake": "Daily water intake recommendation in liters",
//         "supplements": ["Optional list of recommended supplements"],
//         "exerciseRecommendations": {
//           "type": "Recommended exercise type",
//           "frequency": "Weekly frequency",
//           "duration": "Minutes per session"
//         }
//       }

//       Make sure all values are realistic and based on the user's responses.
//       Include specific meal suggestions and timing.
//       Keep portions and calorie counts realistic and healthy.
//     `;

//     const response = await fetch('https://api.openai.com/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${API_KEY}`
//       },
//       body: JSON.stringify({
//         model: 'gpt-4',
//         messages: [{
//           role: 'user',
//           content: prompt
//         }],
//         temperature: 0.7,
//         max_tokens: 2000
//       })
//     });

//     if (!response.ok) {
//       throw new Error(`API request failed with status ${response.status}`);
//     }

//     const data = await response.json();
//     const dietPlan = JSON.parse(data.choices[0].message.content);
    
//     // Show saving state
//     popup.querySelector('p').textContent = loadingStates[3];
    
//     // Save to Firebase
//     const user = firebase.auth().currentUser;
//     if (!user) {
//       throw new Error('User not authenticated');
//     }

//     await db.collection('dietPlans').doc(user.uid).set({
//       plan: dietPlan,
//       createdAt: firebase.firestore.FieldValue.serverTimestamp(),
//       responses: userResponses
//     });

//     // Remove loading popup
//     popup.remove();

//     // Redirect to diet-home
//     window.location.replace('../diet-home/index.html');

//   } catch (error) {
//     console.error('Error generating diet plan:', error);
//     popup.remove();
//     updateStatus('Error generating diet plan. Please try again.');
//   }
// }

// // Update the generateSpeech function
// async function generateSpeech(text) {
//   return new Promise(async (resolve, reject) => {
//     if (USE_ELEVEN_LABS && ELEVEN_LABS_KEY) {
//       try {
//         // Using Rachel voice - energetic and friendly female voice
//         const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
        
//         const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
//           method: 'POST',
//           headers: {
//             'Accept': 'audio/mpeg',
//             'Content-Type': 'application/json',
//             // 'xi-api-key': ELEVEN_LABS_KEY
//           },
//           body: JSON.stringify({
//             text: text,
//             model_id: "eleven_monolingual_v1",
//             voice_settings: {
//               stability: 0.5,
//               similarity_boost: 0.75,
//               style: 1.0,
//               use_speaker_boost: true
//             }
//           })
//         });

//         if (!response.ok) {
//           throw new Error(`ElevenLabs API request failed with status ${response.status}`);
//         }

//         const audioBlob = await response.blob();
//         const audio = new Audio(URL.createObjectURL(audioBlob));
        
//         audio.onended = () => {
//           URL.revokeObjectURL(audio.src); // Clean up
//           resolve();
//         };
        
//         audio.onerror = (error) => {
//           URL.revokeObjectURL(audio.src); // Clean up
//           reject(error);
//         };

//         await audio.play();

//       } catch (error) {
//         console.error('ElevenLabs error, falling back to browser speech:', error);
//         await useBrowserSpeech(text, resolve, reject);
//       }
//     } else {
//       // Use browser's default speech synthesis
//       await useBrowserSpeech(text, resolve, reject);
//     }
//   });
// }

// // Helper function for browser speech
// async function useBrowserSpeech(text, resolve, reject) {
//   try {
//     const utterance = new SpeechSynthesisUtterance(text);
//     utterance.rate = 1.2;
//     utterance.pitch = 1.2;
//     utterance.volume = 1;
    
//     // Try to use a female voice
//     const voices = speechSynthesis.getVoices();
//     const femaleVoice = voices.find(voice => 
//       voice.name.toLowerCase().includes('female') || 
//       voice.name.includes('Samantha')
//     );
//     if (femaleVoice) utterance.voice = femaleVoice;
    
//     utterance.onend = () => resolve();
//     utterance.onerror = reject;
//     speechSynthesis.speak(utterance);
//   } catch (error) {
//     console.error('Browser speech synthesis failed:', error);
//     reject(error);
//   }
// }

// async function startConversation() {
//   try {
//     updateStatus('Listening...');
//     await updateAnimation('listening');
    
//     for (let i = 0; i < questions.length; i++) {
//       currentQuestionIndex = i;
//       updateProgress(i);
      
//       const question = questions[i];
//       await speak(question);
      
//       const response = await getUserResponse();
//       userResponses.push(response);
      
//       // Show acknowledgment
//       await speak("Got it, thank you!");
      
//       if (i < questions.length - 1) {
//         await speak("Let's continue with the next question.");
//       }
//     }
    
//     updateStatus('Generating your personalized diet plan...');
//     await updateAnimation('thinking');
    
//     // Generate and save diet plan, then redirect
//     await generateDietPlan();
    
//   } catch (error) {
//     console.error('Error in conversation:', error);
//     updateStatus('Something went wrong. Please try again.');
//   }
// } 