"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { shell } from "@/components/landing/styles";
import Reveal from "@/components/marketing/Reveal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

type TestimonialItem = {
  id: string;
  name: string;
  initials: string;
  handle: string;
  quote: string;
};

export default function TestimonialsComponent({
  testimonials,
}: {
  testimonials: readonly TestimonialItem[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef);
  const reducedMotion = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!api || testimonials.length < 2 || !inView || reducedMotion || paused || hovered || focused) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [api, focused, hovered, inView, paused, reducedMotion, testimonials.length]);

  if (testimonials.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="border-t border-border/70 bg-muted/20 py-20 sm:py-24"
    >
      <Carousel
        aria-labelledby="testimonials-heading"
        className={`${shell} grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-center lg:gap-16`}
        opts={{ align: "start", loop: true, slidesToScroll: 1, duration: reducedMotion ? 0 : 25 }}
        setApi={setApi}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
      >
        <Reveal rise once={false} className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-text">
            From the launch on X
          </p>
          <h2
            id="testimonials-heading"
            className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl"
          >
            What people are saying
          </h2>
          {testimonials.length > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 md:justify-start">
              <CarouselPrevious className="static top-auto left-auto size-11 translate-y-0" />
              <CarouselNext className="static top-auto right-auto size-11 translate-y-0" />
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
          )}
        </Reveal>

        <div
          className="min-w-0"
          onPointerDown={(event) => {
            if (event.pointerType === "touch") setPaused(true);
          }}
        >
          <CarouselContent className="touch-pan-y touch-pinch-zoom">
            {testimonials.map((testimonial, index) => {
              const url = `https://x.com/${testimonial.handle}/status/${testimonial.id}`;
              return (
                <CarouselItem
                  key={testimonial.id}
                  aria-label={`${index + 1} of ${testimonials.length}`}
                  className="basis-full sm:basis-[72%] md:basis-full lg:basis-1/2"
                >
                  <Card className="h-full gap-0 rounded-2xl border-border/80 bg-card/70 py-5 transition-colors hover:border-primary/40 sm:py-6">
                    <CardContent className="h-full px-5 sm:px-6">
                      <figure className="flex h-full flex-col gap-5">
                        <figcaption className="flex items-center gap-3">
                          <Avatar aria-hidden="true" className="size-9">
                            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary-text">
                              {testimonial.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 break-words">
                            <p className="text-sm font-semibold">{testimonial.name}</p>
                            <p className="text-xs text-muted-foreground">@{testimonial.handle}</p>
                          </div>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-lg"
                            className="size-11 rounded-full text-muted-foreground"
                          >
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`View @${testimonial.handle}’s post on X (opens in a new tab)`}
                            >
                              <span aria-hidden="true">𝕏</span>
                            </a>
                          </Button>
                        </figcaption>
                        <blockquote cite={url} className="text-sm leading-6 text-foreground sm:text-base">
                          <p>“{testimonial.quote}”</p>
                        </blockquote>
                      </figure>
                    </CardContent>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </div>
      </Carousel>
    </section>
  );
}
