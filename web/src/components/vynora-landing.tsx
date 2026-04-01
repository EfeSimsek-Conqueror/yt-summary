"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Award,
  CheckCircle2,
  Clock,
  Globe,
  Shield,
  Star,
  Users,
  Video,
} from "lucide-react";
import type { LandingSong } from "@/data/landing-coverflow-songs";
import { LandingVideoMarquee } from "@/components/landing/landing-video-marquee";
import {
  CREDITS_PER_5_MIN_BLOCK,
  type PlanId,
  PLAN_ORDER,
  PLANS,
} from "@/lib/billing/plans";

const PLAN_FEATURES: Record<PlanId, string[]> = {
  scout: [
    "5 credits to get started",
    "Subscription feed & YouTube player",
    "Segments, summaries & takeaways",
    "Sign in with Google",
  ],
  navigator: [
    "60 credits per month",
    "Everything in Scout",
    "Best for regular viewers",
    "Scales with your watch habits",
  ],
  captain: [
    "180 credits per month",
    "Everything in Navigator",
    "Best for power users & heavy analysis",
    "Same workspace, higher limits",
  ],
};

const technicalSpecs = [
  {
    category: "YouTube workspace",
    items: [
      "Subscription feed from channels you follow",
      "Standard embed player with jump-to-segment",
      "Public video URLs supported",
      "Focused on long-form understanding",
    ],
  },
  {
    category: "AI analysis",
    items: [
      "Timestamped segments & chapters",
      "Summaries and takeaways",
      "Transcript-backed context when available",
      "Multiple languages where captions exist",
    ],
  },
  {
    category: "Account & billing",
    items: [
      "Stripe checkout for paid tiers",
      "Credit-based usage (per 5 min blocks)",
      "Scout, Navigator, Captain plans",
      "Upgrade or cancel anytime",
    ],
  },
  {
    category: "What you get",
    items: [
      "Copy-friendly notes alongside playback",
      "Quick navigation across long videos",
      "Consistent layout: feed → player → insights",
      "Built for repeat viewing workflows",
    ],
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "YouTube Creator",
    content:
      "VidSum cut my research time on long videos. Jumping to the right segment without scrubbing is a huge win.",
    rating: 5,
    avatar: "SJ",
  },
  {
    name: "Michael Chen",
    role: "Course instructor",
    content:
      "Students get structured takeaways from lecture-style uploads. The summary panel matches how I teach.",
    rating: 5,
    avatar: "MC",
  },
  {
    name: "Emma Davis",
    role: "Product marketer",
    content:
      "We review competitor and keynote content faster. Credits are predictable and the UI stays out of the way.",
    rating: 5,
    avatar: "ED",
  },
];

type VynoraLandingProps = {
  songs: LandingSong[];
};

export function VynoraLanding({ songs }: VynoraLandingProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [particlesReady, setParticlesReady] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    setParticlesReady(true);
  }, []);

  const stats = [
    {
      number: "Feed",
      label: "Subscriptions in one place",
      icon: <Video className="h-8 w-8" />,
    },
    {
      number: "Segments",
      label: "Jump to moments fast",
      icon: <Users className="h-8 w-8" />,
    },
    {
      number: "Credits",
      label: "Fair, usage-based limits",
      icon: <Clock className="h-8 w-8" />,
    },
    {
      number: "AI",
      label: "Summaries & takeaways",
      icon: <Star className="h-8 w-8" />,
    },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-b from-black via-gray-900 to-black px-4 pb-20 pt-10">
      {particlesReady && (
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-white/20"
              initial={{
                x: (i * 127) % 1200,
                y: (i * 73) % 800,
                opacity: 0,
              }}
              animate={{
                y: [null, ((i * 73) % 800) + 1000],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: (i % 10) + 10,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-16 text-center"
        >
          <motion.div
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="mb-6 inline-block text-5xl font-bold md:text-7xl"
            style={{
              background:
                "linear-gradient(90deg, #ffffff, #a78bfa, #ec4899, #f59e0b, #ffffff)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            VidSum
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mb-4 max-w-4xl text-2xl leading-relaxed text-gray-300"
          >
            AI-powered YouTube intelligence
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mx-auto max-w-3xl text-lg leading-relaxed text-gray-400"
          >
            Turn long videos into timestamped segments, clear summaries, and
            takeaways—right next to the player, from the channels you already
            follow.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-24 grid grid-cols-2 gap-6 md:grid-cols-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.8 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-6 text-center"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="mb-3 flex justify-center text-purple-400"
              >
                {stat.icon}
              </motion.div>
              <div className="mb-2 text-4xl font-bold text-white">{stat.number}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        <div id="workflow" className="scroll-mt-28 mb-24">
          <LandingVideoMarquee songs={songs} isVisible={isVisible} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 1.9 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Technical specs
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            What VidSum is built around today
          </p>
        </motion.div>

        <div className="mb-24 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {technicalSpecs.map((spec, index) => (
            <motion.div
              key={spec.category}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.9 }}
              transition={{ duration: 0.5, delay: 2.0 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-6"
            >
              <h4 className="mb-4 text-lg font-bold text-purple-300">
                {spec.category}
              </h4>
              <ul className="space-y-2">
                {spec.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-gray-400"
                  >
                    <span className="mt-1 text-purple-400">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 2.2 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Loved by heavy viewers
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            Early feedback from creators, educators, and teams
          </p>
        </motion.div>

        <div className="mb-24 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 2.3 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 p-6"
            >
              <div className="mb-4 flex items-center gap-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="mb-6 italic leading-relaxed text-gray-300">
                &ldquo;{testimonial.content}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-gray-400">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          id="pricing"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 2.5 }}
          className="scroll-mt-28 mb-12 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-400">
            Credits scale with watch time—pick Scout, Navigator, or Captain
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Analysis uses {CREDITS_PER_5_MIN_BLOCK} credits per 5 minutes of
            video (rounded up to the next block).
          </p>
        </motion.div>

        <div className="mx-auto mb-16 grid max-w-6xl gap-8 md:grid-cols-3">
          {PLAN_ORDER.map((planId, index) => {
            const tier = PLANS[planId];
            const highlighted = Boolean(tier.popular);
            return (
              <motion.div
                key={planId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
                transition={{ duration: 0.6, delay: 2.6 + index * 0.1 }}
                whileHover={{ y: -12, scale: 1.02 }}
                className={`relative rounded-2xl p-8 ${
                  highlighted
                    ? "border-2 border-purple-500/70 bg-gradient-to-br from-purple-600/30 to-pink-600/30 shadow-2xl shadow-purple-500/30"
                    : "border border-gray-700/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60"
                }`}
              >
                {highlighted && (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 transform rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 px-6 py-2 text-sm font-bold text-white shadow-lg"
                  >
                    Most popular
                  </motion.div>
                )}

                <h3 className="mb-2 text-3xl font-bold text-white">
                  {tier.shortName}
                </h3>
                <p className="mb-4 text-sm text-gray-400">{tier.displayName}</p>
                <div className="mb-6">
                  <span className="text-6xl font-bold text-white">
                    {tier.priceLabel}
                  </span>
                  <span className="text-xl text-gray-400">{tier.priceSubtext}</span>
                </div>

                <ul className="mb-8 space-y-3">
                  {PLAN_FEATURES[planId].map((feature, featureIndex) => (
                    <motion.li
                      key={feature}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{
                        opacity: isVisible ? 1 : 0,
                        x: isVisible ? 0 : -10,
                      }}
                      transition={{
                        duration: 0.4,
                        delay: 2.7 + index * 0.1 + featureIndex * 0.05,
                      }}
                      className="flex items-start gap-3 text-gray-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                      <span>{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/dashboard"
                    className={`block w-full rounded-xl py-4 text-center text-lg font-bold transition-all ${
                      highlighted
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                    }`}
                  >
                    {highlighted ? "Get started" : "Choose plan"}
                  </Link>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 2.8 }}
          className="mb-16 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-8"
        >
          <div className="grid gap-8 text-center md:grid-cols-3">
            <div>
              <Shield className="mx-auto mb-3 h-12 w-12 text-purple-400" />
              <h4 className="mb-2 text-lg font-semibold text-white">
                Secure sign-in
              </h4>
              <p className="text-sm text-gray-400">
                Google account; we focus on analysis, not selling your watch
                history
              </p>
            </div>
            <div>
              <Globe className="mx-auto mb-3 h-12 w-12 text-purple-400" />
              <h4 className="mb-2 text-lg font-semibold text-white">
                Web-first
              </h4>
              <p className="text-sm text-gray-400">
                Use VidSum wherever you use YouTube in the browser
              </p>
            </div>
            <div>
              <Award className="mx-auto mb-3 h-12 w-12 text-purple-400" />
              <h4 className="mb-2 text-lg font-semibold text-white">
                Clear limits
              </h4>
              <p className="text-sm text-gray-400">
                Credits tied to analysis length—upgrade when you need more
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 2.9 }}
          className="text-center"
        >
          <h3 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Ready to try VidSum?
          </h3>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-400">
            Open the dashboard with Scout credits and connect your subscription
            feed.
            <br />
            <span className="text-sm">
              No credit card for Scout—paid tiers via Stripe when you upgrade
            </span>
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/dashboard"
              className="inline-block rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 px-10 py-5 text-xl font-bold text-white shadow-2xl shadow-purple-500/40 transition-all hover:shadow-purple-500/60"
            >
              Go to dashboard
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
