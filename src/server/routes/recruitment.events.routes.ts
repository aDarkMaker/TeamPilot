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

		const res = ctx.res;
		res.write(`event: hello\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);

		const off = onRecruitmentEvent((ev) => {
			res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`);
		});

		const ping = setInterval(() => {
			res.write(`event: ping\ndata: ${Date.now()}\n\n`);
		}, 25000);

		ctx.req.on('close', () => {
			clearInterval(ping);
			off();
		});

		ctx.respond = false;
	});

	return router;
}

