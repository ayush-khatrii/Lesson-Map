"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { shell } from "./styles";

const posts = [
  {
    name: "Charan Tej Kammara",
    initials: "CK",
    handle: "charan_tej_k",
    id: "2125492708181741713",
    quote: "importing a YouTube playlist straight into a course outline is a really nice shortcut.",
  },
  {
    name: "Veyra | AI & Tech",
    initials: "V",
    handle: "VeyraWithAI",
    id: "2125519003950985235",
    quote: "Importing a YouTube playlist straight in is clever",
  },
  {
    name: "Mason Ai",
    initials: "M",
    handle: "Masonwithai",
    id: "2125538305152340364",
    quote: "Course outlines made simple and shareable",
  },
];

export default function Testimonials() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const inView = useInView(viewportRef);
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !inView || reducedMotion || paused || hovered || focused) return;

    let scrolling: ReturnType<typeof animate> | undefined;
    const timer = window.setInterval(() => {
      const max = viewport.scrollWidth - viewport.clientWidth;
      if (document.hidden || max <= 1) return;

      const current = viewport.scrollLeft;
      const cards = track.querySelectorAll("li");
      const start = cards[0].offsetLeft;
      const nextCard = Array.from(cards).find((card) => card.offsetLeft - start > current + 1);
      const next = current >= max - 1
        ? 0
        : Math.min(max, nextCard ? nextCard.offsetLeft - start : max);

      scrolling?.stop();
      scrolling = animate(current, next, {
        duration: 0.85,
        ease: "easeInOut",
        onUpdate: (position) => { viewport.scrollLeft = position; },
      });
    }, 5000);

    return () => {
      window.clearInterval(timer);
      scrolling?.stop();
    };
  }, [focused, hovered, inView, paused, reducedMotion]);

  return (
    <section aria-labelledby="testimonials-heading" className={`${shell} pb-14 sm:pb-20`}>
      <div className="mb-5 flex items-end justify-between gap-3 border-t border-border pt-8 sm:mb-7 sm:pt-12">
        <div>
          <p className="text-xs font-semibold text-primary-text">From the launch on X</p>
          <h2 id="testimonials-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
            What people are saying
          </h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-11 rounded-full motion-reduce:hidden"
          aria-label={paused ? "Play testimonial scrolling" : "Pause testimonial scrolling"}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </Button>
      </div>

      <div
        ref={viewportRef}
        tabIndex={0}
        role="group"
        aria-label="Scrollable testimonials"
        className="relative overflow-x-auto overscroll-x-contain rounded-xl [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") setPaused(true);
        }}
      >
        <ul ref={trackRef} className="flex gap-3 pb-2 sm:gap-4">
          {posts.map((post) => (
            <li key={post.id} className="flex min-w-0 basis-[88%] shrink-0 sm:basis-[58%] lg:basis-[44%]">
              <Card className="w-full bg-card/70 p-4 sm:p-6">
                <figure className="flex h-full flex-col justify-between gap-5">
                  <blockquote className="text-sm leading-relaxed font-medium text-foreground sm:text-base">
                    <p>“{post.quote}”</p>
                  </blockquote>

                  <figcaption className="flex items-center gap-2.5">
                    <Avatar aria-hidden="true" className="size-9">
                      <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary-text">
                        {post.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 break-words">
                      <p className="text-xs font-semibold sm:text-sm">{post.name}</p>
                      <p className="text-xs text-muted-foreground">@{post.handle}</p>
                    </div>
                    <Button asChild variant="ghost" size="icon-lg" className="size-11 rounded-full text-muted-foreground">
                      <a
                        href={`https://x.com/${post.handle}/status/${post.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View @${post.handle}’s post on X (opens in a new tab)`}
                      >
                        <span aria-hidden="true">𝕏</span>
                        <ArrowUpRight aria-hidden="true" className="size-3" />
                      </a>
                    </Button>
                  </figcaption>
                </figure>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
