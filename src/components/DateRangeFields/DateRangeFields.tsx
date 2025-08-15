// components/DateRangeFields/DateRangeFields.tsx
import * as React from 'react';
import type { Dayjs } from 'dayjs';
import { Box, TextField } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

type Props = {
	value: { from: Dayjs | null; to: Dayjs | null };
	onChange: (range: { from: Dayjs | null; to: Dayjs | null }) => void;
	disableFuture?: boolean;
};

export default function DateRangeFields({ value, onChange, disableFuture = false }: Props) {
	const { from, to } = value;

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs}>
			<Box display='grid' gridTemplateColumns='1fr 1fr' gap={2}>
				<DatePicker
					label='From'
					value={from}
					onChange={(newFrom) => {
						if (!newFrom) return onChange({ from: null, to });
						// enforce From ≤ To
						if (to && newFrom.isAfter(to)) {
							onChange({ from: newFrom, to: newFrom });
						} else {
							onChange({ from: newFrom, to });
						}
					}}
					maxDate={to ?? undefined}
					disableFuture={disableFuture}
					slotProps={{
						textField: {
							size: 'small',
							fullWidth: true,
							error: Boolean(from && to && from.isAfter(to)),
							helperText: from && to && from.isAfter(to) ? '"From" must be ≤ "To"' : '',
						} as Partial<React.ComponentProps<typeof TextField>>,
					}}
				/>

				<DatePicker
					label='To'
					value={to}
					onChange={(newTo) => {
						if (!newTo) return onChange({ from, to: null });
						// enforce To ≥ From
						if (from && newTo.isBefore(from)) {
							onChange({ from: newTo, to: newTo });
						} else {
							onChange({ from, to: newTo });
						}
					}}
					minDate={from ?? undefined}
					disableFuture={disableFuture}
					slotProps={{
						textField: {
							size: 'small',
							fullWidth: true,
							error: Boolean(from && to && from.isAfter(to)),
							helperText: from && to && from.isAfter(to) ? '"To" must be ≥ "From"' : '',
						} as Partial<React.ComponentProps<typeof TextField>>,
					}}
				/>
			</Box>
		</LocalizationProvider>
	);
}
