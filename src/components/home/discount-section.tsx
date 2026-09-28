"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface TicketTier {
  id: string;
  discountNum: string;
  discountSuffix: string;
  range: string;
  badge?: string;
}

const TIERS: TicketTier[] = [
  {
    id: "tier-1",
    discountNum: "15%",
    discountSuffix: "OFF",
    range: "3–9 ITEMS",
  },
  {
    id: "tier-2",
    discountNum: "20%",
    discountSuffix: "OFF",
    range: "10–24 ITEMS",
  },
  {
    id: "tier-3",
    discountNum: "30%",
    discountSuffix: "OFF",
    range: "25+ ITEMS",
    badge: "BEST VALUE",
  },
];

export function DiscountSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const textContentRef = useRef<HTMLDivElement>(null);
  const ticketsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      const entranceTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          once: true,
        },
      });

      // 1. Text elements fade and slide up
      if (textContentRef.current) {
        entranceTl.fromTo(
          textContentRef.current.children,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
          },
        );
      }

      // 2. Tickets slide in from the right into aligned stack
      const ticketWrappers =
        ticketsContainerRef.current?.querySelectorAll(".ticket-motion-wrapper");
      if (ticketWrappers && ticketWrappers.length > 0) {
        entranceTl.fromTo(
          ticketWrappers,
          {
            opacity: 0,
            x: 60,
          },
          {
            opacity: 1,
            x: 0,
            duration: 0.65,
            stagger: 0.12,
            ease: "power2.out",
          },
          "-=0.4",
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="bg-background relative flex w-full flex-col overflow-hidden px-4 py-6 sm:py-8 sm:px-6 md:py-10 lg:px-10 lg:py-20 xl:h-[50svh] xl:min-h-[460px] xl:px-14 xl:py-2"
    >
      {/* ── Content Frame ── */}
      <div className="relative flex h-full w-full flex-col justify-center">
        <div className="relative z-10 mx-auto flex size-full w-full max-w-6xl flex-col items-center justify-center gap-10 sm:gap-12 lg:gap-14 xl:max-w-7xl xl:flex-row xl:items-center xl:justify-center xl:gap-28 2xl:gap-32">
          {/* ── Promotional Copy & CTA (Centered on <xl, left-aligned on xl+) ── */}
          <div
            ref={textContentRef}
            className="flex w-full flex-col items-center justify-center text-center xl:w-auto xl:max-w-md xl:items-start xl:text-left"
          >
            {/* Headline */}
            <h2 className="text-primary font-sans text-3xl leading-[1.05] font-black tracking-tighter uppercase sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl">
              MORE PIECES.
              <br />
              BETTER PRICE.
            </h2>

            {/* Subtext */}
            <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed font-normal sm:mt-4 sm:text-base lg:max-w-lg xl:max-w-sm">
              From building your own personal fit to dressing your team and community, bring more
              pieces together and unlock exclusive discounts along the way.
            </p>

            {/* Primary CTA */}
            <div className="mt-5 flex justify-center sm:mt-6 lg:mt-8 xl:justify-start">
              <Button
                asChild
                size="lg"
                className="group bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/10 inline-flex h-11 items-center gap-2 rounded-full px-6 font-sans text-xs font-bold tracking-wider uppercase transition-all duration-200 hover:shadow-lg sm:text-sm"
              >
                <Link href="/products">
                  <span>Explore Products</span>
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* ── Horizontal Rectangular Ticket Stack (Centered on <xl, right-aligned on xl+) ── */}
          <div
            ref={ticketsContainerRef}
            className="relative flex w-full flex-1 items-center justify-center xl:justify-end xl:py-0"
          >
            <div className="relative flex w-full max-w-md flex-col -space-y-px sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-[560px] 2xl:max-w-[620px]">
              {TIERS.map((tier) => (
                <div key={tier.id} className="ticket-motion-wrapper w-full">
                  <div className="discount-ticket group border-border bg-card relative flex h-12 w-full cursor-pointer items-center rounded-sm border backdrop-blur-md transition-transform duration-300 ease-out hover:z-20 hover:!-translate-x-2 sm:h-16 sm:hover:!-translate-x-4 lg:h-16 lg:hover:!-translate-x-4 xl:h-16 xl:hover:!-translate-x-4">
                    {/* Left: Discount percentage (same font size across all tiers) */}
                    <div className="xs:w-[120px] relative flex h-full w-[105px] shrink-0 items-center justify-start pr-2.5 pl-3 sm:w-[155px] sm:pr-4 sm:pl-5 lg:w-[155px] lg:pr-4 lg:pl-5 xl:w-[155px] xl:pr-4 xl:pl-5">
                      <div className="flex items-baseline gap-1 sm:gap-1.5">
                        <span className="text-primary xs:text-2xl font-sans text-xl font-black tracking-tighter sm:text-3xl lg:text-3xl xl:text-3xl">
                          {tier.discountNum}
                        </span>
                        <span className="text-muted-foreground xs:text-[11px] font-sans text-[10px] font-black tracking-wider uppercase sm:text-xs lg:text-xs xl:text-xs">
                          {tier.discountSuffix}
                        </span>
                      </div>

                      {/* Perforated vertical dashed divider line */}
                      <div className="border-border pointer-events-none absolute top-0 right-0 bottom-0 border-r border-dashed" />
                    </div>

                    {/* Right: Streamlined item range & Best Value badge anchored to right corner */}
                    <div className="flex h-full flex-1 items-center justify-end gap-2 px-3 sm:gap-4 sm:px-6 md:px-8 lg:gap-4 lg:px-6 xl:gap-4 xl:px-6">
                      {tier.badge && (
                        <span className="border-primary/20 bg-primary/10 text-primary inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[9px] font-extrabold tracking-wider whitespace-nowrap uppercase sm:px-3 sm:py-1 sm:text-xs lg:px-2.5 lg:py-1 lg:text-xs xl:px-2.5 xl:py-1 xl:text-xs">
                          {tier.badge}
                        </span>
                      )}
                      <span className="text-primary text-right font-mono text-[11px] font-bold tracking-wider whitespace-nowrap uppercase sm:text-sm lg:text-sm xl:text-sm">
                        {tier.range}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
