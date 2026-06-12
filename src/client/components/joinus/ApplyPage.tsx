import { useEffect, useRef, useState } from 'react';
import '../../styles/joinus.css';
import { renderForm, type FormConfig } from '../../lib/joinus/form';

export default function ApplyPage() {
	const formMountRef = useRef<HTMLDivElement>(null);
	const [hero, setHero] = useState<{ title: string; subtitle: string; welcomeHtml: string } | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch('/joinus/form.json');
				if (!res.ok) throw new Error(`加载表单配置失败 (${res.status})`);
				const config = (await res.json()) as FormConfig;
				if (cancelled) return;
				setHero({
					title: config.title,
					subtitle: config.subtitle ?? 'JOIN US',
					welcomeHtml: (config.welcome ?? '').replace(/\n/g, '<br />'),
				});
				const el = formMountRef.current;
				if (!el) return;
				el.innerHTML = '';
				renderForm(el, config);
			} catch (e) {
				if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<main id="apply-main" className="joinus-main joinus-main--apply">
			<div className="joinus-apply-shell">
				<section className="joinus-apply-panel joinus-form-apply" aria-labelledby="joinus-title" aria-busy={hero ? undefined : true}>
					<header className="joinus-form-hero">
						<h1 id="joinus-title" className="joinus-title">
							{hero?.title ?? '\u00A0'}
						</h1>
						<div className="joinus-title-line" aria-hidden />
						<p id="joinus-subtitle" className="joinus-subtitle">
							{hero?.subtitle ?? ''}
						</p>
						{hero && (
							<p
								id="joinus-welcome"
								className="joinus-welcome"
								// eslint-disable-next-line react/no-danger
								dangerouslySetInnerHTML={{ __html: hero.welcomeHtml }}
							/>
						)}
					</header>
					<div className="joinus-apply-panel__body">
						{loadError && (
							<p className="joinus-form-load-error" role="alert">
								{loadError}
							</p>
						)}
						<div id="joinus-form-container" ref={formMountRef} />
					</div>
				</section>
			</div>
		</main>
	);
}
