/** Window-level client events used to invalidate cached state across components */
export const CLIENT_EVENTS = {
	scheduleUpdated: 'hxk:schedule-updated',
	applicationsUpdated: 'hxk:applications-updated',
	profileUpdated: 'hxk:profile-updated',
	sidebarToggle: 'hxk:sidebar-toggle',
	highlightUrlSync: 'hxk:highlight-url-sync',
} as const;

/** Partial profile patch broadcast after a successful settings save */
export type ProfileUpdatedDetail = {
	id?: string;
	username?: string;
	nickname?: string | null;
	signature?: string | null;
	qq?: string | null;
	avatarUrl?: string | null;
	profileBackgroundUrl?: string | null;
	role?: string;
};

declare global {
	interface WindowEventMap {
		'hxk:schedule-updated': CustomEvent<{ dayKey?: string }>;
		'hxk:applications-updated': CustomEvent<{ updatedAt: number }>;
		'hxk:profile-updated': CustomEvent<ProfileUpdatedDetail>;
	}
}

export function broadcastScheduleUpdated(dayKey?: string) {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(CLIENT_EVENTS.scheduleUpdated, { detail: { dayKey } }));
}

export function broadcastApplicationsUpdated() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(CLIENT_EVENTS.applicationsUpdated, { detail: { updatedAt: Date.now() } }));
}

/** Listeners merge the patch into their local copy of the current user */
export function broadcastProfileUpdated(detail: ProfileUpdatedDetail) {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(CLIENT_EVENTS.profileUpdated, { detail }));
}
