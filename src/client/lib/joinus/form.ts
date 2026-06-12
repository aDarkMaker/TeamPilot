export interface ShowWhen {
	questionId: string;
	value: string | string[];
}

export interface Question {
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
	multiple?: boolean;
	showWhen?: ShowWhen;
}

export interface FormConfig {
	title: string;
	subtitle?: string;
	welcome?: string;
	theme?: string;
	questions: Question[];
	submit?: {
		label?: string;
		successMessage?: string;
		url?: string;
		successTitle?: string;
		successSubtitle?: string;
		successNote?: string;
		successBackUrl?: string;
		successBackLabel?: string;
	};
}

const defaultQuestion: Partial<Question> = { required: false };

function createField(q: Question): HTMLElement {
	const field = document.createElement('div');
	field.className = 'joinus-field' + (q.showWhen ? ' joinus-field-logic' : '');
	field.dataset.questionId = q.id;

	const label = document.createElement('label');
	label.className = 'joinus-label';
	label.innerHTML = `<div class="joinus-label-decor"></div>`;
	const labelText = document.createTextNode(q.label + (q.required ? '' : ''));
	label.appendChild(labelText);
	field.appendChild(label);

	const required = q.required ?? false;
	if (required) label.classList.add('required');

	let control: HTMLElement;
	const icon = q.icon ?? 'ri-edit-line';
	const ph = q.placeholder ?? '';

	switch (q.type) {
		case 'input': {
			const wrap = document.createElement('div');
			wrap.className = 'joinus-input-wrap';
			const input = document.createElement('input');
			input.type = q.inputType ?? 'text';
			input.name = q.id;
			input.placeholder = ph;
			if (required) input.required = true;
			wrap.innerHTML = `<i class="${icon} joinus-input-icon"></i>`;
			wrap.appendChild(input);
			control = wrap;
			break;
		}
		case 'select': {
			const wrap = document.createElement('div');
			wrap.className = 'joinus-input-wrap joinus-select-custom';
			wrap.dataset.select = '';
			const hidden = document.createElement('input');
			hidden.type = 'hidden';
			hidden.name = q.id;
			if (required) hidden.required = true;
			const trigger = document.createElement('button');
			trigger.type = 'button';
			trigger.className = 'joinus-select-trigger';
			trigger.setAttribute('aria-expanded', 'false');
			trigger.setAttribute('aria-haspopup', 'listbox');
			trigger.innerHTML = `<i class="${icon} joinus-input-icon"></i>
				<span class="joinus-select-value placeholder">${ph}</span>
				<i class="ri-arrow-down-s-line joinus-select-arrow"></i>`;
			const dropdown = document.createElement('div');
			dropdown.className = 'joinus-select-dropdown';
			dropdown.setAttribute('role', 'listbox');
			const opts = (q.options ?? []).map((o, i) => {
				const div = document.createElement('div');
				div.className = 'joinus-select-option';
				div.setAttribute('data-value', String(i));
				div.setAttribute('role', 'option');
				div.textContent = o;
				return div;
			});
			dropdown.append(...opts);
			wrap.appendChild(hidden);
			wrap.appendChild(trigger);
			wrap.appendChild(dropdown);
			control = wrap;
			break;
		}
		case 'boolean': {
			const opts = q.options ?? ['是', '否'];
			const wrap = document.createElement('div');
			wrap.className = 'joinus-input-wrap joinus-select-custom';
			wrap.dataset.select = '';
			const hidden = document.createElement('input');
			hidden.type = 'hidden';
			hidden.name = q.id;
			if (required) hidden.required = true;
			const trigger = document.createElement('button');
			trigger.type = 'button';
			trigger.className = 'joinus-select-trigger';
			trigger.setAttribute('aria-expanded', 'false');
			trigger.setAttribute('aria-haspopup', 'listbox');
			trigger.innerHTML = `<i class="${icon} joinus-input-icon"></i>
				<span class="joinus-select-value placeholder">${ph || '请选择'}</span>
				<i class="ri-arrow-down-s-line joinus-select-arrow"></i>`;
			const dropdown = document.createElement('div');
			dropdown.className = 'joinus-select-dropdown';
			dropdown.setAttribute('role', 'listbox');
			opts.forEach((o, i) => {
				const div = document.createElement('div');
				div.className = 'joinus-select-option';
				div.setAttribute('data-value', String(i));
				div.setAttribute('role', 'option');
				div.textContent = o;
				dropdown.appendChild(div);
			});
			wrap.appendChild(hidden);
			wrap.appendChild(trigger);
			wrap.appendChild(dropdown);
			control = wrap;
			break;
		}
		case 'textarea': {
			const ta = document.createElement('textarea');
			ta.name = q.id;
			ta.placeholder = ph;
			ta.rows = q.rows ?? 5;
			if (required) ta.required = true;
			const syncFilled = () => field.classList.toggle('has-value', !!ta.value.trim());
			ta.addEventListener('input', syncFilled);
			ta.addEventListener('change', syncFilled);
			control = ta;
			break;
		}
		case 'file': {
			const wrap = document.createElement('div');
			wrap.className = 'joinus-file-wrap';
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = q.accept ?? '*';
			input.multiple = true;
			if (!input.id) input.id = `joinus-file-${q.id}`;
			const trigger = document.createElement('label');
			trigger.className = 'joinus-file-trigger';
			trigger.innerHTML = `<i class="${icon} joinus-file-icon"></i>
				<span class="joinus-file-text">${ph}</span>`;
			trigger.htmlFor = input.id;
			const list = document.createElement('div');
			list.className = 'joinus-file-list';
			wrap.appendChild(input);
			wrap.appendChild(trigger);
			wrap.appendChild(list);
			wrap.dataset.name = q.id;
			if (required) wrap.dataset.required = 'true';
			(wrap as unknown as FileWrapEl)._files = [];
			control = wrap;
			break;
		}
		default:
			control = document.createElement('div');
	}

	field.appendChild(control);
	return field;
}

function initSelect(wrap: HTMLElement): void {
	const trigger = wrap.querySelector('.joinus-select-trigger');
	const valueEl = wrap.querySelector('.joinus-select-value');
	const hidden = wrap.querySelector<HTMLInputElement>('input[type="hidden"]');
	const options = wrap.querySelectorAll('.joinus-select-option');
	const dropdown = wrap.querySelector('.joinus-select-dropdown');
	if (!trigger || !valueEl || !hidden || !dropdown) return;

	trigger.addEventListener('click', (e) => {
		e.preventDefault();
		wrap.classList.toggle('is-open');
	});

	options.forEach((opt) => {
		opt.addEventListener('click', () => {
			const v = opt.getAttribute('data-value') ?? '';
			const text = opt.textContent ?? '';
			hidden.value = text;
			valueEl.textContent = text;
			valueEl.classList.remove('placeholder');
			wrap.classList.add('has-value');
			wrap.classList.remove('is-open');
			hidden.dispatchEvent(new Event('change', { bubbles: true }));
		});
	});

	document.addEventListener('click', (e) => {
		if (!wrap.contains(e.target as Node)) {
			wrap.classList.remove('is-open');
			(trigger as HTMLElement).blur();
		}
	});
}

interface FileWrapEl extends HTMLElement {
	_files: File[];
	_urls?: Map<File, string>;
}

function getOrCreateUrl(wrap: FileWrapEl, file: File): string {
	if (!wrap._urls) wrap._urls = new Map();
	let u = wrap._urls.get(file);
	if (!u && file.type.startsWith('image/')) {
		u = URL.createObjectURL(file);
		wrap._urls.set(file, u);
	}
	return u ?? '';
}

function renderFileList(wrap: FileWrapEl): void {
	const list = wrap.querySelector('.joinus-file-list');
	const files = wrap._files;
	if (!list) return;

	list.innerHTML = '';
	files.forEach((file, i) => {
		const item = document.createElement('div');
		item.className = 'joinus-file-item';
		const url = getOrCreateUrl(wrap, file);
		if (url) {
			const img = document.createElement('div');
			img.className = 'joinus-file-preview';
			const imgEl = document.createElement('img');
			imgEl.src = url;
			imgEl.alt = file.name;
			img.appendChild(imgEl);
			item.appendChild(img);
		}
		const name = document.createElement('span');
		name.className = 'joinus-file-name';
		name.textContent = file.name;
		item.appendChild(name);
		const remove = document.createElement('button');
		remove.type = 'button';
		remove.className = 'joinus-file-remove';
		remove.setAttribute('aria-label', '删除');
		remove.innerHTML = '<i class="ri-close-line"></i>';
		remove.addEventListener('click', () => {
			const u = wrap._urls?.get(file);
			if (u) {
				URL.revokeObjectURL(u);
				wrap._urls?.delete(file);
			}
			files.splice(i, 1);
			renderFileList(wrap);
		});
		item.appendChild(remove);
		list.appendChild(item);
	});

	wrap.classList.toggle('has-value', files.length > 0);
}

function setFieldRequired(field: HTMLElement, questionId: string, required: boolean): void {
	const input = field.querySelector<HTMLInputElement>(`input[name="${questionId}"], textarea[name="${questionId}"]`);
	if (input) input.required = required;
	const hidden = field.querySelector<HTMLInputElement>(`input[type="hidden"][name="${questionId}"]`);
	if (hidden) hidden.required = required;
	const fileWrap = field.querySelector<HTMLElement>(`.joinus-file-wrap[data-name="${questionId}"]`);
	if (fileWrap) fileWrap.dataset.required = required ? 'true' : '';
}

function clearField(field: HTMLElement, q: Question): void {
	const name = q.id;
	const input = field.querySelector<HTMLInputElement>(`input[name="${name}"]:not([type="hidden"]):not([type="file"])`);
	if (input) input.value = '';
	const textarea = field.querySelector<HTMLTextAreaElement>(`textarea[name="${name}"]`);
	if (textarea) textarea.value = '';
	const hidden = field.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
	if (hidden) {
		hidden.value = '';
		const wrap = hidden.closest('.joinus-select-custom');
		if (wrap) {
			const valueEl = wrap.querySelector('.joinus-select-value');
			if (valueEl) {
				valueEl.textContent = q.placeholder || '请选择';
				valueEl.classList.add('placeholder');
			}
			wrap.classList.remove('has-value');
		}
	}
	const fileWrap = field.querySelector('.joinus-file-wrap[data-name="' + name + '"]') as unknown as FileWrapEl | null;
	if (fileWrap?._files) {
		fileWrap._urls?.forEach((u) => URL.revokeObjectURL(u));
		fileWrap._urls?.clear();
		fileWrap._files.length = 0;
		renderFileList(fileWrap);
	}
	field.classList.remove('has-value');
}

function initLogicConditions(form: HTMLFormElement, config: FormConfig): void {
	const fields = form.querySelectorAll<HTMLElement>('.joinus-field');
	config.questions.forEach((q, i) => {
		if (!q.showWhen) return;
		const field = fields[i];
		if (!field) return;
		const refId = q.showWhen.questionId;
		const values = Array.isArray(q.showWhen.value) ? q.showWhen.value : [q.showWhen.value];
		const getRefValue = (): string => {
			const el = form.querySelector(`[name="${refId}"]`);
			return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : '';
		};
		const show = (): void => {
			field.classList.remove('joinus-field-hidden');
			setFieldRequired(field, q.id, q.required ?? false);
		};
		const hide = (): void => {
			field.classList.add('joinus-field-hidden');
			setFieldRequired(field, q.id, false);
			clearField(field, q);
		};
		const updateVisibility = (): void => {
			if (values.includes(getRefValue())) show();
			else hide();
		};
		updateVisibility();
		const refEl = form.querySelector(`[name="${refId}"]`);
		if (refEl) {
			refEl.addEventListener('change', updateVisibility);
			refEl.addEventListener('input', updateVisibility);
		}
	});
}

function initFile(wrap: HTMLElement): void {
	const w = wrap as unknown as FileWrapEl;
	const input = wrap.querySelector<HTMLInputElement>('input[type="file"]');
	const files = w._files;
	if (!input || !files) return;

	const addFiles = (fileList: FileList | null) => {
		if (!fileList?.length) return;
		Array.from(fileList).forEach((f) => files.push(f));
		renderFileList(w);
		input.value = '';
	};

	input.addEventListener('change', () => addFiles(input.files));

	wrap.addEventListener('dragover', (e) => {
		e.preventDefault();
		e.stopPropagation();
		wrap.classList.add('joinus-file-dragover');
	});
	wrap.addEventListener('dragleave', (e) => {
		e.preventDefault();
		if (!wrap.contains(e.relatedTarget as Node)) wrap.classList.remove('joinus-file-dragover');
	});
	wrap.addEventListener('drop', (e) => {
		e.preventDefault();
		e.stopPropagation();
		wrap.classList.remove('joinus-file-dragover');
		addFiles(e.dataTransfer?.files ?? null);
	});
}

const SUBMIT_ERROR_FIELD: Record<string, string> = {
	INVALID_NAME: 'name',
	INVALID_CONTACT: 'contact',
	INVALID_QQ: 'qq',
	INVALID_DEPARTMENT: 'department',
	INVALID_OFFLINE_TIME: 'interview_time_offline',
	INVALID_ONLINE_TIME: 'interview_time_online',
};

export function renderForm(container: HTMLElement, config: FormConfig): void {
	const form = document.createElement('form');
	form.action = config.submit?.url ?? '#';
	form.method = 'POST';
	form.enctype = 'multipart/form-data';
	form.noValidate = true;
	form.onsubmit = (e) => e.preventDefault();

	for (const q of config.questions) {
		const field = createField({ ...defaultQuestion, ...q } as Question);
		form.appendChild(field);

		const selectWrap = field.querySelector<HTMLElement>('[data-select]');
		if (selectWrap) initSelect(selectWrap);

		const fileWrap = field.querySelector<HTMLElement>('.joinus-file-wrap');
		if (fileWrap) initFile(fileWrap);
	}

	initLogicConditions(form, config);

	const btn = document.createElement('button');
	btn.type = 'submit';
	btn.className = 'joinus-btn';
	btn.innerHTML = `<span>${config.submit?.label ?? '立即提交'}</span><i class="ri-arrow-right-line"></i>`;
	form.appendChild(btn);

	const successEl = document.createElement('div');
	successEl.className = 'joinus-success joinus-success-hidden';
	const s = config.submit ?? {};
	successEl.innerHTML = `
		<h2 class="joinus-success-title">${escapeHtml(s.successTitle ?? '真是个明智的选择！')}</h2>
		<p class="joinus-success-subtitle">${escapeHtml(s.successSubtitle ?? '期待我们的相遇')}</p>
		<p class="joinus-success-note">${escapeHtml(s.successNote ?? '注意查收短信，不要错过哦')}</p>
		<a href="${escapeHtml(s.successBackUrl ?? 'https://huaxiaoke.com')}" class="joinus-btn joinus-success-back">${escapeHtml(s.successBackLabel ?? '返回')}</a>
	`;

	function getSubmitUrl(): string | undefined {
		const base = config.submit?.url?.trim();
		if (!base || base === '#') return undefined;
		return base;
	}

	function buildFormData(): FormData {
		const data = new FormData();
		for (const el of Array.from(form.elements)) {
			if (el instanceof HTMLInputElement && el.type === 'file') continue;
			if (el instanceof HTMLInputElement && el.name && el.type !== 'hidden') {
				data.append(el.name, el.value);
			} else if (el instanceof HTMLInputElement && el.name && el.type === 'hidden') {
				data.append(el.name, el.value);
			} else if (el instanceof HTMLSelectElement && el.name) {
				data.append(el.name, el.value);
			} else if (el instanceof HTMLTextAreaElement && el.name) {
				data.append(el.name, el.value);
			}
		}
		Array.from(form.querySelectorAll('.joinus-file-wrap')).forEach((wrap) => {
			const w = wrap as unknown as FileWrapEl;
			const name = w.dataset.name;
			const files = w._files;
			if (name && files?.length) files.forEach((f) => data.append(name, f));
		});
		return data;
	}

	function showSuccess(): void {
		form.classList.add('joinus-form-submitting');
		const duration = 400;
		setTimeout(() => {
			form.style.display = 'none';
			successEl.classList.remove('joinus-success-hidden');
			requestAnimationFrame(() => successEl.classList.add('joinus-success-visible'));
		}, duration);
	}

	const FORM_OUTDATED_CODE = 'FORM_OUTDATED';

	type SubmitApiJson = {
		ok?: boolean;
		duplicate?: boolean;
		code?: string;
		message?: string;
	};

	function getModalRoot(): HTMLElement {
		return container.closest('.joinus-form-apply') ?? container.closest('.joinus-root') ?? document.body;
	}

	function clearFieldErrors(): void {
		form.querySelectorAll('.joinus-field-error').forEach((el) => {
			el.classList.remove('joinus-field-error', 'joinus-field-shake');
			el.querySelector('.joinus-field-error-msg')?.remove();
		});
		form.querySelector('.joinus-submit-banner')?.remove();
	}

	function focusFieldError(questionId: string, message: string): void {
		clearFieldErrors();
		const field = form.querySelector<HTMLElement>(`.joinus-field[data-question-id="${questionId}"]`);
		if (!field) return;

		field.classList.remove('joinus-field-hidden');
		field.classList.add('joinus-field-error');

		const msg = document.createElement('p');
		msg.className = 'joinus-field-error-msg';
		msg.setAttribute('role', 'alert');
		msg.textContent = message;
		field.appendChild(msg);

		field.scrollIntoView({ block: 'center', behavior: 'smooth' });

		requestAnimationFrame(() => {
			field.classList.add('joinus-field-shake');
			field.addEventListener('animationend', () => field.classList.remove('joinus-field-shake'), { once: true });
		});

		const focusable = field.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, button.joinus-select-trigger, .joinus-file-wrap');
		focusable?.focus({ preventScroll: true });
	}

	function openJoinusModal(html: string, bind: (overlay: HTMLElement, close: () => void) => void, portal = false): void {
		const overlay = document.createElement('div');
		overlay.className = 'joinus-modal-overlay' + (portal ? ' joinus-modal-overlay--portal joinus-form-apply' : '');
		overlay.setAttribute('role', 'dialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.innerHTML = html;
		const close = () => {
			overlay.classList.remove('joinus-modal-visible');
			if (portal) document.body.classList.remove('joinus-modal-open');
			setTimeout(() => overlay.remove(), 300);
		};
		bind(overlay, close);
		if (portal) {
			document.body.classList.add('joinus-modal-open');
			document.body.appendChild(overlay);
		} else {
			getModalRoot().appendChild(overlay);
		}
		requestAnimationFrame(() => overlay.classList.add('joinus-modal-visible'));
	}

	function showFormOutdatedModal(message: string): void {
		clearFieldErrors();
		openJoinusModal(
			`
			<div class="joinus-modal-card">
				<h2 class="joinus-modal-title">表单已更新</h2>
				<p class="joinus-modal-subtitle">${escapeHtml(message)}</p>
				<div class="joinus-modal-actions">
					<button type="button" class="joinus-btn joinus-modal-refresh">刷新页面</button>
				</div>
			</div>
		`,
			(overlay) => {
				overlay.querySelector('.joinus-modal-refresh')?.addEventListener('click', () => {
					location.reload();
				});
			},
			true
		);
	}

	function handleSubmitFailure(json: SubmitApiJson): void {
		const message = typeof json.message === 'string' && json.message.trim() ? json.message : '提交失败';

		if (json.code === FORM_OUTDATED_CODE) {
			showFormOutdatedModal(message);
			return;
		}

		const questionId = json.code ? SUBMIT_ERROR_FIELD[json.code] : undefined;
		if (questionId) {
			focusFieldError(questionId, message);
			return;
		}

		clearFieldErrors();
		const banner = document.createElement('p');
		banner.className = 'joinus-submit-banner';
		banner.setAttribute('role', 'alert');
		banner.textContent = message;
		form.insertBefore(banner, form.firstChild);
		banner.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}

	async function postJoinUsForm(data: FormData): Promise<'ok' | 'duplicate' | 'failed'> {
		const url = getSubmitUrl();
		if (!url) return 'ok';
		const r = await fetch(url, { method: 'POST', body: data });
		const json = (await r.json().catch(() => ({}))) as SubmitApiJson;
		if (r.status === 409 || r.headers.get('X-Duplicate') === 'true' || json.duplicate) {
			return 'duplicate';
		}
		if (!r.ok || !json.ok) {
			handleSubmitFailure(json);
			return 'failed';
		}
		return 'ok';
	}

	function showOverwriteModal(firstSubmitData: FormData): void {
		clearFieldErrors();
		openJoinusModal(
			`
			<div class="joinus-modal-card">
				<h2 class="joinus-modal-title">你已经提交过了</h2>
				<p class="joinus-modal-subtitle">是否覆盖之前的提交</p>
				<div class="joinus-modal-actions">
					<button type="button" class="joinus-btn joinus-btn-secondary joinus-modal-cancel">取消提交</button>
					<button type="button" class="joinus-btn joinus-modal-overwrite">确定覆盖</button>
				</div>
			</div>
		`,
			(overlay, close) => {
				overlay.querySelector('.joinus-modal-cancel')?.addEventListener('click', close);
				overlay.querySelector('.joinus-modal-overwrite')?.addEventListener('click', async () => {
					close();
					const data = new FormData();
					for (const [key, value] of firstSubmitData.entries()) {
						data.append(key, value);
					}
					data.append('overwrite', '1');
					try {
						const outcome = await postJoinUsForm(data);
						if (outcome === 'ok') showSuccess();
					} catch (e) {
						console.error('[JoinUs] overwrite error', e);
						handleSubmitFailure({
							message: e instanceof Error ? e.message : '提交失败',
						});
					}
				});
			},
			true
		);
	}

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const fileWraps = Array.from(form.querySelectorAll('.joinus-file-wrap[data-required="true"]')) as unknown as FileWrapEl[];
		for (const w of fileWraps) {
			if (!w._files?.length) {
				const name = w.dataset.name ?? 'portfolio';
				focusFieldError(name, '请上传必填的附件');
				return;
			}
		}
		const data = buildFormData();
		try {
			const outcome = await postJoinUsForm(data);
			if (outcome === 'duplicate') {
				showOverwriteModal(data);
				return;
			}
			if (outcome === 'failed') return;
		} catch (e) {
			console.error('[JoinUs] submit error', e);
			handleSubmitFailure({
				message: e instanceof Error ? e.message : '提交失败',
			});
			return;
		}
		showSuccess();
	});

	form.addEventListener('input', (e) => {
		const field = (e.target as HTMLElement).closest('.joinus-field.joinus-field-error');
		if (!field) return;
		field.classList.remove('joinus-field-error', 'joinus-field-shake');
		field.querySelector('.joinus-field-error-msg')?.remove();
	});

	container.appendChild(form);
	container.appendChild(successEl);
}

function escapeHtml(s: string): string {
	const div = document.createElement('div');
	div.textContent = s;
	return div.innerHTML;
}
