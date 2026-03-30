export const JOINUS_PUBLIC_USERNAME = 'joinus-public' as const;

export function isJoinUsPublicUsername(username: string): boolean {
	return username === JOINUS_PUBLIC_USERNAME;
}
