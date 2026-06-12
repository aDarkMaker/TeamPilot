import { useEffect, useRef, useCallback, useState } from "react";
import { gsap } from "gsap";

const C = { borderWidth: 3, cornerSize: 12 } as const;
const INNER = C.cornerSize / 2;
const BREATHE_FACTOR = 1.35;

function cornerPositions(f: number) {
  return [
    { x: -INNER * f - C.cornerSize, y: -INNER * f - C.cornerSize },
    { x: INNER * f, y: -INNER * f - C.cornerSize },
    { x: INNER * f, y: INNER * f },
    { x: -INNER * f - C.cornerSize, y: INNER * f },
  ];
}

const CORNER_REST = cornerPositions(1);

function getAnchorPosition(): { x: number; y: number } | null {
  const head = document.querySelector<HTMLElement>("#process-title .joinus-section__head");
  if (!head) return null;
  const r = head.getBoundingClientRect();
  return { x: r.right - 56, y: r.top + r.height / 2 - 8 };
}

interface Props {
  targetSelector?: string;
}

export default function TargetCursor({ targetSelector = ".joinus-card--process" }: Props) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cornerElsRef = useRef<HTMLDivElement[] | null>(null);
  const spinTl = useRef<gsap.core.Timeline | null>(null);
  const breatheTl = useRef<gsap.core.Timeline | null>(null);
  const tickerFnRef = useRef<(() => void) | null>(null);
  const targetPositionsRef = useRef<{ x: number; y: number }[] | null>(null);
  const strengthRef = useRef({ current: 0 });
  const idleRef = useRef(true);
  const anchorRafRef = useRef(0);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    setIsMobile(window.matchMedia("(hover: none) and (pointer: coarse)").matches);
  }, []);

  const moveCursor = useCallback((x: number, y: number) => {
    if (!cursorRef.current) return;
    gsap.to(cursorRef.current, { x, y, duration: 0.1, ease: "power3.out" });
  }, []);

  useEffect(() => {
    if (!cursorRef.current) return;

    const cursor = cursorRef.current;
    const corners = Array.from(cursor.querySelectorAll<HTMLDivElement>(".target-cursor-corner"));
    cornerElsRef.current = corners;
    const section = document.querySelector<HTMLElement>("#process-title");

    gsap.set(corners, { scale: 1, rotate: 0, xPercent: 0, yPercent: 0 });
    corners.forEach((el, i) => gsap.set(el, { x: CORNER_REST[i]!.x, y: CORNER_REST[i]!.y }));

    let activeTarget: Element | null = null;
    let currentLeaveHandler: (() => void) | null = null;
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null;
    let breatheTimeout: ReturnType<typeof setTimeout> | null = null;
    let onMouseMove: ((e: MouseEvent) => void) | null = null;
    let lastAnchor = { x: 0, y: 0 };

    const cleanup = (t: Element) => {
      if (currentLeaveHandler) t.removeEventListener("mouseleave", currentLeaveHandler);
      currentLeaveHandler = null;
    };

    const createSpin = () => {
      spinTl.current?.kill();
      spinTl.current = gsap.timeline({ repeat: -1 }).to(cursor, { rotation: "+=360", duration: 6, ease: "none" });
    };

    const killCornerTweens = () => {
      breatheTl.current?.kill();
      breatheTl.current = null;
      corners.forEach((el) => gsap.killTweensOf(el, "x,y"));
    };

    const breatheState = { f: 1 };
    const startBreathe = () => {
      killCornerTweens();
      breatheState.f = 1;
      breatheTl.current = gsap.timeline({ repeat: -1, yoyo: true, repeatDelay: 0.3 }).to(breatheState, {
        f: BREATHE_FACTOR,
        duration: 1.4,
        ease: "sine.inOut",
        onUpdate: () => {
          const pos = cornerPositions(breatheState.f);
          corners.forEach((el, i) => gsap.set(el, { x: pos[i]!.x, y: pos[i]!.y }));
        },
      });
    };

    const animateCornersToRest = (dur = 0.3) => {
      killCornerTweens();
      const tl = gsap.timeline();
      corners.forEach((el, i) => tl.to(el, { x: CORNER_REST[i]!.x, y: CORNER_REST[i]!.y, duration: dur, ease: "power3.out" }, 0));
    };

    const goToAnchor = (dur = 0.55) => {
      const anchor = getAnchorPosition();
      if (!anchor) return;
      lastAnchor = { x: anchor.x, y: anchor.y };
      gsap.killTweensOf(cursor, "x,y");
      gsap.to(cursor, { x: anchor.x, y: anchor.y, duration: dur, ease: "power3.out" });
    };

    const anchorPoll = () => {
      if (idleRef.current) {
        const a = getAnchorPosition();
        if (a) {
          const dx = Math.abs(a.x - lastAnchor.x);
          const dy = Math.abs(a.y - lastAnchor.y);
          if (dx > 0.5 || dy > 0.5) {
            lastAnchor = { x: a.x, y: a.y };
            gsap.to(cursor, { x: a.x, y: a.y, duration: 0.35, ease: "power2.out", overwrite: "auto" });
          }
        }
      }
      anchorRafRef.current = requestAnimationFrame(anchorPoll);
    };

    const releaseTarget = () => {
      gsap.ticker.remove(tickerFnRef.current!);
      targetPositionsRef.current = null;
      gsap.set(strengthRef.current, { current: 0, overwrite: true });
      activeTarget = null;
      if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }
      killCornerTweens();
      spinTl.current?.kill();
      animateCornersToRest(0.3);
      goToAnchor(0.55);
      breatheTimeout = setTimeout(() => {
        createSpin();
        startBreathe();
        breatheTimeout = null;
      }, 400);
    };

    const lockOntoTarget = (target: Element) => {
      activeTarget = target;
      killCornerTweens();
      gsap.killTweensOf(cursor, "rotation");
      spinTl.current?.pause();
      gsap.set(cursor, { rotation: 0 });

      const rect = target.getBoundingClientRect();
      const cx = gsap.getProperty(cursor, "x") as number;
      const cy = gsap.getProperty(cursor, "y") as number;
      const bw = C.borderWidth;
      const cs = C.cornerSize;
      targetPositionsRef.current = [
        { x: rect.left - bw, y: rect.top - bw },
        { x: rect.right + bw - cs, y: rect.top - bw },
        { x: rect.right + bw - cs, y: rect.bottom + bw - cs },
        { x: rect.left - bw, y: rect.bottom + bw - cs },
      ];

      corners.forEach((el, i) => {
        gsap.to(el, { x: targetPositionsRef.current![i]!.x - cx, y: targetPositionsRef.current![i]!.y - cy, duration: 0.2, ease: "power2.out" });
      });
    };

    /* ---- 共享 idle 初始化 ---- */
    const anchor = getAnchorPosition();
    const initX = anchor?.x ?? window.innerWidth / 2;
    const initY = anchor?.y ?? window.innerHeight / 2;
    lastAnchor = { x: initX, y: initY };
    gsap.set(cursor, { x: initX, y: initY, scale: 1 });
    createSpin();
    startBreathe();
    anchorRafRef.current = requestAnimationFrame(anchorPoll);

    /* ---- ticker（桌面 card hover 视差）---- */
    const tickerFn = () => {
      if (!targetPositionsRef.current || !cursorRef.current || !cornerElsRef.current) return;
      const str = strengthRef.current.current;
      if (str === 0) return;
      const cx = gsap.getProperty(cursorRef.current, "x") as number;
      const cy = gsap.getProperty(cursorRef.current, "y") as number;
      cornerElsRef.current.forEach((el, i) => {
        const curX = gsap.getProperty(el, "x") as number;
        const curY = gsap.getProperty(el, "y") as number;
        const tgtX = targetPositionsRef.current![i]!.x - cx;
        const tgtY = targetPositionsRef.current![i]!.y - cy;
        gsap.to(el, { x: curX + (tgtX - curX) * str, y: curY + (tgtY - curY) * str, duration: 0.05, ease: "power1.out", overwrite: "auto" });
      });
    };
    tickerFnRef.current = tickerFn;

    /* ==============================
       桌面端：section hover / card hover
       ============================== */
    if (!isMobile) {
      const sectionEnter = (e: Event) => {
        const me = e as MouseEvent;
        idleRef.current = false;
        if (breatheTimeout) { clearTimeout(breatheTimeout); breatheTimeout = null; }
        if (section) section.style.cursor = "none";
        gsap.killTweensOf(cursor, "x,y");
        gsap.to(cursor, { x: me.clientX, y: me.clientY, duration: 0.45, ease: "power3.out" });
        onMouseMove = (ev: MouseEvent) => moveCursor(ev.clientX, ev.clientY);
        window.addEventListener("mousemove", onMouseMove);
      };

      const sectionLeave = () => {
        idleRef.current = true;
        if (section) section.style.cursor = "";
        if (onMouseMove) { window.removeEventListener("mousemove", onMouseMove); onMouseMove = null; }
        if (activeTarget) { cleanup(activeTarget); }
        releaseTarget();
      };

      if (section) {
        section.addEventListener("mouseenter", sectionEnter);
        section.addEventListener("mouseleave", sectionLeave);
      }

      const enter = (e: MouseEvent) => {
        const target = (e.target as Element).closest(targetSelector);
        if (!target || !cursorRef.current || !cornerElsRef.current) return;
        if (activeTarget === target) return;
        if (activeTarget) cleanup(activeTarget);
        if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }
        if (breatheTimeout) { clearTimeout(breatheTimeout); breatheTimeout = null; }

        lockOntoTarget(target);
        gsap.ticker.add(tickerFnRef.current!);
        gsap.to(strengthRef.current, { current: 1, duration: 0.2, ease: "power2.out" });

        const leave = () => {
          gsap.ticker.remove(tickerFnRef.current!);
          releaseTarget();
          cleanup(target);
        };
        currentLeaveHandler = leave;
        target.addEventListener("mouseleave", leave);
      };

      window.addEventListener("mouseover", enter as EventListener);

      const onScroll = () => {
        if (!activeTarget || !cursorRef.current) return;
        const cx = gsap.getProperty(cursorRef.current, "x") as number;
        const cy = gsap.getProperty(cursorRef.current, "y") as number;
        const el = document.elementFromPoint(cx, cy);
        if (!el || !(el === activeTarget || el.closest(targetSelector) === activeTarget)) currentLeaveHandler?.();
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        cancelAnimationFrame(anchorRafRef.current);
        gsap.ticker.remove(tickerFnRef.current!);
        if (onMouseMove) window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseover", enter as EventListener);
        window.removeEventListener("scroll", onScroll);
        if (section) {
          section.removeEventListener("mouseenter", sectionEnter);
          section.removeEventListener("mouseleave", sectionLeave);
        }
        if (activeTarget) cleanup(activeTarget);
        if (resumeTimeout) clearTimeout(resumeTimeout);
        if (breatheTimeout) clearTimeout(breatheTimeout);
        spinTl.current?.kill();
        killCornerTweens();
        if (section) section.style.cursor = "";
      };
    }

    /* ==============================
       移动端：点击卡片即锁定，点击其他地方释放
       ============================== */
    const onClick = (e: Event) => {
      const me = e as MouseEvent;
      const target = (me.target as Element).closest(targetSelector);
      if (target) {
        if (activeTarget === target) return;
        if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }
        if (breatheTimeout) { clearTimeout(breatheTimeout); breatheTimeout = null; }

        const wasActive = activeTarget !== null;
        if (wasActive) cleanup(activeTarget!);
        activeTarget = target;

        killCornerTweens();
        gsap.killTweensOf(cursor, "x,y");

        /* 先收回角落 → 移到点击位置 → 展开到新卡片 */
        const tl = gsap.timeline();
        if (wasActive) {
          const r = target.getBoundingClientRect();
          const tgtX = r.left + r.width / 2;
          const tgtY = r.top + r.height / 2;
          corners.forEach((el, i) => tl.to(el, { x: CORNER_REST[i]!.x, y: CORNER_REST[i]!.y, duration: 0.25, ease: "power2.out" }, 0));
          tl.to(cursor, { x: tgtX, y: tgtY, duration: 0.4, ease: "power3.out" }, "-=0.1");
        } else {
          const r = target.getBoundingClientRect();
          const tgtX = r.left + r.width / 2;
          const tgtY = r.top + r.height / 2;
          tl.to(cursor, { x: tgtX, y: tgtY, duration: 0.4, ease: "power3.out" });
        }
        tl.call(() => {
          lockOntoTarget(target);
          gsap.to(strengthRef.current, { current: 1, duration: 0.2, ease: "power2.out" });
        });
      } else {
        if (activeTarget) {
          cleanup(activeTarget);
          releaseTarget();
        }
      }
    };

    if (section) {
      section.addEventListener("click", onClick);
    }

    return () => {
      cancelAnimationFrame(anchorRafRef.current);
      if (section) section.removeEventListener("click", onClick);
      if (resumeTimeout) clearTimeout(resumeTimeout);
      if (breatheTimeout) clearTimeout(breatheTimeout);
      spinTl.current?.kill();
      killCornerTweens();
    };
  }, [isMobile, targetSelector]);

  return (
    <div ref={cursorRef} className="target-cursor-wrapper">
      <div className="target-cursor-dot" />
      <div className="target-cursor-corner corner-tl" />
      <div className="target-cursor-corner corner-tr" />
      <div className="target-cursor-corner corner-br" />
      <div className="target-cursor-corner corner-bl" />
    </div>
  );
}
