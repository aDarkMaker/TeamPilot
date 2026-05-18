import { StarRatingDisplay, StarRatingInput, formatRatingAverage } from './StarRating';

type Props = {
	ratingAverage: number | null;
	ratingCount: number;
	myRating: number | null;
	busy?: boolean;
	canRate: boolean;
	onRate: (rating: number) => void;
};

export function RatingSection({ ratingAverage, ratingCount, myRating, busy, canRate, onRate }: Props) {
	const hasAverage = ratingAverage != null && ratingCount > 0;

	return (
		<section className="nc-detail-section nc-rating-section">
			<h3 className="nc-section-title">评分</h3>
			<div className="nc-rating-card">
				<div className="nc-rating-row">
					<div className="nc-rating-block nc-rating-block--avg">
						<span className="nc-rating-avg-value">{formatRatingAverage(hasAverage ? ratingAverage : null)}</span>
						<StarRatingDisplay value={hasAverage ? ratingAverage : null} size="md" />
						<span className="nc-rating-count">{ratingCount > 0 ? `${ratingCount} 人评分` : '暂无评分'}</span>
					</div>

					{canRate ? (
						<>
							<span className="nc-rating-divider" aria-hidden />
							<div className="nc-rating-block nc-rating-block--mine">
								<span className="nc-rating-mine-label">我的评分</span>
								<StarRatingInput value={myRating} disabled={busy} onChange={onRate} size="md" />
							</div>
						</>
					) : null}
				</div>
			</div>
		</section>
	);
}
