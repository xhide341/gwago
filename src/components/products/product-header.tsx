"use client";

import Image from "next/image";
import BackgroundImg from "@/app/assets/images/gwago-bg.jpg";

export function ProductHeader() {
  return (
    <section className="relative px-2 pt-4 pb-2">
      <div className="mx-auto max-w-7xl">
        <div className="bg-hero-bg-edge relative flex h-44 w-full flex-col overflow-hidden rounded-xl [background:radial-gradient(ellipse_at_center,var(--hero-bg-center)_0%,var(--hero-bg-edge)_75%)] sm:h-52 md:h-56 lg:h-64">
          <div className="animate-hero-glow pointer-events-none absolute inset-0 size-full [background:radial-gradient(ellipse_at_70%_40%,var(--hero-glow)_0%,transparent_65%)]" />
          <div className="pointer-events-none absolute inset-0 z-0 select-none">
            <div className="relative size-full">
              <Image
                src={BackgroundImg}
                alt="Gwago Background Image"
                fill
                priority
                quality={90}
                sizes="100vw"
                className="object-cover object-center lg:object-[center_20%]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
