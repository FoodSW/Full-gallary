export type Dish = {
  id: string
  image: string
  date: string // ISO date
  rating: number // average rating
  votes: number
}

export type Vessel = {
  name: string
  thumbnail: string
  rating: number
  photoCount: number
  dishes: Dish[]
}

export const DISH_IMAGES = [
  "/dish-fried.png",
  "/dish-veg.png",
  "/dish-noodles.png",
  "/dish-beef.png",
  "/dish-fruit.png",
  "/dish-breakfast.png",
  "/dish-buffet.png",
  "/dish-rice.png",
  "/dish-soup.png",
  "/dish-chicken.png",
]

// Deterministic pseudo-random generator so server and client render the same output.
function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function buildDishes(seed: number, count: number): Dish[] {
  const rng = makeRng(seed)
  const dishes: Dish[] = []
  for (let i = 0; i < count; i++) {
    const year = 2024 + Math.floor(rng() * 3) // 2024-2026
    const month = 1 + Math.floor(rng() * 12)
    const day = 1 + Math.floor(rng() * 27)
    const rating = Math.round((1 + rng() * 4) * 10) / 10
    const votes = 1 + Math.floor(rng() * 8)
    const date = new Date(year, month - 1, day).toISOString()
    dishes.push({
      id: `${seed}-${i}`,
      image: DISH_IMAGES[Math.floor(rng() * DISH_IMAGES.length)],
      date,
      rating,
      votes,
    })
  }
  return dishes
}

const VESSEL_NAMES = [
  "mv Powan",
  "mv Kaying",
  "mv Poyang",
  "mv Pakhoi",
  "mv Pekin",
  "mv Moana Chief",
  "mv Luenho",
  "mv Hoihow",
  "mv Hanyang",
  "mv Fuchow",
  "mv Lintan",
]

export const VESSELS: Vessel[] = VESSEL_NAMES.map((name, index) => {
  const seed = index * 97 + 13
  const rng = makeRng(seed)
  const photoCount = 40 + Math.floor(rng() * 120)
  const dishes = buildDishes(seed, 14 + Math.floor(rng() * 10))
  const avg = dishes.reduce((sum, d) => sum + d.rating, 0) / dishes.length
  return {
    name,
    thumbnail: "/vessel-container.png",
    rating: Math.round(avg * 10) / 10,
    photoCount,
    dishes,
  }
})

export type RankedDish = Dish & { vessel: string }

export function getExtremeDishes() {
  const all: RankedDish[] = VESSELS.flatMap((v) =>
    v.dishes.map((d) => ({ ...d, vessel: v.name })),
  )
  const sorted = [...all].sort((a, b) => a.rating - b.rating)
  const lowest = sorted.slice(0, 3)
  const highest = [...sorted].reverse().slice(0, 3)
  return { lowest, highest }
}

export const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
]

export type MonthGroup = { month: number; days: DayGroup[] }
export type DayGroup = { day: number; label: string; dishes: Dish[] }
export type YearGroup = { year: number; months: MonthGroup[] }

export function groupDishes(dishes: Dish[]): YearGroup[] {
  const byYear = new Map<number, Map<number, Map<number, Dish[]>>>()
  for (const dish of dishes) {
    const d = new Date(dish.date)
    const y = d.getFullYear()
    const m = d.getMonth()
    const day = d.getDate()
    if (!byYear.has(y)) byYear.set(y, new Map())
    const months = byYear.get(y)!
    if (!months.has(m)) months.set(m, new Map())
    const days = months.get(m)!
    if (!days.has(day)) days.set(day, [])
    days.get(day)!.push(dish)
  }

  const years: YearGroup[] = []
  for (const [year, months] of byYear) {
    const monthGroups: MonthGroup[] = []
    for (const [month, days] of months) {
      const dayGroups: DayGroup[] = []
      for (const [day, dayDishes] of days) {
        const label = `${day} ${MONTH_NAMES[month].charAt(0) + MONTH_NAMES[month].slice(1).toLowerCase()}`
        dayGroups.push({ day, label, dishes: dayDishes })
      }
      dayGroups.sort((a, b) => b.day - a.day)
      monthGroups.push({ month, days: dayGroups })
    }
    monthGroups.sort((a, b) => b.month - a.month)
    years.push({ year, months: monthGroups })
  }
  years.sort((a, b) => b.year - a.year)
  return years
}
