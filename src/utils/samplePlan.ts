import { MealPlanResult } from './types'

export const SAMPLE_PLAN: MealPlanResult = {
	sourceItems: ['Eggs', 'Spinach', 'Chicken', 'Quinoa', 'Oats', 'Berries', 'Yogurt', 'Tofu', 'Broccoli', 'Rice', 'Avocado', 'Beans', 'Tomatoes', 'Onions', 'Garlic', 'Olive oil'],
	sourceText: 'Eggs, spinach, chicken, quinoa, oats, berries, yogurt, tofu, broccoli, rice, avocado, beans, tomatoes, onions, garlic, olive oil.',
	diet: 'Balanced',
	totalDays: 7,
	days: [
		{ day: 'Monday', Breakfast: 'Greek yogurt with berries and oats', Lunch: 'Chicken quinoa bowl with spinach', Dinner: 'Baked tofu with broccoli and rice' },
		{ day: 'Tuesday', Breakfast: 'Scrambled eggs with spinach and avocado', Lunch: 'Quinoa salad with tomatoes and beans', Dinner: 'Grilled chicken with garlic rice and broccoli' },
		{ day: 'Wednesday', Breakfast: 'Overnight oats with berries', Lunch: 'Tofu and veggie stir-fry with rice', Dinner: 'Chicken and bean chili with tomatoes and onions' },
		{ day: 'Thursday', Breakfast: 'Yogurt parfait with oats and berries', Lunch: 'Spinach salad with avocado and beans', Dinner: 'Baked chicken with quinoa and broccoli' },
		{ day: 'Friday', Breakfast: 'Eggs with sautéed spinach and tomatoes', Lunch: 'Quinoa bowl with tofu and veggies', Dinner: 'Chicken rice bowl with garlic and onions' },
		{ day: 'Saturday', Breakfast: 'Oatmeal with berries and yogurt', Lunch: 'Chicken and avocado salad', Dinner: 'Tofu curry with tomatoes and rice' },
		{ day: 'Sunday', Breakfast: 'Egg avocado toast with tomatoes', Lunch: 'Bean and quinoa bowl', Dinner: 'Grilled chicken with spinach and broccoli' }
	]
}


