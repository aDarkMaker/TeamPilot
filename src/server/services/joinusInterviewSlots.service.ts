import { z } from 'zod';
import type { DB } from '../db';
import { AppError } from '../types/api';
import { INTERVIEW_SLOT_MINUTES, getShanghaiNow } from '../../joinus/interviewSchedule';
import { rethrowMapped } from '../lib/errorMap';

const windowBodySchema = z
	.object({
		date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式不对'),
		startMin: z.number().int().min(0).max(1439),
		endMin: z.number().int().min(1).max(1440),
	})
	.refine((v) => v.startMin < v.endMin, { message: '结束时间需晚于开始时间' })
	.refine((v) => (v.endMin - v.startMin) % INTERVIEW_SLOT_MINUTES === 0, { message: '时长必须是 15 分钟的整数倍' });

export type InterviewWindowWithCounts = {
	id: string;
	date: string;
	startMin: number;
	endMin: number;
	booked: number;
	total: number;
};

export type PublicTimeslot = {
	id: string;
	date: string;
	startMin: number;
	endMin: number;
	booked: boolean;
};

export class JoinusInterviewSlotsService {
	constructor(private db: DB) {}

	async listPublic(): Promise<PublicTimeslot[]> {
		const now = getShanghaiNow();
		const rows = await this.db.listInterviewSlotsWithBooked();
		return rows
			.filter((s) => s.date > now.date || (s.date === now.date && s.startMin > now.minutes))
			.map(({ id, date, startMin, endMin, booked }) => ({ id, date, startMin, endMin, booked }));
	}

	async listWindows(): Promise<InterviewWindowWithCounts[]> {
		const [windows, slots] = await Promise.all([this.db.listInterviewWindows(), this.db.listInterviewSlotsWithBooked()]);
		const stats = new Map<string, { total: number; booked: number }>();
		for (const s of slots) {
			const cur = stats.get(s.windowId) ?? { total: 0, booked: 0 };
			cur.total += 1;
			if (s.booked) cur.booked += 1;
			stats.set(s.windowId, cur);
		}
		return windows.map((w) => ({
			id: w.id,
			date: w.date,
			startMin: w.startMin,
			endMin: w.endMin,
			booked: stats.get(w.id)?.booked ?? 0,
			total: stats.get(w.id)?.total ?? 0,
		}));
	}

	async create(body: unknown) {
		const parsed = windowBodySchema.safeParse(body);
		if (!parsed.success) {
			const first = parsed.error.issues[0]?.message ?? '参数不对';
			throw new AppError(400, 'INVALID_WINDOW', first);
		}
		try {
			const window = await this.db.createInterviewWindowWithSlots(parsed.data);
			return window;
		} catch (e) {
			rethrowMapped(e, {
				WINDOW_CONFLICT: { status: 409, code: 'WINDOW_CONFLICT', message: '该时间段与已有排期重叠，请调整后重试' },
			});
		}
	}

	async remove(windowIdRaw: unknown) {
		const windowId = String(windowIdRaw ?? '').trim();
		if (!windowId) throw new AppError(404, 'WINDOW_NOT_FOUND', '找不到该时间段');
		try {
			await this.db.deleteInterviewWindow(windowId);
		} catch (e) {
			rethrowMapped(e, {
				WINDOW_HAS_BOOKINGS: { status: 409, code: 'WINDOW_HAS_BOOKINGS', message: '已有报名预约了该时间段，暂时无法删除' },
				WINDOW_NOT_FOUND: { status: 404, code: 'WINDOW_NOT_FOUND', message: '找不到该时间段' },
			});
		}
		return { id: windowId };
	}
}
