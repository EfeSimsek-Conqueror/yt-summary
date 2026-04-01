/**
 * Curated YouTube search queries for the Discover hub (one search per category).
 */
export type DiscoverCategory = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  /** Passed to YouTube search.list `q` */
  query: string;
};

export const DISCOVER_CATEGORIES: DiscoverCategory[] = [
  {
    id: "music",
    title: "Music",
    emoji: "🎵",
    description: "Official videos, live sessions, charts — open any track for lyrics & takeaways.",
    query: "official music video trending",
  },
  {
    id: "football",
    title: "Football",
    emoji: "⚽",
    description: "Goals, highlights, match recaps — great for moment-by-moment breakdowns.",
    query: "football highlights goals premier league",
  },
  {
    id: "top-five",
    title: "Top 5 & lists",
    emoji: "🔥",
    description: "Rankings, countdowns, best-of — structured for segment summaries.",
    query: "top 5 best moments countdown",
  },
  {
    id: "party",
    title: "Party",
    emoji: "🎉",
    description: "Mixes, anthems, dance sets — pick a vibe and analyze.",
    query: "party dance mix 2024",
  },
  {
    id: "science",
    title: "Science & space",
    emoji: "🔬",
    description: "Explainers, experiments, cosmos — dense scripts, rich summaries.",
    query: "science documentary explained",
  },
  {
    id: "tech",
    title: "Tech & AI",
    emoji: "🧠",
    description: "Reviews, keynotes, dev news — ideal for bullet takeaways.",
    query: "tech review AI latest 2024",
  },
  {
    id: "comedy",
    title: "Comedy",
    emoji: "😂",
    description: "Stand-up, sketches, reactions — beat timing in segments.",
    query: "comedy stand up full show",
  },
  {
    id: "fitness",
    title: "Fitness",
    emoji: "💪",
    description: "Workouts, HIIT, motivation — follow-along friendly.",
    query: "home workout fitness motivation",
  },
];
