import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section
      className="bg-background relative w-full overflow-hidden px-4 py-6 sm:py-8 md:py-10 lg:px-10 lg:py-24 xl:px-14"
      aria-label="Call to Action"
    >
      <div className="border-border bg-card relative z-10 mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl border p-6 sm:max-w-xl sm:gap-8 sm:p-8 md:max-w-xl md:gap-6 md:p-8 lg:max-w-2xl lg:gap-8 lg:p-10 xl:min-h-[340px] xl:max-w-7xl xl:flex-row xl:items-start xl:justify-between xl:gap-8 xl:p-14">
        {/* Background GWAGO Watermark centered inside card container */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex size-full items-center justify-center overflow-hidden select-none"
        >
          <span className="font-primary text-primary/[0.08] dark:text-primary/[0.12] text-center text-7xl leading-none font-black tracking-normal whitespace-nowrap blur-xs sm:text-8xl md:text-[13rem] lg:text-[16rem] xl:-translate-y-[4%] xl:text-[18rem] 2xl:text-[22rem]">
            GWAGO
          </span>
        </div>

        <div className="relative z-10 flex max-w-3xl flex-col items-center text-center xl:max-w-2xl xl:items-start xl:text-left">
          <span className="text-muted-foreground font-mono text-xs font-bold tracking-wider uppercase">
            Start Your Fit
          </span>
          <h2 className="text-primary mt-2 font-sans text-3xl leading-[1.05] font-black tracking-tighter text-balance uppercase sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl">
            BRING YOUR VISION <br className="hidden sm:inline" /> TO LIFE.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-relaxed sm:text-base md:px-8 lg:px-12 xl:px-0">
            From single custom prototypes to full team kits and tournament merchandise. Build
            uncompromised apparel that stands out on court and streets.
          </p>
        </div>

        <div className="relative z-10 flex w-full shrink-0 flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row xl:justify-end xl:self-end">
          <Button
            asChild
            size="lg"
            className="group bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/10 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-8 font-sans text-xs font-bold tracking-wider uppercase transition-all duration-200 hover:shadow-lg sm:w-auto sm:text-sm"
          >
            <Link href="/order?custom=true">
              <span>Shop Now</span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-border bg-background text-primary hover:bg-muted inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 font-sans text-xs font-bold tracking-wider uppercase transition-all duration-200 sm:w-auto sm:text-sm"
          >
            <Link href="https://www.facebook.com/gwagoph" target="_blank" rel="noopener noreferrer">
              Inquire
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default CtaSection;
