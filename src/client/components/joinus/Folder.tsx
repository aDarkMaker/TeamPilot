import { useState, useRef, useCallback, useEffect } from "react";
import { assetUrl } from "../../lib/assetUrl";
import joinusLeft from "../../assets/img/image/section_hero/joinus_left.webp";
import joinusMiddle from "../../assets/img/image/section_hero/joinus_middle.webp";
import joinusRight from "../../assets/img/image/section_hero/joinus_right.webp";

interface Props {
  items?: React.ReactNode[];
  className?: string;
}

const IMAGES_BY_PAPER = [joinusLeft, joinusRight, joinusMiddle] as const;

const INITIAL_TILT = "perspective(500px) rotateY(-6deg) rotateX(2deg)";

export default function Folder({ items = [], className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [tilt, setTilt] = useState(INITIAL_TILT);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTilt = useRef(false);

  useEffect(() => {
    hasTilt.current = !window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  }, []);

  const maxItems = 3;
  const papers = items.slice(0, maxItems);
  while (papers.length < maxItems) {
    papers.push(null);
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasTilt.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    const rx = clamp(y * 8, -8, 8);
    const ry = clamp(x * 8, -8, 8);
    setTilt(`perspective(500px) rotateX(${-rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt(INITIAL_TILT);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`folder ${open ? "open" : ""} ${className}`.trim()}
      onClick={() => setOpen((v) => !v)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="folder__tilt" style={{ transform: tilt }}>
        <div className="folder__back">
          {papers.map((item, i) => (
            <div key={i} className={`paper paper-${i + 1}`}>
              {item ?? <img src={assetUrl(IMAGES_BY_PAPER[i])} alt="" />}
            </div>
          ))}
          <div className="folder__front" />
          <div className="folder__front right" />
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}
