import { useEffect, useState, useCallback, useRef } from "react";
import "../../styles/joinus.css";
import ShuffleTitle from "./ShuffleTitle";
import { assetUrl } from "../../lib/assetUrl";
import IconAu from "../../assets/img/icon/joinus/vup/Icon_Au.webp";
import IconBili from "../../assets/img/icon/joinus/vup/Icon_Bili.webp";
import IconObs from "../../assets/img/icon/joinus/vup/Icon_Obs.webp";
import IconAe from "../../assets/img/icon/joinus/video/Icon_Ae.webp";
import IconLr from "../../assets/img/icon/joinus/video/Icon_Lr.webp";
import IconPr from "../../assets/img/icon/joinus/video/Icon_Pr.webp";
import IconAi from "../../assets/img/icon/joinus/art/Icon_Ai.webp";
import IconProcreate from "../../assets/img/icon/joinus/art/Icon_Procreate.webp";
import IconPs from "../../assets/img/icon/joinus/art/Icon_Ps.webp";
import IconDs from "../../assets/img/icon/joinus/word/Icon_Ds.webp";
import IconTxt from "../../assets/img/icon/joinus/word/Icon_Txt.webp";
import IconWord from "../../assets/img/icon/joinus/word/Icon_Word.webp";
import IconGo from "../../assets/img/icon/joinus/tech/Icon_Go.webp";
import IconJs from "../../assets/img/icon/joinus/tech/Icon_Js.webp";
import IconTs from "../../assets/img/icon/joinus/tech/Icon_Ts.webp";
import IconExcel from "../../assets/img/icon/joinus/designer/Icon_Excel.webp";
import IconFeishu from "../../assets/img/icon/joinus/designer/Icon_Feishu.webp";
import IconNotion from "../../assets/img/icon/joinus/designer/Icon_Notion.webp";
import heroImage from "../../assets/img/image/joinus_hero.webp";
import type { CSSProperties } from "react";

interface IconPlacement {
	tx: number;
	ty: number;
	delay: number;
}

interface DeptIcon {
	src: string;
	alt: string;
}

const ICONS_SOURCE: Record<string, { src: string; alt: string }[]> = {
	VUP: [
		{ src: assetUrl(IconAu), alt: "AU" },
		{ src: assetUrl(IconBili), alt: "Bili" },
		{ src: assetUrl(IconObs), alt: "OBS" },
	],
	视频组: [
		{ src: assetUrl(IconAe), alt: "AE" },
		{ src: assetUrl(IconLr), alt: "Lr" },
		{ src: assetUrl(IconPr), alt: "PR" },
	],
	美术组: [
		{ src: assetUrl(IconProcreate), alt: "Procreate" },
		{ src: assetUrl(IconAi), alt: "Ai" },
		{ src: assetUrl(IconPs), alt: "PS" },
	],
	文案组: [
		{ src: assetUrl(IconDs), alt: "DS" },
		{ src: assetUrl(IconTxt), alt: "TXT" },
		{ src: assetUrl(IconWord), alt: "Word" },
	],
	技术组: [
		{ src: assetUrl(IconJs), alt: "JS" },
		{ src: assetUrl(IconTs), alt: "TS" },
		{ src: assetUrl(IconGo), alt: "Go" },
	],
	直播组: [
		{ src: assetUrl(IconExcel), alt: "Excel" },
		{ src: assetUrl(IconNotion), alt: "Notion" },
		{ src: assetUrl(IconFeishu), alt: "Feishu" },
	],
};

const DEPTS = [
	{ tag: "VUP", title: "中之人招募", desc: "二次元有二次元的规矩……" },
	{ tag: "视频组", title: "视频制作", desc: "负责拍摄，后期视频制作" },
	{ tag: "美术组", title: "美术美工", desc: "美术资源提供，周边设计" },
	{ tag: "文案组", title: "文案支持", desc: "文案撰写，剧情策划" },
	{ tag: "技术组", title: "技术开发", desc: "工具开发，日常维护" },
	{ tag: "直播组", title: "策划运营", desc: "提供策划相关支持" },
] as const;

const FAQ_ITEMS = [
	{
		q: "什么都不会能来吗？",
		a: "可以的，兄弟，欢迎来学习，有问大概率必答！",
	},
	{
		q: "中之人有什么要求吗？",
		a: "时间充裕，在主校区，能保证一年的活跃时间～",
	},
	{
		q: "可以加入多个组吗？",
		a: "当然可以，选定一个组是为了方便面试，嗯！",
	},
	{
		q: "面试会被淘汰吗？",
		a: "我们对能力的要求不高，主要是看性格！",
	},
	{
		q: "我们平时有什么活动？",
		a: "我们会有日常团建，来了就懂了～",
	},
] as const;

const ICON_COUNT = 3;

const DEPT_ICON_PLACEMENTS: IconPlacement[] = (() => {
	const phiStart = (5 * Math.PI) / 180;
	const phiEnd = (70 * Math.PI) / 180;
	const r = 68;
	const out: IconPlacement[] = [];
	for (let i = 0; i < ICON_COUNT; i++) {
		const phi =
			phiStart +
			((phiEnd - phiStart) * i) / Math.max(1, ICON_COUNT - 1);
		out.push({
			tx: -Math.cos(phi) * r,
			ty: -Math.sin(phi) * r,
			delay: i * 0.07,
		});
	}
	return out;
})();

export default function JoinUsPage() {
	const [activeCard, setActiveCard] = useState<number | null>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const isTouchDevice = useRef(false);

	const closeActive = useCallback(() => setActiveCard(null), []);

	useEffect(() => {
		const root = document.querySelector(".joinus-root");
		const header = root?.querySelector(".joinus-header");
		const docEl = document.documentElement;
		if (!root || !header) return;

		const update = () => {
			const hr = (header as HTMLElement | null)?.getBoundingClientRect();
			const h = Math.ceil(hr?.height ?? 0);
			docEl.style.setProperty("--joinus-header-h", `${h}px`);
		};

		update();
		const ro = new ResizeObserver(update);
		ro.observe(header as Element);
		window.addEventListener("resize", update);
		const t = window.setTimeout(update, 0);
		void document.fonts?.ready?.then(update);

		const onBrandClick = (e: Event) => {
			const p = window.location.pathname;
			if (p !== "/joinus" && p !== "/joinus/") return;
			e.preventDefault();
			window.scrollTo({ top: 0, behavior: "smooth" });
		};
		const brandEl = root.querySelector(".joinus-brand");
		brandEl?.addEventListener("click", onBrandClick);

		isTouchDevice.current = !window.matchMedia(
			"(hover: hover) and (pointer: fine)",
		).matches;

		const onGlobalClick = (e: MouseEvent) => {
			if (activeCard === null) return;
			const grid = gridRef.current;
			if (!grid) return;
			if (!grid.contains(e.target as Node)) {
				closeActive();
			}
		};

		document.addEventListener("click", onGlobalClick);

		return () => {
			window.clearTimeout(t);
			ro.disconnect();
			window.removeEventListener("resize", update);
			document.removeEventListener("click", onGlobalClick);
			(root as HTMLElement).style.removeProperty("--joinus-header-h");
			docEl.style.removeProperty("--joinus-header-h");
			brandEl?.removeEventListener("click", onBrandClick);
		};
	}, [activeCard, closeActive]);

	const handleCardInteraction = useCallback(
		(e: React.MouseEvent, index: number) => {
			if (!isTouchDevice.current) return;
			e.stopPropagation();
			setActiveCard((prev) => (prev === index ? null : index));
		},
		[],
	);

	const iconStyle = (p: IconPlacement): CSSProperties =>
		({
			"--icon-tx": `${p.tx}px`,
			"--icon-ty": `${p.ty}px`,
			"--icon-delay": `${p.delay}s`,
		}) as CSSProperties;

	return (
		<>
			<main id="joinus-main" className="joinus-main">
				<section className="joinus-hero" aria-labelledby="joinus-hero-title">
					<div>
						<p className="joinus-hero__kicker">
							{new Date().getFullYear()} 招新
						</p>
						<h1 id="joinus-hero-title" className="joinus-hero__title">
							<span className="joinus-hero__title-main">加入华小科</span>
							<span className="joinus-hero__title-sub">
								期待你的选择，一起把想法做成作品！
							</span>
						</h1>
						<p className="joinus-hero__lead">
							欢迎有热情、愿意长期投入的同学，希望共同经营一个大家庭！
						</p>
						<div className="joinus-hero__actions">
							<a
								className="joinus-btn joinus-btn--primary"
								href="#process-title"
							>
								怎么报名
							</a>
							<a
								className="joinus-btn joinus-btn--ghost"
								href="#dept-title"
							>
								都有什么
							</a>
						</div>
					</div>
					<img
						className="joinus-hero__img"
						src={assetUrl(heroImage)}
						alt=""
						aria-hidden="true"
					/>
				</section>
				<section
					id="dept-title"
					className="joinus-section"
					aria-labelledby="dept-title-heading"
				>
					<div className="joinus-section__head">
						<ShuffleTitle id="dept-title-heading" className="joinus-section__title" text="组别一览" />
						<p className="joinus-section__desc">
							当前开放 VUP、视频、美术、文案、技术与直播六个方向，你可结合兴趣与作品基础选择意向组别！
						</p>
					</div>
					<div className="joinus-grid joinus-grid--dept" ref={gridRef}>
						{DEPTS.map((d, idx) => {
								const icons = ICONS_SOURCE[d.tag]!;
									const placements = DEPT_ICON_PLACEMENTS;
							const isActive =
								activeCard === idx ||
								(!isTouchDevice.current && false);
							return (
								<article
									key={d.title}
									className={`joinus-card${
										isActive ? " joinus-card--active" : ""
									}`}
									onClick={(e) =>
										handleCardInteraction(e, idx)
									}
									onMouseEnter={() => {
										if (isTouchDevice.current) return;
										setActiveCard(idx);
									}}
									onMouseLeave={() => {
										if (isTouchDevice.current) return;
										setActiveCard(null);
									}}
								>
									<span className="joinus-card__tag">
										{d.tag}
									</span>
									<h3>{d.title}</h3>
									<p>{d.desc}</p>
									<div
										className="joinus-card__icons"
										aria-hidden="true"
									>
										{icons.map((icon, i) => (
											<img
												key={i}
												className="joinus-card__icon"
												src={icon.src}
												alt={icon.alt}
												style={iconStyle(
													placements[i]!,
												)}
											/>
										))}
									</div>
									<div
										className="joinus-card__corner-blur"
										aria-hidden="true"
									/>
								</article>
							);
						})}
					</div>
				</section>
				<section
					id="process-title"
					className="joinus-section"
					aria-labelledby="process-title-heading"
				>
					<div className="joinus-section__head">
						<ShuffleTitle id="process-title-heading" className="joinus-section__title" text="报名流程" />
						<p className="joinus-section__desc">
							先确定意向组别，再提交报名表就可以啦！
						</p>
					</div>
					<div className="joinus-grid">
						<article className="joinus-card joinus-card--process">
							<span className="joinus-card__tag">01</span>
							<h3>选择你的英雄</h3>
							<p>在六个方向中选定你最感兴趣的方向～</p>
						</article>
						<article className="joinus-card joinus-card--process">
							<span className="joinus-card__tag">02</span>
							<h3>提交报名表</h3>
							<p>根据实际情况填写报名表，然后提交！</p>
						</article>
						<article className="joinus-card joinus-card--process">
							<span className="joinus-card__tag">03</span>
							<h3>坐等开饭</h3>
							<p>提交后留意短信消息，只需等待就好哩？</p>
						</article>
						<article className="joinus-card joinus-card--process">
							<span className="joinus-card__tag">04</span>
							<h3>速来面试</h3>
							<p>我们会根据实际情况安排面试时间QwQ</p>
						</article>
						<article className="joinus-card joinus-card--process">
							<span className="joinus-card__tag">05</span>
							<h3>误入贼窝</h3>
							<p>如果你通过了面试，那么你就可以加入我们啦！</p>
						</article>
					</div>
				</section>
				<section
					id="faq-title"
					className="joinus-section"
					aria-labelledby="faq-title-heading"
				>
					<div className="joinus-section__head">
						<ShuffleTitle id="faq-title-heading" className="joinus-section__title" text="猜你想搜" />
						<p className="joinus-section__desc">
							我为你的求知欲感到喜悦！
						</p>
					</div>
					<ul className="joinus-faq">
						{FAQ_ITEMS.map((item) => (
							<li key={item.q} className="joinus-faq__pair">
								<div className="joinus-faq__q-wrap">
									<span
										className="joinus-faq__mark joinus-faq__mark--q"
										aria-hidden="true"
									>
										Q
									</span>
									<p className="joinus-faq__q">{item.q}</p>
								</div>
								<div className="joinus-faq__a-wrap">
									<p className="joinus-faq__a">{item.a}</p>
									<span
										className="joinus-faq__mark joinus-faq__mark--a"
										aria-hidden="true"
									>
										A
									</span>
								</div>
							</li>
						))}
					</ul>
				</section>
			</main>
			<footer className="joinus-footer">
				<p>
					© {new Date().getFullYear()} HXK Huaxiaoke Official Team
					<br />
					All Rights Reserved
				</p>
			</footer>
		</>
	);
}
