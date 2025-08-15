// components/RuleManagement/RuleManagementContainer.tsx
import { useRules } from '../../hooks/useRules';
import RuleManagement from './RuleManagement';

export default function RuleManagementContainer() {
	const { searchByDateRange } = useRules(); // safe: not inside observer
	return <RuleManagement onSearchByDateRange={searchByDateRange} />;
}
