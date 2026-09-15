/** Public QQ avatar endpoint; it 400s on an empty number, so callers must check the QQ first. */
export function getQqAvatarUrl(qq: string): string {
	return `https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=100`;
}
