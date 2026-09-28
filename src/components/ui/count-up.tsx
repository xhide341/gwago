"use client";

import { animate, useInView } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

export interface CountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  ease?: "linear" | "easeIn" | "easeOut" | "easeInOut" | (string & {}) | [number, number, number, number];
  onStart?: () => void;
  onEnd?: () => void;
}

export default function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  separator = "",
  ease = "linear",
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const getDecimalPlaces = (num: number) => {
    const str = num.toString();

    if (str.includes(".")) {
      const decimals = str.split(".")[1];

      if (parseInt(decimals, 10) !== 0) {
        return decimals.length;
      }
    }

    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;

      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      };

      const formattedNumber = Intl.NumberFormat("en-US", options).format(latest);

      return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
    },
    [maxDecimals, separator],
  );

  useEffect(() => {
    if (!isInView || !startWhen) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let controls: { stop: () => void } | undefined;

    const startAnimation = () => {
      if (typeof onStart === "function") onStart();

      const startVal = direction === "down" ? to : from;
      const endVal = direction === "down" ? from : to;

      controls = (animate as any)(startVal, endVal, {
        duration,
        ease: ease ?? "linear",
        onUpdate: (latest: number) => {
          if (ref.current) {
            ref.current.textContent = formatValue(latest);
          }
        },
        onComplete: () => {
          if (ref.current) {
            ref.current.textContent = formatValue(endVal);
          }
          if (typeof onEnd === "function") onEnd();
        },
      });
    };

    if (delay > 0) {
      timeoutId = setTimeout(startAnimation, delay * 1000);
    } else {
      startAnimation();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (controls) controls.stop();
    };
  }, [isInView, startWhen, direction, from, to, delay, duration, ease, formatValue, onStart, onEnd]);

  const initialDisplay = formatValue(direction === "down" ? to : from);

  return (
    <span className={className} ref={ref}>
      {initialDisplay}
    </span>
  );
}

export { CountUp };
