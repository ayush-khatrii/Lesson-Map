"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";

export interface StackFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

function StackCard({
  feature,
  index,
  total,
}: {
  feature: StackFeature;
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const Icon = feature.icon;

  // Tracks this card's position as it scrolls beneath the ones stacking on top of it.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.75", "start 0.15"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1 - (total - index) * 0.015]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.55]);

  // Each card sticks a little lower than the one before it, so the stack "peeks"
  // as the next card slides over the top of it.
  const topOffset = 112 + index * 18;

  return (
    <div
      ref={ref}
      className="sticky"
      style={{ top: `${topOffset}px`, zIndex: index + 1 }}
    >
      <motion.div
        style={reduceMotion ? undefined : { scale, opacity }}
        className="rounded-2xl border border-border bg-background/95 p-6 shadow-sm backdrop-blur-sm sm:p-8"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
            <Icon aria-hidden="true" className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium tracking-tight text-primary">
              {feature.title}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {feature.description}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function FeatureStack({ features }: { features: StackFeature[] }) {
  return (
    <div className="flex flex-col gap-6">
      {features.map((feature, index) => (
        <StackCard
          key={feature.title}
          feature={feature}
          index={index}
          total={features.length}
        />
      ))}
    </div>
  );
}