import type { Context } from 'koa';

import { onRecruitmentEvent } from '../recruitment/recruitmentEvents';

const PING_INTERVAL_MS = 25000;

export class RecruitmentEventsController {
	/** Server-sent events feed that tells admins when the application list changed */
	stream = async (ctx: Context) => {
		ctx.req.setTimeout(0);
		ctx.set('Content-Type', 'text/event-stream; charset=utf-8');
		ctx.set('Cache-Control', 'no-store, max-age=0');
		ctx.set('Connection', 'keep-alive');
		ctx.set('X-Accel-Buffering', 'no');

		const encoder = new TextEncoder();
		let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
		let closed = false;

		const cleanup = () => {
			if (closed) return;
			closed = true;
			clearInterval(ping);
			off();
			try {
				streamController?.close();
			} catch {
				// ignore stream shutdown error
			}
		};

		const send = (chunk: string) => {
			if (!closed && streamController) streamController.enqueue(encoder.encode(chunk));
		};

		const stream = new ReadableStream<Uint8Array>({
			start(c) {
				streamController = c;
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
		}, PING_INTERVAL_MS);

		ctx.req.on('close', cleanup);

		send(`event: hello\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);
		ctx.body = stream;
	};
}
