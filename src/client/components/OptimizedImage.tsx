import type { ImgHTMLAttributes } from 'react';

type OptimizedImageProps = ImgHTMLAttributes<HTMLImageElement> & {
	critical?: boolean;
	intrinsic?: boolean;
};

type FetchPriority = 'high' | 'low' | 'auto';

export default function OptimizedImage({ critical, intrinsic, ...props }: OptimizedImageProps) {
	const attrs: ImgHTMLAttributes<HTMLImageElement> = { ...props };

	const inherited = (attrs as { fetchPriority?: FetchPriority }).fetchPriority;
	delete (attrs as { fetchPriority?: unknown }).fetchPriority;

	const fetchpriority: FetchPriority | undefined = critical ? 'high' : inherited;

	if (critical) {
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

	return <img {...attrs} {...(fetchpriority ? ({ fetchpriority } as ImgHTMLAttributes<HTMLImageElement>) : {})} />;
}
