import Router from '@koa/router';
import { requireLogin } from '../middleware/requireRole';
import type { BilibiliController } from '../controller/bilibili.controller';

export function buildBilibiliRoutes(controller: BilibiliController): Router {
	const router = new Router({ prefix: '/bilibili' });

	router.get('/qrcode', requireLogin, controller.generateQrcode);
	router.get('/qrcode/status', requireLogin, controller.pollQrcode);
	router.post('/bind', requireLogin, controller.bind);
	router.get('/status', requireLogin, controller.getStatus);
	router.get('/me', requireLogin, controller.getUserInfo);

	return router;
}
