// Shared form config types. Kept free of zod and server imports so the
// browser can consume them as pure type-only imports.
export interface JoinUsShowWhen {
	questionId: string;
	value: string | string[];
}

export interface JoinUsQuestion {
	id: string;
	type: 'input' | 'select' | 'textarea' | 'file' | 'boolean';
	label: string;
	required?: boolean;
	placeholder?: string;
	icon?: string;
	inputType?: 'text' | 'tel' | 'email';
	options?: string[];
	rows?: number;
	accept?: string;
	interviewMode?: 'offline' | 'online';
	showWhen?: JoinUsShowWhen;
}

export interface JoinUsSubmitConfig {
	label?: string;
	url?: string;
	successTitle?: string;
	successSubtitle?: string;
	successNote?: string;
	successBackUrl?: string;
	successBackLabel?: string;
}

export interface JoinUsFormConfig {
	title: string;
	subtitle?: string;
	welcome?: string;
	questions: JoinUsQuestion[];
	submit?: JoinUsSubmitConfig;
}
