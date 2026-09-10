"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export default function Reveal({ children, className, delay = 0 }: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduceMotion ? undefined : { y: [12, 0], opacity: [0.65, 1] }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
