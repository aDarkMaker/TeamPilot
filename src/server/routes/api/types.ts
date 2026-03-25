import type { ApplicationController } from '../../controller/application.controller';
import type { AdminController } from '../../controller/admin.controller';
import type { AuthController } from '../../controller/auth.controller';

export interface ApiRouteDeps {
	authController: AuthController;
	applicationController: ApplicationController;
	adminController: AdminController;
}
