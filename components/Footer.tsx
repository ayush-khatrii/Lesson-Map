"use client";
import { FaGithub, FaTwitter, FaGlobe } from "react-icons/fa";
import CurrentYear from "@/components/CurrentYear";

const Footer = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-white/5 backdrop-blur-md py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="text-2xl font-semibold">
          LessonMap
        </div>

        {/* Nav Links */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#preview" className="hover:text-white transition-colors">
            Preview
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#contact" className="hover:text-white transition-colors">
            Contact
          </a>
        </div>

        {/* Socials */}
        <div className="flex items-center gap-5 text-lg text-muted-foreground">
          <a
            href="https://github.com"
            target="_blank"
            className="hover:text-white transition-colors"
          >
            <FaGithub />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            className="hover:text-white transition-colors"
          >
            <FaTwitter />
          </a>
          <a
            href="https://lessonmap.com"
            target="_blank"
            className="hover:text-white transition-colors"
          >
            <FaGlobe />
          </a>
        </div>
      </div>

      {/* Bottom Line */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground mt-8">
        © <CurrentYear /> LessonMap — Build Smarter, Not Harder.
      </div>
    </footer>
  );
};

export default Footer;
