"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export default function Reveal({ children, className, delay = 0, once = true }: {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shouldReduce = mounted && reduceMotion;
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={shouldReduce ? undefined : { y: [10, 0], opacity: [0.72, 1] }}
      viewport={{ once, amount: 0.15 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
