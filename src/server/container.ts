import type { Database } from 'bun:sqlite';

import { config } from './config';
import { createCache, createDb, type Cache, type DB } from './db';
import { AdminController } from './controller/admin.controller';
import { ApplicationController } from './controller/application.controller';
import { AuthController } from './controller/auth.controller';
import { BilibiliController } from './controller/bilibili.controller';
import { HealthController } from './controller/health.controller';
import { HomeController } from './controller/home.controller';
import { JoinusFormController } from './controller/joinusForm.controller';
import { JoinusInterviewSlotsController } from './controller/joinusInterviewSlots.controller';
import { JoinusSubmitController } from './controller/joinusSubmit.controller';
import { ProfileController } from './controller/profile.controller';
import { RecruitmentController } from './controller/recruitment.controller';
import { RecruitmentEventsController } from './controller/recruitmentEvents.controller';
import { ScheduleController } from './controller/schedule.controller';
import { SearchController } from './controller/search.controller';
import { TaskController } from './controller/task.controller';
import { AdminService } from './services/admin.service';
import { AnnouncementService } from './services/announcement.service';
import { ApplicationService } from './services/application.service';
import { AuthService } from './services/auth.service';
import { BiliDynamicService } from './services/biliDynamic.service';
import { BiliImageProxyService } from './services/biliImageProxy.service';
import { BilibiliService } from './services/bilibili.service';
import { BirthdayService } from './services/birthday.service';
import { HealthService } from './services/health.service';
import { JoinUsFormService } from './services/joinusForm.service';
import { JoinusInterviewSlotsService } from './services/joinusInterviewSlots.service';
import { JoinUsSubmitService } from './services/joinusSubmit.service';
import { ProfileService } from './services/profile.service';
import { RecruitmentService } from './services/recruitment.service';
import { RecruitmentCommentService } from './services/recruitmentComment.service';
import { RecruitmentRatingService } from './services/recruitmentRating.service';
import { RecruitmentTagService } from './services/recruitmentTag.service';
import { ScheduleService } from './services/schedule.service';
import { SearchService } from './services/search.service';
import { TaskService } from './services/task.service';

/** Everything the routes need, plus the shared resources the app keeps alive */
export type Container = {
	db: DB;
	cache: Cache;
	services: ReturnType<typeof createServices>;
	controllers: ReturnType<typeof createControllers>;
};

export function createServices(db: DB, cache: Cache) {
	const bilibili = new BilibiliService(db, config);
	return {
		admin: new AdminService(db),
		application: new ApplicationService(db),
		auth: new AuthService(db),
		bilibili,
		health: new HealthService(),
		announcement: new AnnouncementService(db),
		birthday: new BirthdayService(db),
		biliDynamic: new BiliDynamicService(cache, config, bilibili),
		biliImage: new BiliImageProxyService(),
		joinusForm: new JoinUsFormService(),
		joinusInterviewSlots: new JoinusInterviewSlotsService(db),
		joinusSubmit: new JoinUsSubmitService(db),
		profile: new ProfileService(db),
		recruitment: new RecruitmentService(db),
		recruitmentComment: new RecruitmentCommentService(db),
		recruitmentTag: new RecruitmentTagService(db),
		recruitmentRating: new RecruitmentRatingService(db),
		schedule: new ScheduleService(db),
		search: new SearchService(db),
		task: new TaskService(db),
	};
}

export function createControllers(services: ReturnType<typeof createServices>) {
	return {
		adminController: new AdminController(services.admin),
		applicationController: new ApplicationController(services.application),
		authController: new AuthController(services.auth),
		bilibiliController: new BilibiliController(services.bilibili),
		healthController: new HealthController(services.health),
		homeController: new HomeController({
			announcement: services.announcement,
			birthday: services.birthday,
			biliDynamic: services.biliDynamic,
			biliImage: services.biliImage,
		}),
		joinusFormController: new JoinusFormController(services.joinusForm),
		joinusInterviewSlotsController: new JoinusInterviewSlotsController(services.joinusInterviewSlots),
		joinusSubmitController: new JoinusSubmitController(services.joinusSubmit),
		profileController: new ProfileController(services.profile),
		recruitmentEventsController: new RecruitmentEventsController(),
		recruitmentController: new RecruitmentController({
			application: services.recruitment,
			comment: services.recruitmentComment,
			tag: services.recruitmentTag,
			rating: services.recruitmentRating,
		}),
		scheduleController: new ScheduleController(services.schedule),
		searchController: new SearchController(services.search),
		taskController: new TaskController(services.task),
	};
}

export function createContainer(sqlite: Database, redis: Parameters<typeof createCache>[0]): Container {
	const db = createDb(sqlite);
	const cache = createCache(redis);
	const services = createServices(db, cache);
	return { db, cache, services, controllers: createControllers(services) };
}
