import {
	useId,
	type ButtonHTMLAttributes,
	type InputHTMLAttributes,
	type TextareaHTMLAttributes,
} from 'react';

/** Themed form primitives shared by the dashboard pages (settings, admin forms) */

export function SettingsInput(props: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
	const { className, ...rest } = props;
	return <input {...rest} className={`settings-input ${className ?? ''}`} />;
}

export function SettingsTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
	const { className, ...rest } = props;
	return <textarea {...rest} className={`settings-textarea ${className ?? ''}`} />;
}

export function SettingsButton({
	variant = 'primary',
	className,
	children,
	...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
	return (
		<button
			{...rest}
			type={rest.type ?? 'button'}
			className={`settings-btn ${variant === 'secondary' ? 'secondary' : ''} ${className ?? ''}`}
		>
			{children}
		</button>
	);
}

/**
 * File picker styled as a button. The hidden input and its label are siblings so
 * the label is a direct flex item of the caller's button row; wrapping them in an
 * extra box made the label stretch taller than the button next to it.
 */
export function SettingsFileInput({
	accept,
	disabled,
	label,
	onPick,
	variant = 'inline',
}: {
	accept: string;
	disabled?: boolean;
	label: string;
	onPick: (file: File | null) => void;
	/** 'overlay' renders the label for use on top of the background preview */
	variant?: 'inline' | 'overlay';
}) {
	const id = useId();
	const labelClass = variant === 'overlay' ? 'settings-bg-overlay-btn' : 'settings-file-btn';
	return (
		<>
			<input
				id={id}
				type="file"
				accept={accept}
				disabled={disabled}
				onChange={(e) => onPick(e.target.files?.[0] ?? null)}
				className="settings-file-input"
			/>
			<label htmlFor={id} className={`${labelClass} ${disabled ? 'disabled' : ''}`}>
				{label}
			</label>
		</>
	);
}
