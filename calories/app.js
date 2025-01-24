

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

export async function calculateCalories(mealDescription) {
  try {
    const prompt = `Analyze this meal and provide a detailed nutritional breakdown:
    Meal: ${mealDescription}

    Please provide the response in the following JSON format:
    {
      "calories": "XXX",
      "macros": {
        "protein": "XXg",
        "carbs": "XXg",
        "fats": "XXg",
        "fiber": "XXg"
      },
      "ingredients": [
        {
          "name": "Ingredient name",
          "calories": "XXX",
          "amount": "serving size"
        }
      ],
      "healthRating": "1-10",
      "nutritionalTips": [
        "tip1",
        "tip2"
      ],
      "warnings": [
        "warning1",
        "warning2"
      ]
    }

    Make sure to:
    1. Provide accurate calorie estimates
    2. Break down all major ingredients
    3. Include relevant nutritional advice
    4. Highlight any potential dietary concerns
    5. Consider standard portion sizes`;

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
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error calculating calories:', error);
    throw error;
  }
} 