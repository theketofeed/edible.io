import { MealPlanResult } from './types'

export const SAMPLE_PLAN: MealPlanResult = {
	sourceItems: ['Eggs', 'Spinach', 'Chicken', 'Quinoa', 'Oats', 'Berries', 'Yogurt', 'Tofu', 'Broccoli', 'Rice', 'Avocado', 'Beans', 'Tomatoes', 'Onions', 'Garlic', 'Olive oil'],
	sourceText: 'Eggs, spinach, chicken, quinoa, oats, berries, yogurt, tofu, broccoli, rice, avocado, beans, tomatoes, onions, garlic, olive oil.',
	diet: 'Balanced',
	totalDays: 7,
	days: [
		{ 
			day: 'Monday', 
			Breakfast: { title: 'Greek Yogurt with Berries & Oats', prepTime: 5, cookTime: 0, totalTime: 5, instructions: 'Mix Greek yogurt with fresh berries and top with oats.', ingredients: ['yogurt', 'berries', 'oats'] },
			Lunch: { title: 'Chicken Quinoa Bowl with Spinach', prepTime: 10, cookTime: 20, totalTime: 30, instructions: 'Cook quinoa, grill chicken, and serve over fresh spinach.', ingredients: ['chicken', 'quinoa', 'spinach'] },
			Dinner: { title: 'Baked Tofu with Broccoli & Rice', prepTime: 10, cookTime: 25, totalTime: 35, instructions: 'Bake tofu with seasonings, steam broccoli, and serve with rice.', ingredients: ['tofu', 'broccoli', 'rice'] }
		},
		{ 
			day: 'Tuesday', 
			Breakfast: { title: 'Scrambled Eggs with Spinach & Avocado', prepTime: 5, cookTime: 8, totalTime: 13, instructions: 'Scramble eggs with fresh spinach and serve with sliced avocado.', ingredients: ['eggs', 'spinach', 'avocado'] },
			Lunch: { title: 'Quinoa Salad with Tomatoes & Beans', prepTime: 10, cookTime: 15, totalTime: 25, instructions: 'Combine cooked quinoa with diced tomatoes and beans.', ingredients: ['quinoa', 'tomatoes', 'beans'] },
			Dinner: { title: 'Grilled Chicken with Garlic Rice & Broccoli', prepTime: 10, cookTime: 25, totalTime: 35, instructions: 'Grill chicken, prepare garlic rice, and steam broccoli.', ingredients: ['chicken', 'garlic', 'rice', 'broccoli'] }
		},
		{ 
			day: 'Wednesday', 
			Breakfast: { title: 'Overnight Oats with Berries', prepTime: 5, cookTime: 0, totalTime: 5, instructions: 'Mix oats with yogurt and berries, refrigerate overnight.', ingredients: ['oats', 'berries', 'yogurt'] },
			Lunch: { title: 'Tofu & Veggie Stir-Fry with Rice', prepTime: 10, cookTime: 15, totalTime: 25, instructions: 'Stir-fry tofu with mixed vegetables and serve over rice.', ingredients: ['tofu', 'broccoli', 'rice'] },
			Dinner: { title: 'Chicken & Bean Chili with Tomatoes & Onions', prepTime: 15, cookTime: 30, totalTime: 45, instructions: 'Cook chicken with beans, tomatoes, and onions in a chili.', ingredients: ['chicken', 'beans', 'tomatoes', 'onions'] }
		},
		{ 
			day: 'Thursday', 
			Breakfast: { title: 'Yogurt Parfait with Oats & Berries', prepTime: 5, cookTime: 0, totalTime: 5, instructions: 'Layer yogurt with oats and fresh berries.', ingredients: ['yogurt', 'oats', 'berries'] },
			Lunch: { title: 'Spinach Salad with Avocado & Beans', prepTime: 10, cookTime: 0, totalTime: 10, instructions: 'Toss fresh spinach with avocado and beans.', ingredients: ['spinach', 'avocado', 'beans'] },
			Dinner: { title: 'Baked Chicken with Quinoa & Broccoli', prepTime: 10, cookTime: 30, totalTime: 40, instructions: 'Bake chicken, cook quinoa, and steam broccoli.', ingredients: ['chicken', 'quinoa', 'broccoli'] }
		},
		{ 
			day: 'Friday', 
			Breakfast: { title: 'Eggs with Sautéed Spinach & Tomatoes', prepTime: 5, cookTime: 10, totalTime: 15, instructions: 'Sauté spinach and tomatoes, then scramble eggs.', ingredients: ['eggs', 'spinach', 'tomatoes'] },
			Lunch: { title: 'Quinoa Bowl with Tofu & Veggies', prepTime: 10, cookTime: 15, totalTime: 25, instructions: 'Combine quinoa with pan-fried tofu and vegetables.', ingredients: ['quinoa', 'tofu', 'broccoli'] },
			Dinner: { title: 'Chicken Rice Bowl with Garlic & Onions', prepTime: 10, cookTime: 20, totalTime: 30, instructions: 'Cook chicken and rice with garlic and onions.', ingredients: ['chicken', 'rice', 'garlic', 'onions'] }
		},
		{ 
			day: 'Saturday', 
			Breakfast: { title: 'Oatmeal with Berries & Yogurt', prepTime: 5, cookTime: 5, totalTime: 10, instructions: 'Cook oatmeal and top with berries and yogurt.', ingredients: ['oats', 'berries', 'yogurt'] },
			Lunch: { title: 'Chicken & Avocado Salad', prepTime: 10, cookTime: 0, totalTime: 10, instructions: 'Combine grilled chicken with fresh avocado and greens.', ingredients: ['chicken', 'avocado', 'spinach'] },
			Dinner: { title: 'Tofu Curry with Tomatoes & Rice', prepTime: 15, cookTime: 20, totalTime: 35, instructions: 'Cook tofu in curry sauce with tomatoes, serve over rice.', ingredients: ['tofu', 'tomatoes', 'rice'] }
		},
		{ 
			day: 'Sunday', 
			Breakfast: { title: 'Egg Avocado Toast with Tomatoes', prepTime: 5, cookTime: 5, totalTime: 10, instructions: 'Toast bread, top with avocado, fried egg, and tomatoes.', ingredients: ['eggs', 'avocado', 'tomatoes'] },
			Lunch: { title: 'Bean & Quinoa Bowl', prepTime: 10, cookTime: 15, totalTime: 25, instructions: 'Combine cooked quinoa with beans and vegetables.', ingredients: ['beans', 'quinoa'] },
			Dinner: { title: 'Grilled Chicken with Spinach & Broccoli', prepTime: 10, cookTime: 20, totalTime: 30, instructions: 'Grill chicken and serve with fresh spinach and steamed broccoli.', ingredients: ['chicken', 'spinach', 'broccoli'] }
		}
	]
}


