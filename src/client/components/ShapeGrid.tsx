import React, { useRef, useEffect, useCallback } from 'react';
import '../styles/shapegrid.css';

interface ShapeGridProps {
	gradientStartColor?: string;
	gradientEndColor?: string;
	borderColor?: string;
	shape?: 'square' | 'circle';
	squareSize?: number;
	speed?: number;
	direction?: 'diagonal' | 'horizontal' | 'vertical';
}

const ShapeGrid: React.FC<ShapeGridProps> = ({
	gradientStartColor = '#eef1f6',
	gradientEndColor = '#eef1f6',
	borderColor = 'rgba(15, 23, 42, 0.07)',
	shape = 'square',
	squareSize = 48,
	speed = 0.25,
	direction = 'diagonal',
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animFrameRef = useRef<number>(0);
	const offsetRef = useRef(0);
	const dimsRef = useRef({ w: 0, h: 0 });
	const dprRef = useRef(1);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const { w, h } = dimsRef.current;
		const size = squareSize;
		const gap = 2;
		const step = size + gap;

		const dx = direction === 'vertical' ? 0 : 1;
		const dy = direction === 'horizontal' ? 0 : 1;
		const offset = offsetRef.current;

		ctx.clearRect(0, 0, w, h);

		const grad = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, h * 0.65);
		grad.addColorStop(0, gradientStartColor);
		grad.addColorStop(1, gradientEndColor);
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, w, h);

		for (let row = -1; row < Math.ceil(h / step) + 1; row++) {
			for (let col = -1; col < Math.ceil(w / step) + 1; col++) {
				const x = col * step + ((offset * dx * speed) % step);
				const y = row * step + ((offset * dy * speed) % step);

				ctx.beginPath();
				if (shape === 'circle') {
					const r = size / 2 - 1;
					ctx.arc(x + size / 2, y + size / 2, r, 0, Math.PI * 2);
				} else {
					ctx.rect(x + 0.5, y + 0.5, size, size);
				}
				ctx.strokeStyle = borderColor;
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		}
	}, [squareSize, speed, direction, borderColor, shape, gradientStartColor, gradientEndColor]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const resize = () => {
			const dpr = window.devicePixelRatio || 1;
			dprRef.current = dpr;
			canvas.width = window.innerWidth * dpr;
			canvas.height = window.innerHeight * dpr;
			dimsRef.current = { w: canvas.width, h: canvas.height };
			const ctx = canvas.getContext('2d');
			ctx?.scale(dpr, dpr);
			draw();
		};

		resize();
		window.addEventListener('resize', resize);

		let lastTime = performance.now();
		const animate = (time: number) => {
			const delta = Math.min((time - lastTime) / 16.667, 3);
			lastTime = time;
			offsetRef.current += delta;
			draw();
			animFrameRef.current = requestAnimationFrame(animate);
		};

		animFrameRef.current = requestAnimationFrame(animate);

		return () => {
			window.removeEventListener('resize', resize);
			cancelAnimationFrame(animFrameRef.current);
		};
	}, [draw]);

	return <canvas ref={canvasRef} className="shapegrid-canvas" aria-hidden="true" />;
};

export default ShapeGrid;
