import Router from "@koa/router";
import { requireLogin } from "../middleware/requireRole";
import type { TaskController } from "../controller/task.controller";

export function buildTaskRoutes(controller: TaskController): Router {
    const router = new Router({ prefix: '/tasks' });

    router.get('/', requireLogin, controller.listMyTasks);
    router.get('/pending-count', requireLogin, controller.countMyPending);
    router.post('/:id/decide', requireLogin, controller.decideMyTask);

    return router;
}