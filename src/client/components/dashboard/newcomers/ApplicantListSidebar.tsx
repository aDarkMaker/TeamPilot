import { ApplicantListItem } from './ApplicantListItem';
import { FilterToolbar } from './FilterToolbar';
import type { NewcomerApplicationView, RecruitmentDepartmentSlug } from '@/lib/recruitment/types';

type Props = {
	applications: NewcomerApplicationView[];
	selectedId: string;
	emptyHint: string;
	deptFilter: RecruitmentDepartmentSlug | 'all';
	onDeptFilterChange: (value: RecruitmentDepartmentSlug | 'all') => void;
	nameQuery: string;
	onNameQueryChange: (value: string) => void;
	attachOnly: boolean;
	onAttachOnlyChange: (value: boolean) => void;
	onSelect: (id: string) => void;
};

/** Left rail: filter toolbar plus the filtered applicant list */
export function ApplicantListSidebar({
	applications,
	selectedId,
	emptyHint,
	deptFilter,
	onDeptFilterChange,
	nameQuery,
	onNameQueryChange,
	attachOnly,
	onAttachOnlyChange,
	onSelect,
}: Props) {
	return (
		<aside className="nc-list" aria-label="按组别筛选">
			<div className="nc-list-head">
				<span className="nc-list-title">报名列表</span>
				<span className="nc-list-count">{applications.length}</span>
			</div>
			<FilterToolbar
				deptFilter={deptFilter}
				onDeptFilterChange={onDeptFilterChange}
				nameQuery={nameQuery}
				onNameQueryChange={onNameQueryChange}
				attachOnly={attachOnly}
				onAttachOnlyChange={onAttachOnlyChange}
			/>
			<ul className="nc-list-items">
				{applications.length === 0 ? <li className="nc-list-empty">{emptyHint}</li> : null}
				{applications.map((app) => (
					<ApplicantListItem key={app.id} application={app} active={app.id === selectedId} onSelect={onSelect} />
				))}
			</ul>
		</aside>
	);
}
