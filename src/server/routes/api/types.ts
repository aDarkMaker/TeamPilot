import type { ApplicationController } from '../../controller/application.controller';
import type { AdminController } from '../../controller/admin.controller';
import type { AuthController } from '../../controller/auth.controller';
import type { ProfileController } from '../../controller/profile.controller';
import type { ScheduleController } from '../../controller/schedule.controller';
import type { RecruitmentController } from '../../controller/recruitment.controller';
import type { JoinusSubmitController } from '../../controller/joinusSubmit.controller';
import type { HomeController } from '../../controller/home.controller';

export interface ApiRouteDeps {
	authController: AuthController;
	applicationController: ApplicationController;
	adminController: AdminController;
	profileController: ProfileController;
	scheduleController: ScheduleController;
	recruitmentController: RecruitmentController;
	joinusSubmitController: JoinusSubmitController;
	homeController: HomeController;
}
