import type { ApplicationController } from '../../controller/application.controller';
import type { AdminController } from '../../controller/admin.controller';
import type { AuthController } from '../../controller/auth.controller';
import type { ProfileController } from '../../controller/profile.controller';
import type { ScheduleController } from '../../controller/schedule.controller';

export interface ApiRouteDeps {
	authController: AuthController;
	applicationController: ApplicationController;
	adminController: AdminController;
	profileController: ProfileController;
	scheduleController: ScheduleController;
}
