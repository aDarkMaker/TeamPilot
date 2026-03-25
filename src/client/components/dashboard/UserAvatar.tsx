type Props = {
	username: string;
	avatarUrl: string | null;
	size?: number;
};

export default function UserAvatar({ username, avatarUrl, size = 40 }: Props) {
	const dim = Math.max(16, size);

	const avatarBaseStyle: React.CSSProperties = {
		width: dim,
		height: dim,
		borderRadius: '50%',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontWeight: 800,
		fontSize: Math.max(12, Math.round(dim * 0.42)),
		color: '#fff',
		border: '2px solid rgba(255, 255, 255, 0.8)',
		userSelect: 'none',
		flexShrink: 0,
	};

	if (avatarUrl) {
		return (
			<img
				className="avatar-img"
				src={avatarUrl}
				alt=""
				width={dim}
				height={dim}
				style={{
					width: dim,
					height: dim,
					borderRadius: '50%',
					objectFit: 'cover',
					border: avatarBaseStyle.border,
					flexShrink: 0,
				}}
				loading="lazy"
			/>
		);
	}

	const raw = (username || '?').trim();
	const letter = raw ? raw[0]!.toUpperCase() : '?';

	return (
		<div
			className="avatar-letter"
			style={{
				...avatarBaseStyle,
				background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			}}
		>
			{letter}
		</div>
	);
}