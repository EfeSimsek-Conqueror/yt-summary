import type { Channel, Video } from "./types";

export const channels: Channel[] = [
  { id: "c1", title: "Fireship" },
  { id: "c2", title: "The Primeagen" },
  { id: "c3", title: "Google for Developers" },
  { id: "c4", title: "Syntax" },
  { id: "c5", title: "Vercel" },
];

export const videos: Video[] = [
  {
    id: "v1",
    channelId: "c1",
    title: "100 JavaScript concepts you need to know",
    durationLabel: "8:42",
    summaryShort:
      "Fast tour of core JS ideas from closures to event loop—good refresher before interviews.",
    transcriptPreview:
      "Welcome back to the channel. Today we are blasting through one hundred JavaScript concepts you should know. We will cover primitives, coercion, closures, prototypes, async patterns, and the event loop. Grab a coffee—this will move fast. First up: let versus const versus var, and why block scope matters in modern codebases…",
    segments: [
      {
        startLabel: "00:00",
        endLabel: "05:00",
        heading: "🎬 Intro & roadmap",
        speakers: ["Host"],
        bullets: [
          "Intro and roadmap for the 100 concepts format.",
          "Primitives, typeof quirks, and BigInt note.",
        ],
      },
      {
        startLabel: "05:00",
        endLabel: "15:00",
        heading: "🧱 Scope & closures",
        speakers: ["Host"],
        mood: "educational",
        bullets: [
          "Scope: function vs block; TDZ for let/const.",
          "Closures with a tiny counter example.",
        ],
      },
      {
        startLabel: "15:00",
        endLabel: "30:00",
        heading: "⚡ this, arrows, classes",
        speakers: ["Host"],
        mood: "comedy",
        bullets: [
          "this binding rules; arrow functions vs regular.",
          "Prototypes, classes as sugar, extends behavior.",
        ],
      },
      {
        startLabel: "30:00",
        endLabel: "45:00",
        bullets: [
          "Promises, async/await, error handling patterns.",
          "Event loop: microtasks vs macrotasks.",
        ],
      },
    ],
  },
  {
    id: "v2",
    channelId: "c1",
    title: "How I would learn to code in 2025",
    durationLabel: "12:05",
    summaryShort:
      "Suggests a practical stack, projects-first path, and avoiding tutorial overload.",
    transcriptPreview:
      "If I had to start over in 2025, I would skip the endless tutorial loop and build small products instead…",
    segments: [
      {
        startLabel: "00:00",
        endLabel: "10:00",
        bullets: ["Mindset: shipping beats consuming content.", "Pick one stack and stay boring."],
      },
    ],
  },
  {
    id: "v3",
    channelId: "c1",
    title: "The problem with Next.js",
    durationLabel: "6:18",
    summaryShort:
      "Tradeoffs of the App Router, caching surprises, and when simpler tools win.",
    transcriptPreview:
      "Next.js is powerful, but the defaults can bite you when you do not understand the caching model…",
    segments: [
      {
        startLabel: "00:00",
        endLabel: "06:18",
        bullets: ["When App Router shines.", "When to reach for something simpler."],
      },
    ],
  },
  {
    id: "v4",
    channelId: "c1",
    title: "Postgres in 100 seconds",
    durationLabel: "15:22",
    summaryShort:
      "CRUD, indexes, and why relational beats NoSQL for many app backends.",
    transcriptPreview:
      "Postgres is the hammer that fits most nails for application data. Here is the minimum you need…",
    segments: [
      { startLabel: "00:00", endLabel: "15:22", bullets: ["Tables, keys, indexes in one breath."] },
    ],
  },
  {
    id: "v5",
    channelId: "c1",
    title: "Docker in 100 seconds",
    durationLabel: "9:01",
    summaryShort:
      "Images vs containers, Dockerfile basics, and compose for local dev stacks.",
    transcriptPreview:
      "Docker packages your app and its dependencies so it runs the same everywhere…",
    segments: [
      { startLabel: "00:00", endLabel: "09:01", bullets: ["Image, container, Dockerfile mental model."] },
    ],
  },
  {
    id: "v6",
    channelId: "c1",
    title: "Git in 100 seconds",
    durationLabel: "4:55",
    summaryShort:
      "Staging, commits, branches, merge vs rebase—minimum viable Git mental model.",
    transcriptPreview:
      "Git tracks snapshots of your project. Staging lets you craft commits with intent…",
    segments: [
      { startLabel: "00:00", endLabel: "04:55", bullets: ["add, commit, branch, merge in sixty seconds."] },
    ],
  },
];

export function getChannel(id: string) {
  return channels.find((c) => c.id === id);
}

export function getVideosForChannel(channelId: string) {
  return videos.filter((v) => v.channelId === channelId);
}

export function getVideo(id: string) {
  return videos.find((v) => v.id === id);
}
