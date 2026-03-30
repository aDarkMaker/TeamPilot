import { useEffect } from "react";
import "../../styles/joinus.css";

const DEPTS = [
	{ tag: "VUP", title: "中之人招募", desc: "二次元有二次元的规矩……" },
	{ tag: "视频组", title: "视频制作", desc: "负责拍摄，后期相关视频制作" },
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
		a: "中之人一定要在主校区且时间相对充裕，能保证一年的活跃时间，除此之外二次元的规矩也是要懂的～",
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

export default function JoinUsPage() {
	useEffect(() => {
		const el = document.documentElement;
		const root = document.querySelector(".joinus-root");
		const kicker = root?.querySelector(".joinus-hero__kicker");
		const header = root?.querySelector(".joinus-header");
		const hero = root?.querySelector(".joinus-hero");
		if (!kicker) return;

		const update = () => {
			const r = (kicker as HTMLElement).getBoundingClientRect();
			const pad = Math.ceil(r.top + window.scrollY);
			el.style.setProperty("--joinus-scroll-padding", `${pad}px`);
		};

		update();
		const ro = new ResizeObserver(update);
		ro.observe(kicker as Element);
		if (header) ro.observe(header as Element);
		if (hero) ro.observe(hero as Element);
		window.addEventListener("resize", update);
		const t = window.setTimeout(update, 0);
		document.fonts?.ready?.then(update);

		return () => {
			window.clearTimeout(t);
			ro.disconnect();
			window.removeEventListener("resize", update);
			el.style.removeProperty("--joinus-scroll-padding");
		};
	}, []);

	return (
		<>
			<main id="joinus-main" className="joinus-main">
				<section className="joinus-hero" aria-labelledby="joinus-hero-title">
					<div>
						<p className="joinus-hero__kicker"> {new Date().getFullYear()} 招新</p>
						<h1 id="joinus-hero-title" className="joinus-hero__title">
							<span className="joinus-hero__title-main">加入华小科</span>
							<span className="joinus-hero__title-sub">期待你的选择，我们一起把想法做成作品！</span>
						</h1>
						<p className="joinus-hero__lead">
							我们欢迎有热情、愿意长期投入的同学，希望能够共同经营一个大家庭！
						</p>
						<div className="joinus-hero__actions">
							<a className="joinus-btn joinus-btn--primary" href="#process-title">
								怎么报名
							</a>
							<a className="joinus-btn joinus-btn--ghost" href="#dept-title">
								都有什么
							</a>
						</div>
					</div>
				</section>
				<section className="joinus-section" aria-labelledby="dept-title">
					<div className="joinus-section__head">
						<h2 id="dept-title" className="joinus-section__title">
							组别一览
						</h2>
						<p className="joinus-section__desc">
							当前开放 VUP、视频、美术、文案、技术与直播六个方向，你可结合兴趣与作品基础选择意向组别！
						</p>
					</div>
					<div className="joinus-grid joinus-grid--dept">
						{DEPTS.map((d) => (
							<article key={d.title} className="joinus-card">
								<span className="joinus-card__tag">{d.tag}</span>
								<h3>{d.title}</h3>
								<p>{d.desc}</p>
							</article>
						))}
					</div>
				</section>
				<section className="joinus-section" aria-labelledby="process-title">
					<div className="joinus-section__head">
						<h2 id="process-title" className="joinus-section__title">
							报名流程
						</h2>
						<p className="joinus-section__desc">先确定意向组别，再提交报名表就可以啦！</p>
					</div>
					<div className="joinus-grid">
						<article className="joinus-card">
							<span className="joinus-card__tag">01</span>
							<h3>选择你的英雄</h3>
							<p>在六个方向中选定你最感兴趣的方向～</p>
						</article>
						<article className="joinus-card">
							<span className="joinus-card__tag">02</span>
							<h3>提交报名表</h3>
							<p>根据实际情况填写报名表，然后提交！</p>
						</article>
						<article className="joinus-card">
							<span className="joinus-card__tag">03</span>
							<h3>坐等开饭</h3>
							<p>提交后留意短信消息，只需等待就好哩？</p>
						</article>
						<article className="joinus-card">
							<span className="joinus-card__tag">04</span>
							<h3>速来面试</h3>
							<p>我们会根据实际情况安排面试时间QwQ</p>
						</article>
						<article className="joinus-card">
							<span className="joinus-card__tag">05</span>
							<h3>误入贼窝</h3>
							<p>如果你通过了面试，那么你就可以加入我们啦！</p>
						</article>
					</div>
				</section>
				<section className="joinus-section" aria-labelledby="faq-title">
					<div className="joinus-section__head">
						<h2 id="faq-title" className="joinus-section__title">
							猜你想搜
						</h2>
						<p className="joinus-section__desc">我为你的求知欲感到喜悦！</p>
					</div>
					<ul className="joinus-faq">
						{FAQ_ITEMS.map((item) => (
							<li key={item.q} className="joinus-faq__pair">
								<div className="joinus-faq__q-wrap">
									<span className="joinus-faq__mark joinus-faq__mark--q" aria-hidden="true">
										Q
									</span>
									<p className="joinus-faq__q">{item.q}</p>
								</div>
								<div className="joinus-faq__a-wrap">
									<p className="joinus-faq__a">{item.a}</p>
									<span className="joinus-faq__mark joinus-faq__mark--a" aria-hidden="true">
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
					© {new Date().getFullYear()} HXK Huaxiaoke Official Team<br />
					All Rights Reserved
				</p>
			</footer>
		</>
	);
}
