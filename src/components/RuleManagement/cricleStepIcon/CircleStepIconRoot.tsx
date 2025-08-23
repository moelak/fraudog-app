import { styled } from '@mui/material/styles';

import type { StepIconProps } from '@mui/material';

// circle style
const CircleStepIconRoot = styled('div')<{
	ownerState: { active?: boolean; completed?: boolean; disabled?: boolean };
}>(({ ownerState }) => ({
	background: ownerState.disabled ? '#999' : ownerState.active || ownerState.completed ? 'green' : '#ccc',
	color: '#fff',
	width: 40,
	height: 40,
	borderRadius: '50%',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	boxShadow: ownerState.active ? '0 4px 10px rgba(0,0,0,0.25)' : 'none',
	transition: 'all 0.3s ease',
	fontSize: 20,
}));

// icons map

// extend props to include disabled
interface CircleStepIconProps extends StepIconProps {
	disabled?: boolean;
	icons: Record<string, React.ReactNode>;
}

export default function CircleStepIcon(props: CircleStepIconProps) {
	const { active, completed, icon, disabled, icons } = props;
	return <CircleStepIconRoot ownerState={{ active, completed, disabled }}>{icons[String(icon)]}</CircleStepIconRoot>;
}
