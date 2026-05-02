import type { ImgHTMLAttributes } from 'react';

type OptimizedImageProps = ImgHTMLAttributes<HTMLImageElement> & {
	critical?: boolean;
	intrinsic?: boolean;
};

export default function OptimizedImage({ critical, intrinsic, ...props }: OptimizedImageProps) {
	const attrs: ImgHTMLAttributes<HTMLImageElement> = { ...props };

	if (critical) {
		attrs.fetchPriority = 'high';
		attrs.loading = 'eager';
	} else if (!attrs.loading) {
		attrs.loading = 'lazy';
	}

	if (!attrs.decoding) {
		attrs.decoding = critical ? 'sync' : 'async';
	}

	if (intrinsic && attrs.width && attrs.height) {
		attrs.style = {
			width: '100%',
			height: 'auto',
			aspectRatio: `${attrs.width} / ${attrs.height}`,
			...attrs.style,
		};
	}

	return <img {...attrs} />;
}
