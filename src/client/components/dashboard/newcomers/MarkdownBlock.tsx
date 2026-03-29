import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
	children: string;
	className?: string;
};

export function MarkdownBlock({ children, className = '' }: Props) {
	return (
		<div className={`nc-prose ${className}`.trim()}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
		</div>
	);
}
