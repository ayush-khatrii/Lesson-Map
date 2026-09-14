"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";

// Native-scroll adaptation of the React Bits pin-and-scale stack interaction.
// Sticky positioning pins each panel; Motion scales the outgoing panel.
function StackPanel({ children, index, count, progress, animated }: {
  children: ReactNode;
  index: number;
  count: number;
  progress: MotionValue<number>;
  animated: boolean;
}) {
  const scale = useTransform(progress, [index / count, (index + 1) / count], [1, 0.94]);
  return (
    <motion.div
      style={{ scale: animated && index < count - 1 ? scale : 1 }}
      className={cn("relative mb-6 origin-top last:mb-0", animated && "sticky top-24 mb-[28vh]")}
    >
      {children}
    </motion.div>
  );
}

export default function FeatureStack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 96px", "end end"] });
  const panels = Children.toArray(children);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)");
    const update = () => setAnimated(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <div ref={ref} className="relative isolate">
      {panels.map((child, index) => (
        <StackPanel key={index} index={index} count={panels.length} progress={scrollYProgress} animated={animated}>
          {child}
        </StackPanel>
      ))}
    </div>
  );
}
