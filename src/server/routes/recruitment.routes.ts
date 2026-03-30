import Router from '@koa/router';
import { requireLogin, requireSuperAdmin } from '../middleware/requireRole';
import type { RecruitmentController } from '../controller/recruitment.controller';

export function buildRecruitmentRoutes(controller: RecruitmentController): Router {
	const router = new Router({ prefix: '/recruitment' });

	router.post('/applications', requireLogin, controller.submit);
	router.get('/applications', requireLogin, controller.listApplications);
	router.get('/applications/:id', requireLogin, controller.getApplication);
	router.delete('/applications/:id', requireSuperAdmin, controller.deleteApplication);

	router.get('/applications/:id/comments', requireLogin, controller.listComments);
	router.post('/applications/:id/comments', requireLogin, controller.createComment);

	router.patch('/comments/:commentId', requireLogin, controller.updateComment);
	router.delete('/comments/:commentId', requireLogin, controller.deleteComment);
	router.post('/comments/:commentId/like', requireLogin, controller.toggleLike);

	router.post('/applications/:id/tags', requireLogin, controller.addTag);
	router.delete('/applications/:id/tags', requireLogin, controller.removeTag);

	return router;
}