"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export default function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  rise = false,
  as = "div",
  ...props
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  rise?: boolean;
  as?: "div" | "header" | "h1" | "h2" | "p";
  "aria-hidden"?: boolean | "true" | "false";
}) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shouldReduce = mounted && reduceMotion;
  const MotionElement = motion[as];
  return (
    <MotionElement
      {...props}
      className={className}
      initial={rise ? { y: 80, opacity: 0 } : false}
      animate={shouldReduce ? { y: 0, opacity: 1 } : undefined}
      whileInView={shouldReduce ? undefined : rise ? { y: 0, opacity: 1 } : { y: [10, 0], opacity: [0.72, 1] }}
      viewport={{ once, amount: 0.15 }}
      transition={{
        duration: shouldReduce ? 0 : rise ? 0.85 : 0.55,
        delay: shouldReduce ? 0 : delay,
        ease: rise ? [0.22, 0.61, 0.36, 1] : [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionElement>
  );
}
