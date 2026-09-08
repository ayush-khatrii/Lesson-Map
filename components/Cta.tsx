"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { AuroraText } from "./ui/aurora-text";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useSession } from "@/lib/auth-client";

const CallToAction = () => {
  const { data: session } = useSession();
  const ctaHref = session?.user ? "/dashboard" : "/sign-in";

  return (
    <>
      <div className="w-full relative">
        <div
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage: `
        linear-gradient(to right, #e7e5e4 1px, transparent 1px),
        linear-gradient(to bottom, #e7e5e4 1px, transparent 1px)
      `,
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 0",
            maskImage: `
        repeating-linear-gradient(
              to right,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            repeating-linear-gradient(
              to bottom,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)
      `,
            WebkitMaskImage: `
 repeating-linear-gradient(
              to right,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            repeating-linear-gradient(
              to bottom,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)
      `,
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
        <section className="relative py-28 overflow-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="outline" className="text-base rounded-full my-5 py-0 px-4">
                Get Started
              </Badge>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto max-w-5xl text-4xl md:text-5xl font-bold mb-6"
            >

              <AuroraText>Start Your Next Course Outline Today</AuroraText>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-xl mx-auto mb-10"
            >
              No clutter. No limits. Just a smooth, intelligent way to turn your ideas into structured course outlines — in minutes.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex justify-center"
            >
              <Button size="lg" asChild>
                <Link href={ctaHref}>
                  {session?.user ? "Go to Dashboard" : "Start Building Free"}
                </Link>
              </Button>
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        </section>
      </div>
    </>
  );
};

export default CallToAction;
