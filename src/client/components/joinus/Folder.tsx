import { useState, useRef, useCallback, useEffect } from 'react';
import { assetUrl } from '@/lib/assetUrl';
import joinusLeft from '@/assets/img/image/section_hero/joinus_left.webp';
import joinusMiddle from '@/assets/img/image/section_hero/joinus_middle.webp';
import joinusRight from '@/assets/img/image/section_hero/joinus_right.webp';

const IMAGES_BY_PAPER = [joinusLeft, joinusRight, joinusMiddle] as const;

const INITIAL_TILT = 'perspective(31.25rem) rotateY(-6deg) rotateX(2deg)';

export default function Folder() {
	const [open, setOpen] = useState(false);
	const [tilt, setTilt] = useState(INITIAL_TILT);
	const containerRef = useRef<HTMLDivElement>(null);
	const hasTilt = useRef(false);

	useEffect(() => {
		hasTilt.current = !window.matchMedia('(hover: none) and (pointer: coarse)').matches;
	}, []);

	useEffect(() => {
		if (!open) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, [open]);

	const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (!hasTilt.current) return;
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return;
		const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
		const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
		const rx = clamp(y * 8, -8, 8);
		const ry = clamp(x * 8, -8, 8);
		setTilt(`perspective(31.25rem) rotateX(${-rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setTilt(INITIAL_TILT);
	}, []);

	return (
		<div
			ref={containerRef}
			className={`folder ${open ? 'open' : ''}`.trim()}
			onClick={() => {
				if (!open) setOpen(true);
			}}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
		>
			<div className="folder__tilt" style={{ transform: tilt }}>
				<div className="folder__back">
					{IMAGES_BY_PAPER.map((img, i) => (
						<div key={i} className={`paper paper-${i + 1}`}>
							<img src={assetUrl(img)} alt="" />
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
