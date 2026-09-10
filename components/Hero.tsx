"use client";
import { Button } from "@/components/ui/button";
import React from "react";
import { AuroraText } from "@/components/ui/aurora-text";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { LiaAngleRightSolid } from "react-icons/lia";
import { LightRays } from "./ui/light-rays";

const Hero = () => {
  const { data: session } = useSession();
  const ctaHref = session?.user ? "/dashboard" : "/sign-in";

  return (
    <>
      <section className="relative overflow-hidden flex justify-center items-center flex-col h-screen py-4">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center flex justify-center items-center flex-col">
            <h1 className="text-4xl md:text-6xl font-bold w-full max-w-5xl">
              Map Out Your
              <AuroraText className="mx-2"> Courses </AuroraText>
              in Minutes{" "}
            </h1>
            <p className="py-4 text-sm md:text-2xl opacity-80 w-full max-w-xs md:max-w-4xl">
              Easily outline modules, lessons, and steps with a clean, visual
              dashboard designed to give structure to your entire course
              journey.
            </p>
          </div>
          <div className="my-4 flex md:flex-row flex-col w-full px-5 justify-center items-center gap-3">
            <Button variant={"default"} asChild>
              <Link href={ctaHref}>
                {session?.user ? "Go to Dashboard" : "Get Started"}
                <LiaAngleRightSolid />
              </Link>
            </Button>
          </div>
        </div>
        <LightRays />
        {/* <LightRays /> */}
      </section>

      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="min-h-screen w-full relative">
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
        </div>
      </div>
    </>
  );
};

export default Hero;
