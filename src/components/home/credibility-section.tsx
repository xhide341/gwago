"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import modelImg01 from "@/app/assets/images/models/gwago-model-01.png";
import modelImg02 from "@/app/assets/images/models/gwago-model-02.png";
import modelImg03 from "@/app/assets/images/models/gwago-model-03.png";
import { CountUp } from "@/components/ui/count-up";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function CredibilitySection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [startStatsCount, setStartStatsCount] = useState(false);
  const [activeModel, setActiveModel] = useState(1);

  useEffect(() => {
    if (!sectionRef.current) return;

    // Refresh ScrollTrigger when window is resized
    const handleResize = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", handleResize);

    const mm = gsap.matchMedia();

    // Initial Entrance Animation
    const entranceTl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 75%",
        once: true,
      },
    });

    const statItems = statsRef.current?.querySelectorAll(".stat-item");
    if (statItems && statItems.length > 0) {
      entranceTl.fromTo(
        statItems,
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.06,
          ease: "power2.out",
        },
      );
      entranceTl.call(() => setStartStatsCount(true), undefined, "<");
    }

    //  Phase 2: Desktop-only Pinning & Fast Sporty Model Scrub
    mm.add("(min-width: 1280px)", () => {
      const scrubTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=100%",
          pin: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            let target = 1;
            if (p >= 0.66) {
              target = 3;
            } else if (p >= 0.33) {
              target = 2;
            }
            setActiveModel((prev) => (prev !== target ? target : prev));
          },
          onLeaveBack: () => {
            setActiveModel(1);
          },
          onLeave: () => {
            setActiveModel(3);
          },
        },
      });

      return () => {
        setActiveModel(1);
      };
    });

    //  Phase 3: Mobile, Tablet & Laptop Reset
    mm.add("(max-width: 1279px)", () => {
      setActiveModel(1);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      entranceTl.kill();
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex h-auto w-full flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:px-10 lg:py-14 xl:h-svh xl:overflow-hidden xl:p-16"
    >
      {/*  Boxed Card Frame  */}
      <div className="bg-card relative flex size-full w-full flex-col justify-center overflow-hidden rounded-2xl pt-10 pb-0 sm:pt-14 sm:pb-0 lg:pt-16 lg:pb-0 xl:py-0">
        {/*  Main Flexbox Layout */}
        <div className="relative z-10 flex w-full flex-col items-center justify-center gap-8 px-4 sm:gap-10 sm:px-6 lg:gap-12 lg:px-8 xl:h-full xl:flex-row xl:items-end xl:justify-center xl:gap-12 xl:px-12 xl:pt-0 xl:pb-0">
          {/*  Model Container (tall & unshrunk at the bottom on stacked screens, scaled on xl+)  */}
          <div className="pointer-events-none relative order-2 flex h-72 w-full shrink-0 items-end justify-center sm:h-84 md:h-96 lg:h-[30rem] xl:order-1 xl:h-[92%] xl:w-1/2">
            <div className="relative aspect-[972/1024] h-full max-w-full">
              {/* Model 01 */}
              <Image
                src={modelImg01}
                alt="Gwago Model 01"
                quality={90}
                priority
                className={`model-img model-img-1 size-full object-contain object-bottom transition-opacity duration-300 ${
                  activeModel === 1 ? "opacity-100" : "opacity-0"
                }`}
              />
              {/* Model 02  */}
              <Image
                src={modelImg02}
                alt="Gwago Model 02"
                quality={90}
                priority
                className={`model-img model-img-2 pointer-events-none absolute inset-0 size-full object-contain object-bottom transition-opacity duration-300 ${
                  activeModel === 2 ? "opacity-100" : "opacity-0"
                }`}
              />
              {/* Model 03  */}
              <Image
                src={modelImg03}
                alt="Gwago Model 03"
                quality={90}
                priority
                className={`model-img model-img-3 pointer-events-none absolute inset-0 size-full object-contain object-bottom transition-opacity duration-300 ${
                  activeModel === 3 ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
          </div>

          {/*  Stats Container */}
          <div
            ref={statsRef}
            className="order-1 flex w-full flex-col items-center justify-center pt-2 sm:pt-4 lg:pt-6 xl:order-2 xl:h-full xl:w-1/2 xl:justify-center xl:self-center xl:pt-0 xl:pb-0 xl:pl-10"
          >
            <div className="grid w-full max-w-lg grid-cols-1 gap-4 sm:gap-5 md:max-w-2xl md:grid-cols-2 md:gap-x-8 md:gap-y-6 lg:max-w-3xl lg:gap-x-12 lg:gap-y-8 xl:max-w-lg xl:grid-cols-1 xl:gap-12">
              {/* Stat 1*/}
              <div className="stat-item flex w-full flex-col items-center text-center xl:items-start xl:text-left">
                <span className="text-primary inline-flex items-baseline font-sans text-4xl leading-none font-black tracking-tighter tabular-nums sm:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl">
                  <CountUp to={6} duration={1} delay={0} startWhen={startStatsCount} />+
                </span>
                <span className="text-muted-foreground mt-1.5 font-mono text-xs font-semibold tracking-wider whitespace-nowrap uppercase lg:text-sm xl:text-base">
                  YEARS OF EXPERIENCE
                </span>
              </div>

              {/* Stat 2 */}
              <div className="stat-item flex w-full flex-col items-center text-center xl:items-start xl:text-left">
                <span className="text-primary inline-flex items-baseline font-sans text-4xl leading-none font-black tracking-tighter tabular-nums sm:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl">
                  <CountUp
                    to={10000}
                    separator=","
                    duration={1.2}
                    delay={0.06}
                    startWhen={startStatsCount}
                  />
                  +
                </span>
                <span className="text-muted-foreground mt-1.5 font-mono text-xs font-semibold tracking-wider whitespace-nowrap uppercase lg:text-sm xl:text-base">
                  JERSEYS CRAFTED
                </span>
              </div>

              {/* Stat 3 */}
              <div className="stat-item flex w-full flex-col items-center text-center xl:items-start xl:text-left">
                <span className="text-primary inline-flex items-baseline font-sans text-4xl leading-none font-black tracking-tighter tabular-nums sm:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl">
                  <CountUp to={500} duration={1.1} delay={0.12} startWhen={startStatsCount} />+
                </span>
                <span className="text-muted-foreground mt-1.5 font-mono text-xs font-semibold tracking-wider whitespace-nowrap uppercase lg:text-sm xl:text-base">
                  TEAMS & SQUADS EQUIPPED
                </span>
              </div>

              {/* Stat 4: Client Rating */}
              <div className="stat-item flex w-full flex-col items-center text-center xl:items-start xl:text-left">
                <span className="text-primary inline-flex items-baseline font-sans text-4xl leading-none font-black tracking-tighter tabular-nums sm:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl">
                  <CountUp to={4.9} duration={1.1} delay={0.18} startWhen={startStatsCount} />
                </span>
                <span className="text-muted-foreground mt-1.5 font-mono text-xs font-semibold tracking-wider whitespace-nowrap uppercase lg:text-sm xl:text-base">
                  AVERAGE CLIENT RATING
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
