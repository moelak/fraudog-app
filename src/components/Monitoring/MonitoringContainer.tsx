import { observer } from 'mobx-react-lite';
import Monitoring from './Monitoring';
import OrganizationEventLog from './OrganizationEventLog';

const MonitoringContainer = observer(() => {
	return (
		<div className='space-y-8'>
			<div>
				<h1 className='text-3xl font-bold text-gray-900'>Monitoring</h1>
				<p className='mt-2 text-gray-600'>Real-time monitoring of transactions and organization activity</p>
			</div>
			<Monitoring />

			{/* ✅ Organization Notifications */}
			<section className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300'>
				<OrganizationEventLog />
			</section>
		</div>
	);
});

export default MonitoringContainer;
