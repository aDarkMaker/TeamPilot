import { DepartmentSelect } from './DepartmentSelect';
import type { RecruitmentDepartmentSlug } from '@/lib/recruitment/types';

type Props = {
	deptFilter: RecruitmentDepartmentSlug | 'all';
	onDeptFilterChange: (value: RecruitmentDepartmentSlug | 'all') => void;
	nameQuery: string;
	onNameQueryChange: (value: string) => void;
	attachOnly: boolean;
	onAttachOnlyChange: (value: boolean) => void;
};

/** Department / name / attachment filters above the applicant list */
export function FilterToolbar({ deptFilter, onDeptFilterChange, nameQuery, onNameQueryChange, attachOnly, onAttachOnlyChange }: Props) {
	return (
		<div className="nc-list-tools">
			<div className="nc-filter-row">
				<DepartmentSelect value={deptFilter} onChange={onDeptFilterChange} />
				<div className="nc-coolfield">
					<label className="nc-coolfield-label" htmlFor="nc-name-search">
						姓名
					</label>
					<input
						id="nc-name-search"
						type="search"
						className="nc-coolfield-control nc-coolfield-input"
						value={nameQuery}
						onChange={(e) => onNameQueryChange(e.target.value)}
						placeholder="搜索姓名"
					/>
				</div>
			</div>
			<div className="nc-attach-check">
				<input
					type="checkbox"
					id="nc-attach-only"
					className="nc-attach-check-input"
					checked={attachOnly}
					onChange={(e) => onAttachOnlyChange(e.target.checked)}
				/>
				<label className="nc-attach-check-label" htmlFor="nc-attach-only">
					<svg className="nc-attach-check-svg" viewBox="0 0 95 95" focusable="false" aria-hidden>
						<rect className="nc-attach-check-box" x={30} y={20} width={50} height={50} fill="none" />
						<g transform="translate(0,-952.36222)">
							<path
								className="nc-attach-check-path"
								d="m 56,963 c -102,122 6,9 7,9 17,-5 -66,69 -38,52 122,-77 -7,14 18,4 29,-11 45,-43 23,-4"
								fill="none"
							/>
						</g>
					</svg>
					<span>仅看有附件</span>
				</label>
			</div>
		</div>
	);
}
