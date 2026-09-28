"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import modelImg from "@/app/assets/images/models/gwago-model-hero.png";
import logoImg from "@/app/assets/icons/gwago-icon-raw.svg";
import facebookIcon from "@/app/assets/icons/socials/facebook-mono.svg";
import instagramIcon from "@/app/assets/icons/socials/instagram-mono.svg";
import whatsappIcon from "@/app/assets/icons/socials/whatsapp-mono.svg";
import shopeeIcon from "@/app/assets/icons/socials/shopee-mono.svg";
import { ThemeToggle } from "@/components/theme-toggle";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function HeroSection() {
  const [isInView, setIsInView] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const heroContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        setAnimationDone(true);
        ScrollTrigger.refresh();
      },
    });

    tl.fromTo(
      "#clip-r1",
      { attr: { x: 0.28, y: 0.68, width: 0, height: 0 } },
      {
        attr: { x: -0.01, y: -0.01, width: 1.02, height: 1.02 },
        duration: 1.6,
        delay: 0.15,
        ease: "power3.inOut",
      },
      0,
    );

    tl.fromTo(
      "#clip-r2",
      { attr: { x: 0.72, y: 0.32, width: 0, height: 0 } },
      {
        attr: { x: -0.01, y: -0.01, width: 1.02, height: 1.02 },
        duration: 1.6,
        delay: 0.22,
        ease: "power3.inOut",
      },
      0,
    );

    tl.fromTo(
      ".hero-bg",
      { scale: 1.12 },
      { scale: 1, duration: 1.6, delay: 0.15, ease: "power2.inOut" },
      0,
    );

    tl.add(() => {
      setIsInView(true);
    }, "-=0.75");

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      if (!heroContainerRef.current) return;

      const st = ScrollTrigger.create({
        trigger: heroContainerRef.current,
        start: "top 8px",
        end: "bottom top",
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          heroContainerRef.current?.style.setProperty("--px", self.progress.toFixed(4));
        },
      });

      return () => {
        st.kill();
        heroContainerRef.current?.style.removeProperty("--px");
      };
    });

    return () => {
      tl.kill();
      mm.revert();
    };
  }, []);

  return (
    <section className="relative z-20 px-2">
      {/* Geometric SVG */}
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <defs>
          <clipPath id="gwago-hero-clip" clipPathUnits="objectBoundingBox">
            {/* Rect 1: Bottom-left region */}
            <rect id="clip-r1" x="0.28" y="0.68" width="0" height="0" rx="0.02" />
            {/* Rect 2: Top-right region */}
            <rect id="clip-r2" x="0.72" y="0.32" width="0" height="0" rx="0.02" />
          </clipPath>
        </defs>
      </svg>

      {/* Frame & Content Wrapper */}
      <div className="relative flex w-full flex-col">
        <div
          id="hero-host-frame"
          ref={heroContainerRef}
          className={`relative flex h-[75svh] w-full flex-col rounded-2xl lg:h-[calc(100svh-1*1rem)] lg:rounded-xl lg:rounded-br-xl ${isInView ? "is-inView" : ""}`}
        >
          {/* One Single Unified Background */}
          <div
            className={`absolute inset-0 size-full overflow-hidden rounded-2xl ${
              !animationDone
                ? "[-webkit-clip-path:url(#gwago-hero-clip)] [clip-path:url(#gwago-hero-clip)]"
                : ""
            }`}
          >
            <div className="hero-bg bg-hero-bg-edge relative size-full shadow-2xl [background:radial-gradient(ellipse_at_center,var(--hero-bg-center)_0%,var(--hero-bg-edge)_75%)]">
              {/* Ambient Glow */}
              <div className="animate-hero-glow pointer-events-none absolute inset-0 size-full [background:radial-gradient(ellipse_at_60%_50%,var(--hero-glow)_0%,transparent_65%)]" />

              {/* Model */}
              <div
                className="pointer-events-none absolute inset-0 z-0 will-change-transform lg:-top-[10lvh] lg:h-[calc(100%+10lvh)]"
                style={
                  {
                    "--shift": "10lvh",
                    transform: "translate3d(0, calc(var(--shift, 10lvh) * var(--px, 0)), 0)",
                  } as React.CSSProperties
                }
              >
                <Image
                  src={modelImg}
                  alt="Gwago Model"
                  fill
                  priority
                  quality={90}
                  sizes="100vw"
                  className="object-cover object-[75%_bottom] md:object-bottom xl:object-bottom"
                />
              </div>
            </div>
          </div>

          {/* Top-right navigation controls */}
          <div
            className={`absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 sm:top-5 sm:right-5 sm:gap-2 md:gap-2.5 lg:top-5 lg:right-6 lg:gap-3 xl:top-5 xl:right-7 xl:gap-3.5 ${
              !animationDone ? "transition-all duration-700 ease-out" : ""
            } ${isInView ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"}`}
          >
            {/* Shop Now */}
            <Link
              href="/products"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border border-transparent bg-white px-2.5 text-xs font-medium tracking-wide text-black uppercase transition-all duration-200 hover:bg-white/90 active:scale-95 sm:h-9 sm:px-3.5 sm:text-xs md:h-10 md:px-4 md:text-sm lg:h-11 lg:px-4.5 lg:text-base xl:h-12 xl:px-5"
            >
              Shop Now
            </Link>
            {/* Admin portal */}
            <Link
              href="/admin"
              className="inline-flex h-8 items-center justify-center rounded-sm border border-white/20 bg-transparent px-2.5 text-xs font-medium tracking-wide text-white uppercase backdrop-blur-sm transition-all duration-200 hover:border-white hover:bg-white/10 active:scale-95 sm:h-9 sm:px-3.5 sm:text-xs md:h-10 md:px-4 md:text-sm lg:h-11 lg:px-4.5 lg:text-base xl:h-12 xl:px-5"
            >
              Admin Portal
            </Link>
            {/* Theme toggle */}
            <ThemeToggle
              size="responsive"
              className="rounded-sm border-white/20 text-white hover:border-white hover:bg-white/10"
            />
          </div>

          {/* Title */}
          <h1
            className={`font-primary pointer-events-none relative z-20 mt-auto mb-6 ml-6 flex w-fit flex-col leading-none font-black tracking-tight text-white uppercase transition-all duration-700 ease-out select-none lg:mb-10 lg:ml-10 ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <span className="text-[clamp(3rem,8vw,8rem)]">NOT FOR</span>
            <span className="text-[clamp(4.5rem,11vw,10.5rem)]">EVERYBODY</span>
          </h1>

          {/* Top-left corner notch cutout tab */}
          <div className="bg-background absolute top-0 left-0 z-10 size-[clamp(4.5rem,calc(3.5rem+3.5vw),8.5rem)] rounded-br-xl">
            <div
              className={`flex h-full w-full items-center justify-center ${
                !animationDone ? "transition-all duration-700 ease-out" : ""
              } ${isInView ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"}`}
            >
              <div className="relative flex aspect-square shrink-0 items-center justify-center rounded-full">
                <Image
                  src={logoImg}
                  alt="Gwago"
                  width={240}
                  height={240}
                  priority
                  className="z-100 size-16 rounded-full object-contain sm:size-20 lg:size-28 xl:size-32 dark:invert"
                />
              </div>
            </div>

            {/* Right notch concave curve */}
            <svg
              aria-hidden="true"
              className="fill-background absolute top-0 right-0 size-4 translate-x-[calc(100%-1px)]"
              viewBox="0 0 10 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10 0C4.47715 8.05322e-08 1.28855e-06 4.47715 0 10V0H10Z" />
            </svg>
            {/* Bottom notch concave curve */}
            <svg
              aria-hidden="true"
              className="fill-background absolute bottom-0 left-0 size-4 translate-y-[calc(100%-1px)]"
              viewBox="0 0 10 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10 0C4.47715 8.05322e-08 1.28855e-06 4.47715 0 10V0H10Z" />
            </svg>
          </div>
        </div>

        {/* Bottom-right established text & social links */}
        <div className="lg:bg-background relative z-30 mt-4 flex w-full flex-col gap-3 px-2 sm:mt-5 sm:px-4 md:flex-row md:items-center md:justify-between md:gap-6 lg:absolute lg:right-[-2px] lg:bottom-[-2px] lg:mt-0 lg:w-[clamp(18rem,34vw,34rem)] lg:flex-col lg:items-start lg:gap-5 lg:rounded-tl-2xl lg:p-7">
          <svg
            aria-hidden="true"
            className="fill-background pointer-events-none absolute top-0 right-0 hidden size-5 -translate-y-[calc(100%-2px)] rotate-180 lg:block"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M10 0C4.47715 8.05322e-08 1.28855e-06 4.47715 0 10V0H10Z" />
          </svg>
          <svg
            aria-hidden="true"
            className="fill-background pointer-events-none absolute bottom-0 left-0 hidden size-5 -translate-x-[calc(100%-2px)] rotate-180 lg:block"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M10 0C4.47715 8.05322e-08 1.28855e-06 4.47715 0 10V0H10Z" />
          </svg>

          <p
            className={`text-primary w-full max-w-none text-left text-base leading-relaxed font-medium transition-all duration-700 ease-out md:max-w-xl md:text-lg lg:max-w-[40ch] xl:text-xl ${
              isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Established in 2020, GwAGO Printing Services continues to deliver premium custom apparel
            and merchandise built to stand out.
          </p>
          <div
            className={`flex w-full items-center justify-center gap-3 md:w-auto md:justify-end lg:justify-start ${
              !animationDone ? "transition-all delay-100 duration-700 ease-out" : ""
            } ${isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
          >
            <Link
              href="https://www.facebook.com/gwagoph"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="relative inline-flex size-8 shrink-0 origin-center scale-100 items-center justify-center opacity-90 transition-transform duration-200 ease-out hover:z-10 hover:scale-125 hover:opacity-100 active:scale-95"
            >
              <Image
                src={facebookIcon}
                alt="Facebook"
                width={32}
                height={32}
                priority
                className="pointer-events-none select-none"
              />
            </Link>
            <Link
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="relative inline-flex size-8 shrink-0 origin-center scale-100 items-center justify-center opacity-90 transition-transform duration-200 ease-out hover:z-10 hover:scale-125 hover:opacity-100 active:scale-95"
            >
              <Image
                src={instagramIcon}
                alt="Instagram"
                width={32}
                height={32}
                priority
                className="pointer-events-none select-none"
              />
            </Link>
            <Link
              href="https://wa.me"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="relative inline-flex size-8 shrink-0 origin-center scale-100 items-center justify-center opacity-90 transition-transform duration-200 ease-out hover:z-10 hover:scale-125 hover:opacity-100 active:scale-95"
            >
              <Image
                src={whatsappIcon}
                alt="WhatsApp"
                width={32}
                height={32}
                priority
                className="pointer-events-none select-none"
              />
            </Link>
            <Link
              href="https://shopee.ph"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Shopee"
              className="relative inline-flex size-8 shrink-0 origin-center scale-100 items-center justify-center opacity-90 transition-transform duration-200 ease-out hover:z-10 hover:scale-125 hover:opacity-100 active:scale-95"
            >
              <Image
                src={shopeeIcon}
                alt="Shopee"
                width={32}
                height={32}
                priority
                className="pointer-events-none select-none"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
