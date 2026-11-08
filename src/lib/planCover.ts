type MealSlot = "Breakfast" | "Lunch" | "Dinner"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getDays(planData: unknown): unknown[] {
  if (!isRecord(planData) || !Array.isArray(planData.days)) return []
  return planData.days
}

function getMeal(day: unknown, slot: MealSlot): unknown {
  return isRecord(day) ? day[slot] : undefined
}

function getValidImageUrl(meal: unknown): string | null {
  if (!isRecord(meal) || typeof meal.imageUrl !== "string") return null

  const imageUrl = meal.imageUrl.trim()
  if (!imageUrl) return null

  try {
    if (new URL(imageUrl).hostname.toLowerCase() === "images.unsplash.com") return null
  } catch {
    if (/^https?:\/\/images\.unsplash\.com(?:\/|$)/i.test(imageUrl)) return null
  }

  return imageUrl
}

export function pickPlanPhotos(planData: unknown): string[] {
  const days = getDays(planData)
  const photos: string[] = []
  const picked = new Set<string>()

  const addPhoto = (meal: unknown): boolean => {
    const imageUrl = getValidImageUrl(meal)
    if (!imageUrl || picked.has(imageUrl) || photos.length >= 4) return false
    picked.add(imageUrl)
    photos.push(imageUrl)
    return true
  }

  for (const day of days) {
    for (const slot of ["Dinner", "Lunch", "Breakfast"] as const) {
      if (addPhoto(getMeal(day, slot))) break
    }
    if (photos.length === 4) return photos
  }

  for (const day of days) {
    for (const slot of ["Breakfast", "Lunch", "Dinner"] as const) {
      addPhoto(getMeal(day, slot))
      if (photos.length === 4) return photos
    }
  }

  return photos
}

export function countMeals(planData: unknown): number {
  let count = 0

  for (const day of getDays(planData)) {
    for (const slot of ["Breakfast", "Lunch", "Dinner"] as const) {
      const meal = getMeal(day, slot)
      if (isRecord(meal) && typeof meal.title === "string" && meal.title.trim()) count += 1
    }
  }

  return count
}

export function resizeForCard(url: string): string {
  try {
    const resized = new URL(url)
    if (resized.hostname.toLowerCase() !== "images.pexels.com") return url

    resized.searchParams.set("w", "480")
    resized.searchParams.set("auto", "compress")
    resized.searchParams.set("cs", "tinysrgb")
    resized.searchParams.delete("h")
    return resized.toString()
  } catch {
    return url
  }
}
