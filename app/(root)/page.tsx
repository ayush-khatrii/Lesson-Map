// import CallToAction from "@/components/Cta"
// import Features from "@/components/Features"
// import Footer from "@/components/Footer"
// import Hero from "@/components/Hero"
// import Preview from "@/components/Preview"

// const page = () => {
//   return (
//     <section>
//       <Hero />
//       <Features />
//       <Preview />
//       <CallToAction />
//       <Footer />
//     </section>
//   )
// }

// export default page

"use client";

import { useEffect, useRef, useState } from "react";
import CurrentYear from "@/components/CurrentYear";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, CheckCircle2, Grip, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { useSession } from "@/lib/auth-client";
// ─── tiny helpers ────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── dot-grid background (reusable) ─────────────────────────────────────────

function DotGrid({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(circle, hsl(var(--foreground)/0.08) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        maskImage:
          "radial-gradient(ellipse 80% 80% at 50% 0%, #000 50%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 80% at 50% 0%, #000 50%, transparent 100%)",
      }}
    />
  );
}

function useAuthCtaLinks() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  return {
    primaryHref: isLoggedIn ? "/dashboard" : "/sign-in",
    isLoggedIn,
  };
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { primaryHref, isLoggedIn } = useAuthCtaLinks();

  return (
    <section className="relative z-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-28 sm:px-6 lg:px-8 md:py-36">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex max-w-5xl flex-col items-center text-center"
        >
          <Badge
            variant="outline"
            className="rounded-full px-4 py-1 text-xs uppercase tracking-wide mb-4"
          >
            Intelligent Course Design Platform
          </Badge>

          <h1 className="mt-8 text-5xl font-bold md:text-7xl">
            Transform Ideas Into
            <span className="block text-primary">Structured Learning</span>
          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            LessonMap helps educators, creators, and learning teams design
            engaging learning experiences faster with AI-assisted outlining,
            modular planning, and a visual drag-and-drop builder.
          </p>

          <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href={primaryHref}>
                {isLoggedIn ? "Go to Dashboard" : "Start Building"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/examples">Watch Demo</Link>
            </Button>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              AI-Assisted Planning
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Drag & Drop Builder
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Modular Curriculum Design
            </div>
          </div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative mx-auto mt-20 max-w-6xl"
        >
          <div className="rounded-3xl border bg-background/80 p-3 shadow-2xl backdrop-blur-xl">
            <div className="rounded-2xl border bg-muted/30 p-6">
              {/* Fake Dashboard */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Sidebar */}
                <div className="rounded-2xl border bg-background p-5">
                  <div className="mb-5 h-5 w-32 rounded bg-muted" />

                  <div className="space-y-3">
                    <div className="h-12 rounded-lg bg-muted" />
                    <div className="h-12 rounded-lg bg-muted" />
                    <div className="h-12 rounded-lg bg-primary/10 border border-primary/20" />
                    <div className="h-12 rounded-lg bg-muted" />
                  </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 rounded-2xl border bg-background p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-6 w-48 rounded bg-muted" />
                      <div className="mt-3 h-4 w-64 rounded bg-muted" />
                    </div>

                    <div className="h-10 w-28 rounded-lg bg-primary/20" />
                  </div>

                  <div className="mt-8 space-y-4">
                    <div className="rounded-xl border p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="h-5 w-44 rounded bg-muted" />
                          <div className="mt-3 h-4 w-72 rounded bg-muted" />
                        </div>

                        <Grip className="text-muted-foreground" />
                      </div>
                    </div>

                    <div className="rounded-xl border p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="h-5 w-52 rounded bg-muted" />
                          <div className="mt-3 h-4 w-60 rounded bg-muted" />
                        </div>

                        <Grip className="text-muted-foreground" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="h-5 w-40 rounded bg-primary/20" />
                          <div className="mt-3 h-4 w-52 rounded bg-primary/10" />
                        </div>

                        <Sparkles className="text-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Stats strip ─────────────────────────────────────────────────────────────

function Stats() {
  const stats = [
    { value: "12,000+", label: "Courses Created" },
    { value: "3,400+", label: "Educators & Creators" },
    { value: "98%", label: "Satisfaction Rate" },
    { value: "4×", label: "Faster Than Manual" },
  ];

  return (
    <section className="border-y border-border/50 bg-muted/20 py-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <FadeUp key={s.label} delay={i * 80}>
              <p className="text-3xl md:text-4xl font-bold tracking-tight">
                {s.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    emoji: "🧱",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Visual Course Builder",
    description:
      "Create, edit, and reorder lessons through a modern drag-and-drop interface. What you see is exactly what you get.",
  },
  {
    emoji: "✨",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    title: "AI-Assisted Outlining",
    description:
      "Let AI instantly generate a structured module plan as your first draft — then refine it exactly how you want.",
  },
  {
    emoji: "🧩",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Modular Learning Design",
    description:
      "Build courses in isolated modules and lessons that are easy to edit, reorder, and scale over time.",
  },
  {
    emoji: "📋",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    title: "Context-Rich Descriptions",
    description:
      "Add purpose and detail to every module so your teaching flow stays consistent and intentional.",
  },
  {
    emoji: "💬",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    title: "Guided Feedback",
    description:
      "Instant visual confirmations for every action — save, edit, validate — so you always know what's happening.",
  },
  {
    emoji: "🔒",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    title: "Private & Secure",
    description:
      "Access controls ensure your learning content stays yours — always. No surprises, no sharing without consent.",
  },
];

function Features() {
  return (
    <section id="features" className="py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <FadeUp>
            <Badge
              variant="secondary"
              className="rounded-full px-4 py-1 text-xs uppercase tracking-wide mb-4"
            >
              Features
            </Badge>
          </FadeUp>
          <FadeUp delay={100}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Build Smarter, Not Harder
            </h2>
          </FadeUp>
          <FadeUp delay={200}>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Everything you need to design structured, high-impact learning
              experiences — and nothing you don't.
            </p>
          </FadeUp>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FadeUp key={f.title} delay={i * 70}>
              <Card className="group h-full border border-border/50 bg-card hover:border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                <CardContent className="p-6 flex flex-col gap-4 h-full">
                  <div
                    className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center text-xl`}
                  >
                    {f.emoji}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-1.5">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: "Select or Create a Course",
    desc: "Start from a blank canvas or pick from your existing courses. LessonMap adapts to where you are.",
  },
  {
    num: "02",
    title: "Add Modules & Lessons",
    desc: "Define topics, chapters, and lessons. Give each module a short description to keep context sharp.",
  },
  {
    num: "03",
    title: "Reorder With Drag & Drop",
    desc: "Rearrange modules and lessons instantly. Your course structure updates in real time.",
  },
  {
    num: "04",
    title: "AI Assist (Optional)",
    desc: "Hit Generate and let AI draft an entire module plan for you. Edit, delete, or keep whatever you like.",
  },
  {
    num: "05",
    title: "Save, Review & Publish",
    desc: "Finalize your outline, export as PDF, or share directly with your learners.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how"
      className="py-28 bg-muted/20 relative overflow-hidden"
    >
      <DotGrid className="opacity-50" />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <FadeUp>
            <Badge
              variant="secondary"
              className="rounded-full px-4 py-1 text-xs uppercase tracking-wide mb-4"
            >
              How It Works
            </Badge>
          </FadeUp>
          <FadeUp delay={100}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              From Idea to Outline in Minutes
            </h2>
          </FadeUp>
          <FadeUp delay={200}>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Five simple steps from blank page to structured course — no manual
              fussing required.
            </p>
          </FadeUp>
        </div>

        <div className="relative">
          {/* vertical line */}
          <div className="hidden md:block absolute left-[28px] top-6 bottom-6 w-px bg-border" />

          <div className="space-y-6">
            {STEPS.map((step, i) => (
              <FadeUp key={step.num} delay={i * 80}>
                <div className="flex gap-6 items-start group">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl border-2 border-border bg-background flex items-center justify-center font-mono text-sm font-bold text-primary group-hover:border-primary group-hover:bg-primary/5 transition-colors z-10">
                    {step.num}
                  </div>
                  <Card className="flex-1 border-border/50 hover:border-border transition-all hover:shadow-md">
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.desc}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Who It's For ─────────────────────────────────────────────────────────────

const AUDIENCES = [
  {
    emoji: "🧑‍🏫",
    title: "Educators",
    desc: "Get structure and simplicity in your curriculum design. Stop wrestling with clunky LMS tools.",
    tag: "Curriculum Design",
  },
  {
    emoji: "💼",
    title: "L&D Teams",
    desc: "Build scalable, consistent training programs that your entire organization can align around.",
    tag: "Corporate Training",
  },
  {
    emoji: "🚀",
    title: "Bootcamp Creators",
    desc: "Launch structured course offerings fast — with professional outlines that impress from day one.",
    tag: "EdTech",
  },
  {
    emoji: "✍️",
    title: "Independent Instructors",
    desc: "Organize your lessons effortlessly and spend more time teaching, less time planning.",
    tag: "Solo Creators",
  },
];

function WhoItsFor() {
  return (
    <section id="who" className="py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <FadeUp>
            <Badge
              variant="secondary"
              className="rounded-full px-4 py-1 text-xs uppercase tracking-wide mb-4"
            >
              Who It's For
            </Badge>
          </FadeUp>
          <FadeUp delay={100}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Built for Every Kind of Educator
            </h2>
          </FadeUp>
          <FadeUp delay={200}>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Whether you're a solo instructor or running a full L&D program,
              LessonMap fits your workflow.
            </p>
          </FadeUp>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {AUDIENCES.map((a, i) => (
            <FadeUp key={a.title} delay={i * 80}>
              <Card className="group border-border/50 hover:border-primary/40 hover:shadow-lg transition-all duration-300 overflow-hidden">
                <CardContent className="p-7 flex gap-5 items-start">
                  <div className="text-4xl mt-0.5 flex-shrink-0">{a.emoji}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{a.title}</h3>
                      <Badge
                        variant="outline"
                        className="text-xs rounded-full px-2 py-0"
                      >
                        {a.tag}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {a.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote:
      "LessonMap cut my course prep time in half. The AI outline feature alone is worth it — I went from a blank doc to a full 12-module plan in under 10 minutes.",
    name: "Sarah K.",
    role: "Online Educator",
    initials: "SK",
  },
  {
    quote:
      "We use LessonMap for all our internal L&D programs. It replaced a spreadsheet nightmare with something our whole team actually enjoys using.",
    name: "David R.",
    role: "Head of L&D, TechCorp",
    initials: "DR",
  },
  {
    quote:
      "As a bootcamp founder, I needed something that was fast and looked professional when I shared it with students. LessonMap nailed both.",
    name: "Priya M.",
    role: "Bootcamp Founder",
    initials: "PM",
  },
];

function Testimonials() {
  return (
    <section
      id="testimonials"
      className="py-28 bg-muted/20 relative overflow-hidden"
    >
      <DotGrid className="opacity-40" />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <FadeUp>
            <Badge
              variant="secondary"
              className="rounded-full px-4 py-1 text-xs uppercase tracking-wide mb-4"
            >
              Testimonials
            </Badge>
          </FadeUp>
          <FadeUp delay={100}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Why People Love LessonMap
            </h2>
          </FadeUp>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <FadeUp key={t.name} delay={i * 100}>
              <Card className="h-full border-border/50 bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-7 flex flex-col gap-5 h-full">
                  {/* stars */}
                  <div className="flex gap-0.5">
                    {Array(5)
                      .fill(0)
                      .map((_, j) => (
                        <svg
                          key={j}
                          className="w-4 h-4 text-yellow-400 fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    "{t.quote}"
                  </p>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {t.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          ))}
        </div>

        {/* why bullets */}
        <FadeUp delay={200} className="mt-14">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
            {[
              "Brings structure to creativity",
              "Intuitive & visual planning",
              "AI as a helper, not replacement",
              "Lightweight — no LMS bloat",
              "Keeps you focused on teaching",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border/50 bg-card px-3 py-4 text-xs text-muted-foreground font-medium leading-snug hover:border-primary/30 transition-colors"
              >
                {item}
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CallToAction() {
  const { primaryHref, isLoggedIn } = useAuthCtaLinks();

  return (
    <section className="py-28 relative overflow-hidden">
      {/* radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, hsl(var(--primary)/0.06) 0%, transparent 70%)",
        }}
      />
      <DotGrid />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <FadeUp>
          <Badge
            variant="outline"
            className="rounded-full px-4 py-1 text-xs uppercase tracking-wide mb-6"
          >
            Get Started
          </Badge>
        </FadeUp>
        <FadeUp delay={100}>
          <h2 className="mx-auto max-w-3xl text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Start Your Next Course Outline Today
          </h2>
        </FadeUp>
        <FadeUp delay={200}>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            No clutter. No limits. Just a smooth, intelligent way to turn your
            ideas into structured course outlines — in minutes.
          </p>
        </FadeUp>
        <FadeUp
          delay={300}
          className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button size="lg" className="h-12 px-10 text-base font-semibold" asChild>
            <Link href={primaryHref}>
              {isLoggedIn ? "Go to Dashboard" : "Start Building Free"}
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
            <Link href="/examples">View Demo</Link>
          </Button>
        </FadeUp>
        <FadeUp delay={400}>
          <p className="mt-6 text-xs text-muted-foreground">
            Free plan forever · No credit card · Cancel anytime
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border/50 py-12 bg-muted/10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="3" rx="1" fill="white" />
                  <rect
                    x="1"
                    y="6"
                    width="8"
                    height="3"
                    rx="1"
                    fill="white"
                    opacity=".7"
                  />
                  <rect
                    x="1"
                    y="11"
                    width="5"
                    height="2"
                    rx="1"
                    fill="white"
                    opacity=".4"
                  />
                </svg>
              </div>
              <span className="font-bold text-base tracking-tight">
                LessonMap
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Making course design as seamless as storytelling.
            </p>
          </div>

          {[
            {
              heading: "Product",
              links: [
                { label: "Features", href: "/#features" },
                { label: "How It Works", href: "/#how" },
                { label: "Pricing", href: "/pricing" },
                { label: "Examples", href: "/examples" },
              ],
            },
            {
              heading: "Explore",
              links: [
                { label: "Who It's For", href: "/#who" },
                { label: "Reviews", href: "/#testimonials" },
                { label: "Dashboard", href: "/dashboard" },
              ],
            },
          ].map((col) => (
            <div key={col.heading}>
              <p className="font-semibold text-sm mb-4">{col.heading}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© <CurrentYear /> LessonMap. All rights reserved.</p>
          <p>Built for educators who deserve better tools.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LessonMapLandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <main className="relative z-10">
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <WhoItsFor />
        <Testimonials />
        <CallToAction />
      </main>
      <BackgroundRippleEffect />
      <Footer />
    </div>
  );
}
