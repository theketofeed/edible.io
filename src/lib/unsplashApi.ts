import type { Meal } from '../utils/types';

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
const BASE_URL = 'https://api.unsplash.com';

interface UnsplashPhoto {
    urls: {
        regular: string;
        small: string;
    };
    user: {
        name: string;
        links: {
            html: string;
        };
    };
    links: {
        html: string;
    };
}

interface RecipeImageData {
    url: string;
    attribution: {
        name: string;
        profileUrl: string;
        photoUrl: string;
    };
}

// Simple in-memory cache to avoid duplicate calls during the session
const imageCache: Record<string, RecipeImageData> = {};

// Helper: Extract main ingredient (first ingredient in list)
function extractMainIngredient(meal: Meal): string {
    const ingredients = meal.ingredients || [];
    if (ingredients.length === 0) return 'food';

    // Get first ingredient, remove quantity info in parentheses
    // e.g. "Chicken Breast (200g)" -> "Chicken Breast"
    const main = ingredients[0].split('(')[0].trim();
    return main;
}

// Helper: Extract cooking style from title
function extractCookingStyle(meal: Meal): string {
    const title = meal.title.toLowerCase();

    const styles = [
        'grilled', 'baked', 'roasted', 'sautéed', 'pan-seared',
        'stir-fried', 'fried', 'steamed', 'braised', 'glazed', 'scrambled', 'poached'
    ];

    for (const style of styles) {
        if (title.includes(style)) return style;
    }

    return 'cooked';
}

// Helper: Determine meal type
function getMealTypeGeneric(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('breakfast') || t.includes('omelet') || t.includes('scramble') || t.includes('pancake') || t.includes('oat')) return 'breakfast';
    if (t.includes('lunch') || t.includes('salad') || t.includes('sandwich') || t.includes('soup')) return 'lunch';
    if (t.includes('dinner') || t.includes('steak') || t.includes('roast') || t.includes('pasta')) return 'dinner';
    return 'meal';
}

async function searchUnsplash(query: string): Promise<RecipeImageData | null> {
    const refinedQuery = query.trim().toLowerCase();

    if (imageCache[refinedQuery]) {
        console.log(`[Unsplash] Cache hit for "${refinedQuery}"`);
        return imageCache[refinedQuery];
    }

    try {
        // Appending 'professional food photography' helps quality
        const finalQuery = `${refinedQuery} plated dish professional food photography`;

        console.log(`[Unsplash] Fetching image for query: "${refinedQuery}"`);

        const response = await fetch(
            `${BASE_URL}/search/photos?query=${encodeURIComponent(finalQuery)}&per_page=1&orientation=landscape&content_filter=high`,
            {
                headers: {
                    Authorization: `Client-ID ${ACCESS_KEY}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const photo: UnsplashPhoto = data.results[0];

        if (!photo) {
            console.warn(`[Unsplash] No results found for query: "${refinedQuery}"`);
            return null;
        }

        const imageData: RecipeImageData = {
            url: photo.urls.regular,
            attribution: {
                name: photo.user.name,
                profileUrl: photo.user.links.html,
                photoUrl: photo.links.html,
            },
        };

        // Cache the result
        imageCache[refinedQuery] = imageData;
        return imageData;

    } catch (error) {
        console.error(`[Unsplash] Error searching for "${refinedQuery}":`, error);
        return null;
    }
}

// Cache for meal titles to avoid re-running the multi-attempt search
const mealImageCache = new Map<string, RecipeImageData>();

export async function fetchRecipeImage(meal: Meal): Promise<RecipeImageData | null> {
    if (!ACCESS_KEY) {
        console.warn('Unsplash Access Key missing in environment variables.');
        return null;
    }

    // specific cache by meal title to avoid re-running the waterfall
    const cacheKey = meal.title.toLowerCase().trim();
    if (mealImageCache.has(cacheKey)) {
        console.log(`[Unsplash] Using cached image for meal: "${meal.title}"`);
        return mealImageCache.get(cacheKey) || null;
    }

    const attempts = [
        // Attempt 1: Full recipe title
        meal.title,

        // Attempt 2: Main ingredient + cooking style
        `${extractMainIngredient(meal)} ${extractCookingStyle(meal)}`,

        // Attempt 3: Main ingredient + meal type/dish
        `${extractMainIngredient(meal)} dish`,

        // Attempt 4: Simplified Title (first 3 words)
        meal.title.split(' ').slice(0, 3).join(' '),

        // Attempt 5: Generic meal type
        getMealTypeGeneric(meal.title), // "breakfast", "lunch", "dinner"

        // Attempt 6: Final fallback
        'healthy meal'
    ];

    // Deduplicate queries
    const uniqueAttempts = Array.from(new Set(attempts.filter(Boolean)));

    console.log(`[Unsplash] Starting multi-attempt search for: "${meal.title}"`);
    console.log(`[Unsplash] Strategies:`, uniqueAttempts);

    for (const query of uniqueAttempts) {
        try {
            const result = await searchUnsplash(query);
            if (result) {
                console.log(`[Unsplash] check: successfully found image for "${query}"`);
                // Cache the final result for this meal title
                mealImageCache.set(cacheKey, result);
                return result;
            }
        } catch (err) {
            console.warn(`[Unsplash] Failed attempt for query "${query}":`, err);
            continue;
        }
    }

    console.warn(`[Unsplash] All attempts failed for meal: "${meal.title}"`);
    return null;
}
