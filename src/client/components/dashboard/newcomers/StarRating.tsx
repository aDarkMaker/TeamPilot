import { useState } from 'react';

type Size = 'sm' | 'md';

type DisplayProps = {
	value: number | null;
	max?: number;
	size?: Size;
	className?: string;
};

type InputProps = {
	value: number | null;
	max?: number;
	size?: Size;
	disabled?: boolean;
	onChange: (rating: number) => void;
	className?: string;
};

const MAX_DEFAULT = 5;

function starState(index: number, value: number): 'full' | 'half' | 'empty' {
	const v = Math.max(0, Math.min(MAX_DEFAULT, value));
	if (v >= index) return 'full';
	if (v >= index - 0.5) return 'half';
	return 'empty';
}

function StarPath() {
	return <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
}

function StarGlyph({ state, size }: { state: 'full' | 'half' | 'empty'; size: Size }) {
	if (state === 'half') {
		return (
			<span className={`nc-rating-star nc-rating-star--${size} nc-rating-star--half`} aria-hidden>
				<svg className="nc-rating-star-bg" viewBox="0 0 24 24" focusable="false">
					<StarPath />
				</svg>
				<span className="nc-rating-star-half-clip">
					<svg viewBox="0 0 24 24" focusable="false">
						<StarPath />
					</svg>
				</span>
			</span>
		);
	}

	return (
		<span className={`nc-rating-star nc-rating-star--${size} nc-rating-star--${state}`} aria-hidden>
			<svg viewBox="0 0 24 24" focusable="false">
				<StarPath />
			</svg>
		</span>
	);
}

export function StarRatingDisplay({ value, max = MAX_DEFAULT, size = 'md', className = '' }: DisplayProps) {
	const v = value ?? 0;
	return (
		<span
			className={`nc-rating-stars nc-rating-stars--display nc-rating-stars--${size} ${className}`.trim()}
			role="img"
			aria-label={value != null ? `${value.toFixed(1)} 分` : '暂无评分'}
		>
			{Array.from({ length: max }, (_, i) => (
				<StarGlyph key={i} state={starState(i + 1, v)} size={size} />
			))}
		</span>
	);
}

export function StarRatingInput({ value, max = MAX_DEFAULT, size = 'md', disabled, onChange, className = '' }: InputProps) {
	const [hover, setHover] = useState<number | null>(null);
	const display = hover ?? value ?? 0;

	const pick = (rating: number) => {
		if (disabled) return;
		onChange(rating);
	};

	return (
		<span
			className={`nc-rating-stars nc-rating-stars--input nc-rating-stars--${size} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}
			role="group"
			aria-label="我的评分"
			onMouseLeave={() => setHover(null)}
		>
			{Array.from({ length: max }, (_, i) => {
				const starIndex = i + 1;
				const left = i + 0.5;
				const right = starIndex;
				return (
					<span key={starIndex} className="nc-rating-star-pair">
						<StarGlyph state={starState(starIndex, display)} size={size} />
						<button
							type="button"
							className="nc-rating-half-btn nc-rating-half-btn--left"
							disabled={disabled}
							aria-label={`${left} 星`}
							aria-pressed={value === left}
							onMouseEnter={() => !disabled && setHover(left)}
							onClick={() => pick(left)}
						/>
						<button
							type="button"
							className="nc-rating-half-btn nc-rating-half-btn--right"
							disabled={disabled}
							aria-label={`${right} 星`}
							aria-pressed={value === right}
							onMouseEnter={() => !disabled && setHover(right)}
							onClick={() => pick(right)}
						/>
					</span>
				);
			})}
		</span>
	);
}

export function formatRatingAverage(value: number | null): string {
	if (value == null || Number.isNaN(value)) return '—';
	return value.toFixed(1);
}
