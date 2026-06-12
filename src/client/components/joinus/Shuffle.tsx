import { useRef, useEffect, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface ShuffleProps {
	text: string;
	className?: string;
	style?: React.CSSProperties;
	shuffleDirection?: 'left' | 'right' | 'up' | 'down';
	duration?: number;
	maxDelay?: number;
	ease?: string | ((t: number) => number);
	threshold?: number;
	rootMargin?: string;
	tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
	textAlign?: React.CSSProperties['textAlign'];
	onShuffleComplete?: () => void;
	shuffleTimes?: number;
	animationMode?: 'random' | 'evenodd';
	loop?: boolean;
	loopDelay?: number;
	stagger?: number;
	scrambleCharset?: string;
	colorFrom?: string;
	colorTo?: string;
	triggerOnce?: boolean;
	respectReducedMotion?: boolean;
	triggerOnHover?: boolean;
	triggerOnTouch?: boolean;
}

const Shuffle: React.FC<ShuffleProps> = ({
	text,
	className = '',
	style = {},
	shuffleDirection = 'right',
	duration = 0.35,
	maxDelay = 0,
	ease = 'power3.out',
	threshold = 0.1,
	rootMargin = '-100px',
	tag = 'p',
	textAlign = 'center',
	onShuffleComplete,
	shuffleTimes = 1,
	animationMode = 'evenodd',
	loop = false,
	loopDelay = 0,
	stagger = 0.03,
	scrambleCharset = '',
	colorFrom,
	colorTo,
	triggerOnce = true,
	respectReducedMotion = true,
	triggerOnHover = true,
	triggerOnTouch = true,
}) => {
	const ref = useRef<HTMLElement>(null);
	const [fontsLoaded, setFontsLoaded] = useState(false);
	const [ready, setReady] = useState(false);

	const tlRef = useRef<gsap.core.Timeline | null>(null);
	const playingRef = useRef(false);
	const hoverHandlerRef = useRef<((e: Event) => void) | null>(null);
	const touchHandlerRef = useRef<((e: Event) => void) | null>(null);
	const wrappersRef = useRef<HTMLElement[]>([]);

	useEffect(() => {
		if ('fonts' in document) {
			if (document.fonts.status === 'loaded') setFontsLoaded(true);
			else document.fonts.ready.then(() => setFontsLoaded(true));
		} else setFontsLoaded(true);
	}, []);

	const scrollTriggerStart = useMemo(() => {
		const startPct = (1 - threshold) * 100;
		const mm = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin || '');
		const mv = mm ? parseFloat(mm[1]!) : 0;
		const mu = mm ? mm[2] || 'px' : 'px';
		const sign = mv === 0 ? '' : mv < 0 ? `-=${Math.abs(mv)}${mu}` : `+=${mv}${mu}`;
		return `top ${startPct}%${sign}`;
	}, [threshold, rootMargin]);

	useGSAP(
		() => {
			if (!ref.current || !text || !fontsLoaded) return;
			if (respectReducedMotion && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
				onShuffleComplete?.();
				return;
			}

			const el = ref.current as HTMLElement;
			const start = scrollTriggerStart;

			const removeHandlers = () => {
				if (hoverHandlerRef.current && ref.current) {
					ref.current.removeEventListener('mouseenter', hoverHandlerRef.current);
					hoverHandlerRef.current = null;
				}
				if (touchHandlerRef.current && ref.current) {
					ref.current.removeEventListener('click', touchHandlerRef.current);
					touchHandlerRef.current = null;
				}
			};

			const teardown = () => {
				if (tlRef.current) {
					tlRef.current.kill();
					tlRef.current = null;
				}
				if (wrappersRef.current.length) {
					wrappersRef.current.forEach((wrap) => {
						const inner = wrap.firstElementChild as HTMLElement | null;
						const orig = inner?.querySelector('[data-orig]') as HTMLElement | null;
						if (orig && wrap.parentNode) wrap.parentNode.replaceChild(orig, wrap);
					});
					wrappersRef.current = [];
				}
				playingRef.current = false;
			};

			const build = () => {
				teardown();

				const chars = Array.from(el.textContent || '');
				el.textContent = '';
				wrappersRef.current = [];

				const rolls = Math.max(1, Math.floor(shuffleTimes));
				const rand = (set: string) => set.charAt(Math.floor(Math.random() * set.length)) || '';

				chars.forEach((ch) => {
					const temp = document.createElement('span');
					temp.style.display = 'inline-block';
					temp.style.position = 'fixed';
					temp.style.visibility = 'hidden';
					temp.style.font = getComputedStyle(el).font;
					temp.style.lineHeight = '1';
					temp.textContent = ch;
					el.appendChild(temp);
					const w = temp.getBoundingClientRect().width;
					const h = temp.getBoundingClientRect().height;
					el.removeChild(temp);

					if (!w) return;

					const wrap = document.createElement('span');
					Object.assign(wrap.style, {
						display: 'inline-block',
						overflow: 'hidden',
						width: w + 'px',
						height: shuffleDirection === 'up' || shuffleDirection === 'down' ? h + 'px' : 'auto',
						verticalAlign: 'bottom',
					});

					const inner = document.createElement('span');
					Object.assign(inner.style, {
						display: 'inline-block',
						whiteSpace: shuffleDirection === 'up' || shuffleDirection === 'down' ? 'normal' : 'nowrap',
						willChange: 'transform',
					});

					el.appendChild(wrap);
					wrap.appendChild(inner);

					const firstOrig = document.createElement('span');
					firstOrig.setAttribute('data-orig', '1');
					firstOrig.textContent = ch;
					Object.assign(firstOrig.style, {
						display: shuffleDirection === 'up' || shuffleDirection === 'down' ? 'block' : 'inline-block',
						width: w + 'px',
						textAlign: 'center',
					});

					inner.appendChild(firstOrig);
					for (let k = 0; k < rolls; k++) {
						const c = document.createElement('span');
						if (scrambleCharset) c.textContent = rand(scrambleCharset);
						else c.textContent = ch;
						Object.assign(c.style, {
							display: shuffleDirection === 'up' || shuffleDirection === 'down' ? 'block' : 'inline-block',
							width: w + 'px',
							textAlign: 'center',
						});
						inner.appendChild(c);
					}

					const realChar = document.createElement('span');
					realChar.setAttribute('data-orig', '');
					realChar.textContent = ch;
					Object.assign(realChar.style, {
						display: shuffleDirection === 'up' || shuffleDirection === 'down' ? 'block' : 'inline-block',
						width: w + 'px',
						textAlign: 'center',
					});
					inner.appendChild(realChar);

					const steps = rolls + 1;

					if (shuffleDirection === 'right' || shuffleDirection === 'down') {
						const fc = inner.firstElementChild as HTMLElement | null;
						const lc = inner.lastElementChild as HTMLElement | null;
						if (lc) inner.insertBefore(lc, inner.firstChild);
						if (fc) inner.appendChild(fc);
					}

					let startX = 0;
					let finalX = 0;
					let startY = 0;
					let finalY = 0;

					if (shuffleDirection === 'right') {
						startX = -steps * w;
						finalX = 0;
					} else if (shuffleDirection === 'left') {
						startX = 0;
						finalX = -steps * w;
					} else if (shuffleDirection === 'down') {
						startY = -steps * h;
						finalY = 0;
					} else if (shuffleDirection === 'up') {
						startY = 0;
						finalY = -steps * h;
					}

					if (shuffleDirection === 'left' || shuffleDirection === 'right') {
						gsap.set(inner, { x: startX, y: 0, force3D: true });
						inner.setAttribute('data-start-x', String(startX));
						inner.setAttribute('data-final-x', String(finalX));
					} else {
						gsap.set(inner, { x: 0, y: startY, force3D: true });
						inner.setAttribute('data-start-y', String(startY));
						inner.setAttribute('data-final-y', String(finalY));
					}

					if (colorFrom) (inner.style as any).color = colorFrom;
					wrappersRef.current.push(wrap);
				});
			};

			const strips = () => wrappersRef.current.map((w) => w.firstElementChild as HTMLElement);

			const randomizeScrambles = () => {
				if (!scrambleCharset) return;
				wrappersRef.current.forEach((w) => {
					const strip = w.firstElementChild as HTMLElement;
					if (!strip) return;
					const kids = Array.from(strip.children) as HTMLElement[];
					for (let i = 1; i < kids.length - 1; i++) {
						kids[i]!.textContent = scrambleCharset.charAt(Math.floor(Math.random() * scrambleCharset.length));
					}
				});
			};

			const cleanupToStill = () => {
				wrappersRef.current.forEach((w) => {
					const strip = w.firstElementChild as HTMLElement;
					if (!strip) return;
					const real = strip.querySelector('[data-orig]:not([data-orig="1"])') as HTMLElement | null;
					const target = real || (strip.querySelector('[data-orig]') as HTMLElement | null);
					if (!target) return;
					strip.replaceChildren(target);
					strip.style.transform = 'none';
					strip.style.willChange = 'auto';
				});
			};

			const play = () => {
				const s = strips();
				if (!s.length) return;

				playingRef.current = true;
				const isVertical = shuffleDirection === 'up' || shuffleDirection === 'down';

				const tl = gsap.timeline({
					smoothChildTiming: true,
					repeat: loop ? -1 : 0,
					repeatDelay: loop ? loopDelay : 0,
					onRepeat: () => {
						if (scrambleCharset) randomizeScrambles();
						if (isVertical) {
							gsap.set(s, { y: (i, t: HTMLElement) => parseFloat(t.getAttribute('data-start-y') || '0') });
						} else {
							gsap.set(s, { x: (i, t: HTMLElement) => parseFloat(t.getAttribute('data-start-x') || '0') });
						}
						onShuffleComplete?.();
					},
					onComplete: () => {
						playingRef.current = false;
						if (!loop) {
							cleanupToStill();
							if (colorTo) gsap.set(s, { color: colorTo });
							onShuffleComplete?.();
							armReplay();
						}
					},
				});

				const addTween = (targets: HTMLElement[], at: number) => {
					const vars: any = {
						duration,
						ease,
						force3D: true,
						stagger: animationMode === 'evenodd' ? stagger : 0,
					};
					if (isVertical) {
						vars.y = (i: number, t: HTMLElement) => parseFloat(t.getAttribute('data-final-y') || '0');
					} else {
						vars.x = (i: number, t: HTMLElement) => parseFloat(t.getAttribute('data-final-x') || '0');
					}

					tl.to(targets, vars, at);

					if (colorFrom && colorTo) {
						tl.to(targets, { color: colorTo, duration, ease }, at);
					}
				};

				if (animationMode === 'evenodd') {
					const odd = s.filter((_, i) => i % 2 === 1);
					const even = s.filter((_, i) => i % 2 === 0);
					const oddTotal = duration + Math.max(0, odd.length - 1) * stagger;
					const evenStart = odd.length ? oddTotal * 0.7 : 0;
					if (odd.length) addTween(odd, 0);
					if (even.length) addTween(even, evenStart);
				} else {
					s.forEach((strip) => {
						const d = Math.random() * maxDelay;
						const vars: any = {
							duration,
							ease,
							force3D: true,
						};
						if (isVertical) {
							vars.y = parseFloat(strip.getAttribute('data-final-y') || '0');
						} else {
							vars.x = parseFloat(strip.getAttribute('data-final-x') || '0');
						}
						tl.to(strip, vars, d);
						if (colorFrom && colorTo) tl.fromTo(strip, { color: colorFrom }, { color: colorTo, duration, ease }, d);
					});
				}

				tlRef.current = tl;
			};

			const run = () => {
				if (playingRef.current) return;
				build();
				if (scrambleCharset) randomizeScrambles();
				play();
			};

			const armReplay = () => {
				removeHandlers();
				if (!ref.current) return;

				if (triggerOnHover) {
					const handler = () => {
						if (playingRef.current) return;
						build();
						if (scrambleCharset) randomizeScrambles();
						play();
					};
					hoverHandlerRef.current = handler;
					ref.current.addEventListener('mouseenter', handler);
				}

				if (triggerOnTouch) {
					const handler = () => {
						if (playingRef.current) return;
						build();
						if (scrambleCharset) randomizeScrambles();
						play();
					};
					touchHandlerRef.current = handler;
					ref.current.addEventListener('click', handler);
				}
			};

			const create = () => {
				build();
				if (scrambleCharset) randomizeScrambles();
				play();
				armReplay();
				setReady(true);
			};

			const st = ScrollTrigger.create({
				trigger: el,
				start,
				once: triggerOnce,
				onEnter: create,
			});

			return () => {
				st.kill();
				removeHandlers();
				teardown();
				setReady(false);
			};
		},
		{
			dependencies: [
				text,
				duration,
				maxDelay,
				ease,
				scrollTriggerStart,
				fontsLoaded,
				shuffleDirection,
				shuffleTimes,
				animationMode,
				loop,
				loopDelay,
				stagger,
				scrambleCharset,
				colorFrom,
				colorTo,
				triggerOnce,
				respectReducedMotion,
				triggerOnHover,
				triggerOnTouch,
				onShuffleComplete,
			],
			scope: ref,
		}
	);

	const commonStyle: React.CSSProperties = useMemo(() => ({ textAlign, ...style }), [textAlign, style]);
	const classes = useMemo(() => `shuffle-rbits-parent ${ready ? 'is-ready' : ''} ${className}`, [ready, className]);
	const Tag = (tag || 'p') as any;
	return (
		<Tag ref={ref as any} className={classes} style={commonStyle}>
			{text}
		</Tag>
	);
};

export default Shuffle;
