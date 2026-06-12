import { EventEmitter } from 'node:events';

type RecruitmentEvent = {
	type: 'applications_updated';
	updatedAt: number;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export function onRecruitmentEvent(listener: (ev: RecruitmentEvent) => void): () => void {
	emitter.on('event', listener);
	return () => emitter.off('event', listener);
}

export function broadcastRecruitmentApplicationsUpdated(): void {
	const ev: RecruitmentEvent = { type: 'applications_updated', updatedAt: Date.now() };
	emitter.emit('event', ev);
}
