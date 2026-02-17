import { MealPlanResult } from './types'

export const SAMPLE_PLAN: MealPlanResult = {
	sourceItems: ['Eggs', 'Spinach', 'Chicken', 'Quinoa', 'Oats', 'Berries', 'Yogurt', 'Tofu', 'Broccoli', 'Rice', 'Avocado', 'Beans', 'Tomatoes', 'Onions', 'Garlic', 'Olive oil'],
	sourceText: 'Eggs, spinach, chicken, quinoa, oats, berries, yogurt, tofu, broccoli, rice, avocado, beans, tomatoes, onions, garlic, olive oil.',
	diet: 'Balanced',
	totalDays: 7,
	days: [
		{
			day: 'Monday',
			Breakfast: { title: 'Greek Yogurt with Berries & Oats', prepTime: 5, cookTime: 0, totalTime: 5, instructions: 'Mix Greek yogurt with fresh berries and top with oats.', ingredients: ['yogurt', 'berries', 'oats'], nutrition: { calories: 310, protein: 18, carbs: 42, fat: 8, fiber: 6 } },
			Lunch: { title: 'Chicken Quinoa Bowl with Spinach', prepTime: 10, cookTime: 20, totalTime: 30, instructions: 'Cook quinoa, grill chicken, and serve over fresh spinach.', ingredients: ['chicken', 'quinoa', 'spinach'], nutrition: { calories: 460, protein: 35, carbs: 48, fat: 12, fiber: 8 } },
			Dinner: { title: 'Baked Tofu with Broccoli & Rice', prepTime: 10, cookTime: 25, totalTime: 35, instructions: 'Bake tofu with seasonings, steam broccoli, and serve with rice.', ingredients: ['tofu', 'broccoli', 'rice'], nutrition: { calories: 580, protein: 24, carbs: 75, fat: 18, fiber: 10 } }
		},
		{
			day: 'Tuesday',
			Breakfast: { title: 'Scrambled Eggs with Spinach & Avocado', prepTime: 5, cookTime: 8, totalTime: 13, instructions: 'Scramble eggs with fresh spinach and serve with sliced avocado.', ingredients: ['eggs', 'spinach', 'avocado'], nutrition: { calories: 340, protein: 16, carbs: 12, fat: 26, fiber: 9 } },
			Lunch: { title: 'Quinoa Salad with Tomatoes & Beans', prepTime: 10, cookTime: 15, totalTime: 25, instructions: 'Combine cooked quinoa with diced tomatoes and beans.', ingredients: ['quinoa', 'tomatoes', 'beans'], nutrition: { calories: 420, protein: 16, carbs: 68, fat: 10, fiber: 14 } },
			Dinner: { title: 'Grilled Chicken with Garlic Rice & Broccoli', prepTime: 10, cookTime: 25, totalTime: 35, instructions: 'Grill chicken, prepare garlic rice, and steam broccoli.', ingredients: ['chicken', 'garlic', 'rice', 'broccoli'], nutrition: { calories: 620, protein: 42, carbs: 75, fat: 14, fiber: 8 } }
		},
		{
			day: 'Wednesday',
			Breakfast: { title: 'Overnight Oats with Berries', prepTime: 5, cookTime: 0, totalTime: 5, instructions: 'Mix oats with yogurt and berries, refrigerate overnight.', ingredients: ['oats', 'berries', 'yogurt'], nutrition: { calories: 290, protein: 12, carbs: 54, fat: 6, fiber: 8 } },
			Lunch: { title: 'Tofu & Veggie Stir-Fry with Rice', prepTime: 10, cookTime: 15, totalTime: 25, instructions: 'Stir-fry tofu with mixed vegetables and serve over rice.', ingredients: ['tofu', 'broccoli', 'rice'], nutrition: { calories: 480, protein: 22, carbs: 70, fat: 12, fiber: 7 } },
			Dinner: { title: 'Chicken & Bean Chili with Tomatoes & Onions', prepTime: 15, cookTime: 30, totalTime: 45, instructions: 'Cook chicken with beans, tomatoes, and onions in a chili.', ingredients: ['chicken', 'beans', 'tomatoes', 'onions'], nutrition: { calories: 550, protein: 38, carbs: 52, fat: 18, fiber: 15 } }
		},
		{
			day: 'Thursday',
			Breakfast: { title: 'Yogurt Parfait with Oats & Berries', prepTime: 5, cookTime: 0, totalTime: 5, instructions: 'Layer yogurt with oats and fresh berries.', ingredients: ['yogurt', 'oats', 'berries'], nutrition: { calories: 320, protein: 15, carbs: 48, fat: 7, fiber: 6 } },
			Lunch: { title: 'Spinach Salad with Avocado & Beans', prepTime: 10, cookTime: 0, totalTime: 10, instructions: 'Toss fresh spinach with avocado and beans.', ingredients: ['spinach', 'avocado', 'beans'], nutrition: { calories: 440, protein: 14, carbs: 45, fat: 24, fiber: 18 } },
			Dinner: { title: 'Baked Chicken with Quinoa & Broccoli', prepTime: 10, cookTime: 30, totalTime: 40, instructions: 'Bake chicken, cook quinoa, and steam broccoli.', ingredients: ['chicken', 'quinoa', 'broccoli'], nutrition: { calories: 600, protein: 45, carbs: 62, fat: 15, fiber: 9 } }
		},
		{
			day: 'Friday',
			Breakfast: { title: 'Eggs with Sautéed Spinach & Tomatoes', prepTime: 5, cookTime: 10, totalTime: 15, instructions: 'Sauté spinach and tomatoes, then scramble eggs.', ingredients: ['eggs', 'spinach', 'tomatoes'], nutrition: { calories: 280, protein: 18, carbs: 10, fat: 20, fiber: 4 } },
			Lunch: { title: 'Quinoa Bowl with Tofu & Veggies', prepTime: 10, cookTime: 15, totalTime: 25, instructions: 'Combine quinoa with pan-fried tofu and vegetables.', ingredients: ['quinoa', 'tofu', 'broccoli'], nutrition: { calories: 470, protein: 20, carbs: 65, fat: 14, fiber: 9 } },
			Dinner: { title: 'Chicken Rice Bowl with Garlic & Onions', prepTime: 10, cookTime: 20, totalTime: 30, instructions: 'Cook chicken and rice with garlic and onions.', ingredients: ['chicken', 'rice', 'garlic', 'onions'], nutrition: { calories: 590, protein: 38, carbs: 78, fat: 12, fiber: 5 } }
		},
		{
			day: 'Saturday',
			Breakfast: { title: 'Oatmeal with Berries & Yogurt', prepTime: 5, cookTime: 5, totalTime: 10, instructions: 'Cook oatmeal and top with berries and yogurt.', ingredients: ['oats', 'berries', 'yogurt'], nutrition: { calories: 330, protein: 14, carbs: 58, fat: 6, fiber: 8 } },
			Lunch: { title: 'Chicken & Avocado Salad', prepTime: 10, cookTime: 0, totalTime: 10, instructions: 'Combine grilled chicken with fresh avocado and greens.', ingredients: ['chicken', 'avocado', 'spinach'], nutrition: { calories: 410, protein: 32, carbs: 15, fat: 25, fiber: 10 } },
			Dinner: { title: 'Tofu Curry with Tomatoes & Rice', prepTime: 15, cookTime: 20, totalTime: 35, instructions: 'Cook tofu in curry sauce with tomatoes, serve over rice.', ingredients: ['tofu', 'tomatoes', 'rice'], nutrition: { calories: 560, protein: 22, carbs: 82, fat: 16, fiber: 6 } }
		},
		{
			day: 'Sunday',
			Breakfast: { title: 'Egg Avocado Toast with Tomatoes', prepTime: 5, cookTime: 5, totalTime: 10, instructions: 'Toast bread, top with avocado, fried egg, and tomatoes.', ingredients: ['eggs', 'avocado', 'tomatoes'], nutrition: { calories: 350, protein: 14, carbs: 28, fat: 22, fiber: 9 } },
			Lunch: { title: 'Bean & Quinoa Bowl', prepTime: 10, cookTime: 15, totalTime: 25, instructions: 'Combine cooked quinoa with beans and vegetables.', ingredients: ['beans', 'quinoa'], nutrition: { calories: 440, protein: 18, carbs: 72, fat: 8, fiber: 16 } },
			Dinner: { title: 'Grilled Chicken with Spinach & Broccoli', prepTime: 10, cookTime: 20, totalTime: 30, instructions: 'Grill chicken and serve with fresh spinach and steamed broccoli.', ingredients: ['chicken', 'spinach', 'broccoli'], nutrition: { calories: 520, protein: 40, carbs: 12, fat: 28, fiber: 8 } }
		}
	]
}
