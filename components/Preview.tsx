"use client";
import { motion } from "framer-motion";
import { Badge } from "./ui/badge";
import { MagicCard } from "./ui/magic-card";
import { AuroraText } from "./ui/aurora-text";

const Preview = () => {
  return (
    <section className="relative py-24 overflow-hidden">

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="secondary" className="text-base rounded-full my-5 py-0 px-4">
            Live Preview
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            From Idea to Outline in Minutes
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-12">
            Experience LessonMap’s interactive builder — where your ideas transform into structured, beautiful course outlines.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative max-w-5xl mx-auto"
        >
          <MagicCard className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
            <img
              src="/ss.png"
              alt="LessonMap Preview"
              className="w-full h-auto rounded-3xl hover:scale-[1.02] transition-transform duration-700"
            />

            <div className="absolute bottom-6 right-6 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-sm text-white shadow-md">
              ⚡ Interactive Builder
            </div>

            {/* Floating Gradient Glow */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/60 to-transparent" />
          </MagicCard>
        </motion.div>
      </div>
    </section>
  );
};

export default Preview;
