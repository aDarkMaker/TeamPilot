export const INTERVIEW_SLOT_MINUTES = 15;

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

export function minutesToLabel(minutes: number): string {
	return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

export function formatSlotLabel(date: string, startMin: number, endMin: number): string {
	const parts = date.split('-');
	const month = Number(parts[1]);
	const day = Number(parts[2]);
	return `${month}月${day}日 ${minutesToLabel(startMin)}-${minutesToLabel(endMin)}`;
}

export function expandWindowToSlots(startMin: number, endMin: number): number[] {
	const out: number[] = [];
	for (let m = startMin; m < endMin; m += INTERVIEW_SLOT_MINUTES) {
		out.push(m);
	}
	return out;
}

export function getShanghaiNow(): { date: string; minutes: number } {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(new Date());
	const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
	const date = `${get('year')}-${get('month')}-${get('day')}`;
	let hour = Number(get('hour'));
	if (hour === 24) hour = 0;
	return { date, minutes: hour * 60 + Number(get('minute')) };
}
