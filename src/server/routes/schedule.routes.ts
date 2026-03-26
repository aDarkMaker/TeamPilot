import Router from '@koa/router';
import { requireLogin } from '../middleware/requireRole';
import type { ScheduleController } from '../controller/schedule.controller';

export function buildScheduleRoutes(controller: ScheduleController): Router {
    const router = new Router({ prefix: '/schedule' });

    router.post('/', requireLogin, controller.create);
	router.patch('/:id', requireLogin, controller.update);
	router.delete('/:id', requireLogin, controller.cancel);
    router.get('/day', requireLogin, controller.listByDay);
	router.get('/week', requireLogin, controller.listByWeek);
    router.get('/users/search', requireLogin, controller.searchUsers);
    
    return router;
}