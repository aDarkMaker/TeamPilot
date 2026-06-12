import { useRef, useEffect, useState } from "react";

interface Props {
  text: string;
  className?: string;
  id?: string;
}

export default function ShuffleTitle({ text, className, id }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [active, setActive] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setShouldAnimate(false);
      setActive(true);
      return;
    }
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setShouldAnimate(false);
        setActive(true);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!shouldAnimate || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "-60px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldAnimate]);

  const chars = [...text];

  return (
    <h2
      ref={ref}
      id={id}
      className={`shuffle-parent ${active ? "shuffle-active" : ""} ${className ?? ""}`}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          className="shuffle-char"
          style={{ "--shuffle-index": i } as React.CSSProperties}
        >
          {ch}
        </span>
      ))}
    </h2>
  );
}
