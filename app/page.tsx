"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import Lenis from "lenis";
import Link from "next/link";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import HeroVideoDialog from "@/components/magicui/hero-video-dialog";
import { ArrowRight, Play } from "lucide-react";

export default function Home() {
  const { scrollYProgress } = useScroll();
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLElement>(null);
  const isHeroInView = useInView(heroRef);

  // Initialize Lenis
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  const scrollToVideo = () => {
    videoRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-black text-white min-h-screen overflow-x-hidden">
      {/* Flickering Grid Background */}
      <FlickeringGrid
        className="absolute inset-0 opacity-20"
        squareSize={6}
        gridGap={8}
        color="#60a5fa"
        maxOpacity={0.5}
        flickerChance={0.1}
      />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-6"
      >
        <motion.div style={{ y }} className="text-center max-w-6xl mx-auto">
          {/* Alpha Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-blue-500/30 rounded-full bg-blue-500/5 backdrop-blur-sm mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
            </span>
            <span className="text-sm font-mono">NOW IN ALPHA TESTING</span>
          </motion.div>

          {/* Main Title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/haiven.svg"
                alt="Haiven"
                className="h-24 md:h-32 lg:h-40 w-auto"
              />
            </div>
          </motion.div>

          {/* Typing Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isHeroInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.8 }}
            className="mb-12"
          >
            <TypingAnimation
              className="text-2xl md:text-3xl text-gray-300 font-light"
              duration={50}
            >
              Protect your against data-leakage to LLM providers.
            </TypingAnimation>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/chat">
              <ShimmerButton className="px-8 py-4 text-lg">
                <span className="flex items-center gap-2">
                  Start Securing <ArrowRight className="w-5 h-5" />
                </span>
              </ShimmerButton>
            </Link>
            <button
              onClick={scrollToVideo}
              className="px-8 py-4 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors text-lg flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Watch Demo
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 16, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1 h-3 bg-white/50 rounded-full mt-2"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Hero Video Section */}
      <section ref={videoRef} className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="text-4xl md:text-5xl font-bold">See</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/haiven.svg"
                alt="Haiven"
                className="h-10 md:h-10 w-auto"
              />
              <span className="text-4xl md:text-5xl font-bold">
                in <span>action</span>
              </span>
            </div>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Watch how our platform protects your data from LLM providers in
              real-time
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <HeroVideoDialog
              className="w-full"
              animationStyle="top-in-bottom-out"
              videoSrc="https://www.youtube.com/embed/qh3NGpYRG3I?si=4rb-zSdDkVK9qxxb"
              thumbnailSrc="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
              thumbnailAlt="Haiven Demo Video"
            />
          </motion.div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-16 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400 mb-4">
            © 2025 Haiven. Building the future of AI security.
          </p>
          <div className="flex justify-center gap-8 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
