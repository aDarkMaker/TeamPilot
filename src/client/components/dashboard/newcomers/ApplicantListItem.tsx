import { StarRatingDisplay, formatRatingAverage } from './StarRating';
import { useSearchHighlight } from '@/lib/useSearchHighlight';
import type { NewcomerApplicationView } from '@/lib/recruitment/types';

type Props = {
	application: NewcomerApplicationView;
	active: boolean;
	onSelect: (id: string) => void;
};

export function ApplicantListItem({ application, active, onSelect }: Props) {
	const { highlightText } = useSearchHighlight();

	return (
		<li>
			<button type="button" className={`nc-list-item ${active ? 'is-active' : ''}`} onClick={() => onSelect(application.id)}>
				<span className="nc-list-item-name">{highlightText(application.fullName) as React.ReactNode}</span>
				{application.ratingCount > 0 ? (
					<span className="nc-list-item-rating">
						<StarRatingDisplay value={application.ratingAverage} size="sm" />
						<span className="nc-list-item-rating-value">{formatRatingAverage(application.ratingAverage)}</span>
					</span>
				) : null}
				<span className="nc-list-item-meta">{application.attachments.length} 个附件</span>
			</button>
		</li>
	);
}
