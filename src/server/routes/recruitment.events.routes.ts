import Router from '@koa/router';
import { requireAdminOrAbove } from '../middleware/requireRole';
import { onRecruitmentEvent } from '../recruitment/recruitmentEvents';

export function buildRecruitmentEventsRoutes(): Router {
	const router = new Router({ prefix: '/recruitment' });

	router.get('/events', requireAdminOrAbove, async (ctx) => {
		ctx.req.setTimeout(0);
		ctx.set('Content-Type', 'text/event-stream; charset=utf-8');
		ctx.set('Cache-Control', 'no-store, max-age=0');
		ctx.set('Connection', 'keep-alive');
		ctx.set('X-Accel-Buffering', 'no');

		const enc = new TextEncoder();
		let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
		let cleanupDone = false;
		const cleanup = () => {
			if (cleanupDone) return;
			cleanupDone = true;
			clearInterval(ping);
			off();
			if (controller) {
				try {
					controller.close();
				} catch {
					// ignore stream shutdown error
				}
			}
		};
		const send = (chunk: string) => {
			if (!cleanupDone && controller) controller.enqueue(enc.encode(chunk));
		};

		const stream = new ReadableStream<Uint8Array>({
			start(c) {
				controller = c;
			},
			cancel() {
				cleanup();
			},
		});

		const off = onRecruitmentEvent((ev) => {
			send(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`);
		});

		const ping = setInterval(() => {
			send(`event: ping\ndata: ${Date.now()}\n\n`);
		}, 25000);

		ctx.req.on('close', cleanup);

		send(`event: hello\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);
		ctx.body = stream;
	});

	return router;
}
