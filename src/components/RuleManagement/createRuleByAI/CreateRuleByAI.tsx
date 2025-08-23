import { useEffect, useState } from 'react';
import { Stepper, Step, StepLabel, Button, Typography, TextField, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { ruleManagementStore } from '.././RuleManagementStore';
import CircleStepIcon from '../cricleStepIcon/CircleStepIconRoot';

import { Storage as StorageIcon, Search as SearchIcon, AutoFixHigh as AutoFixHighIcon, FactCheck as FactCheckIcon } from '@mui/icons-material';

import { runInAction } from 'mobx';
import { validateRuleCondition } from '../../../utils/sqlValidator';

const steps = ['Select data', 'Token analysis', 'Output rules generated for selection', 'Review'];

interface FormData {
	name: string;
	condition: string;
}

interface FormErrors {
	name?: string;
	condition?: string;
}

export default function CreateRuleByAI() {
	const [activeStep, setActiveStep] = useState(0);
	const [formData, setFormData] = useState({
		name: '',

		condition: '',
	});

	const [errors, setErrors] = useState<FormErrors>({});
	const [openExitConfirm, setOpenExitConfirm] = useState(false); // 👈 modal state
	const [completed, setCompleted] = useState<{ [k: number]: boolean }>({});
	const isEditing = !!ruleManagementStore.editingRule;
	// check if form has any filled values
	// const isFormDirty = Object.values(formData).some((v) => v && v !== 'active' && v !== false);
	const icons: { [index: string]: React.ReactElement } = {
		1: <StorageIcon />,
		2: <SearchIcon />,
		3: <AutoFixHighIcon />,
		4: <FactCheckIcon />,
	};

	const [initialData, setInitialData] = useState(formData);

	useEffect(() => {
		if (isEditing && ruleManagementStore.editingRule) {
			const r = ruleManagementStore.editingRule;
			const data = {
				name: r.name || '',
				condition: r.condition || '',
			};
			setFormData(data);
			setInitialData(data); // snapshot original
		} else {
			const blank = {
				name: '',
				condition: '',
			};
			setFormData(blank);
			setInitialData(blank);
		}
	}, [isEditing, ruleManagementStore.editingRule]);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
			if (hasChanges) {
				e.preventDefault();
				e.returnValue = ''; // Required for Chrome
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [formData, initialData]);

	const resetForm = () => {
		setFormData({
			name: '',
			condition: '',
		});
		setErrors({});
		setActiveStep(0);
		setCompleted({});
		// Clear editing state so useEffect doesn’t repopulate
		runInAction(() => {
			ruleManagementStore.editingRule = null;
			ruleManagementStore.isEditingFromGenerated = false;
		});
	};
	const handleExitClick = () => {
		const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
		if (hasChanges) {
			setOpenExitConfirm(true); // show confirmation
		} else {
			ruleManagementStore.setDisplayManualRuleStepper(false);
			ruleManagementStore.setDisplayAIRuleStepper(false);
			resetForm();
		}
	};

	const confirmExit = () => {
		setOpenExitConfirm(false);
		ruleManagementStore.setDisplayManualRuleStepper(false);
		resetForm();
	};

	const cancelExit = () => {
		setOpenExitConfirm(false);
	};

	const handleNext = () => {
		if (activeStep === 0) {
			const errs: Record<string, string> = {};
			if (!formData.name) errs.name = 'Rule name is required';

			setErrors(errs);
			if (Object.keys(errs).length) return;
		}

		if (activeStep === 1) {
			const errs: Record<string, string> = {};

			if (!formData.condition) {
				errs.condition = 'Rule condition is required';
			} else {
				const { valid, errors: syntaxErrors } = validateRuleCondition(formData.condition);
				if (!valid) {
					errs.condition = syntaxErrors.join(', ');
				}
			}

			setErrors(errs);
			if (Object.keys(errs).length) return;
		}

		const newCompleted = { ...completed, [activeStep]: true };
		setCompleted(newCompleted);
		setErrors({});
		setActiveStep((prev) => prev + 1);
	};

	const handleBack = () => setActiveStep((prev) => prev - 1);
	const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	useEffect(() => {
		if (isEditing && ruleManagementStore.editingRule) {
			const r = ruleManagementStore.editingRule;
			setFormData({
				name: r.name || '',
				condition: r.condition || '',
			});
		}
	}, [isEditing, ruleManagementStore.editingRule]);

	// replace your handleSubmit with this one
	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
	};

	const handleStep = (step: number) => () => {
		// Validate step 1 before letting user jump to Review
		if (step === 2) {
			const errs: Record<string, string> = {};

			if (!formData.condition) {
				errs.condition = 'Rule condition is required';
			} else {
				const { valid, errors: syntaxErrors } = validateRuleCondition(formData.condition);
				if (!valid) {
					errs.condition = syntaxErrors.join(', ');
				}
			}

			setErrors(errs);
			if (Object.keys(errs).length) return;
		}

		if (completed[step] || step === activeStep || step < activeStep) {
			setActiveStep(step);
		}
	};

	return (
		<Box
			sx={{
				width: '100%',
				display: 'flex',
				justifyContent: 'center',
				mt: 6,
			}}
		>
			<Box sx={{ width: '100%', maxWidth: 800 }}>
				{/* Stepper */}
				<Stepper activeStep={activeStep} alternativeLabel>
					{steps.map((label, index) => (
						<Step key={label} completed={!!completed[index]}>
							<StepLabel
								onClick={handleStep(index)}
								StepIconComponent={(props) => <CircleStepIcon icons={icons} disabled={index > activeStep && !completed[index]} {...props} />}
							>
								{label}
							</StepLabel>
						</Step>
					))}
				</Stepper>

				{/* Step content */}
				<Box sx={{ mt: 4 }}>
					{activeStep === 0 && (
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
							<TextField
								required
								label='Rule Name'
								value={formData.name}
								onChange={(e) => handleChange('name', e.target.value)}
								error={!!errors.name}
								helperText={errors.name}
								size='small'
								sx={{ width: '100%', maxWidth: 400 }}
							/>
						</Box>
					)}

					{activeStep === 1 && (
						<>
							<TextField
								fullWidth
								multiline
								rows={4}
								required
								label='Rule Condition'
								placeholder="amount_to_send > 1000 AND to_currency = 'USD'"
								value={formData.condition}
								onChange={(e) => handleChange('condition', e.target.value)}
								error={!!errors.condition}
								helperText={errors.condition}
								InputLabelProps={{ shrink: true }}
								sx={{ mb: 2 }}
							/>
						</>
					)}

					{activeStep === 2 && (
						<Box>
							<Typography variant='h6' fontWeight='bold' sx={{ fontSize: '1.25rem', mb: 2 }}>
								Review Rule
							</Typography>

							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								{/* Name */}
								<Box>
									<Typography variant='subtitle1' fontWeight='bold'>
										Name
									</Typography>
									<Typography variant='body1'>{formData.name || '-'}</Typography>
								</Box>

								{/* Condition */}
								<Box>
									<Typography variant='subtitle1' fontWeight='bold'>
										Condition
									</Typography>
									<Typography
										variant='body2'
										sx={{
											fontFamily: 'monospace',
											whiteSpace: 'pre-wrap',
											wordBreak: 'break-word',
											bgcolor: 'grey.200', // 👈 more obvious background
											p: 2, // 👈 bigger padding
											borderRadius: 1,
											border: '1px solid',
											borderColor: 'grey.400',
										}}
									>
										{formData.condition || '-'}
									</Typography>
								</Box>
							</Box>
						</Box>
					)}
				</Box>

				{/* Buttons */}
				<Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
					{/* Exit */}
					<Button variant='outlined' color='secondary' onClick={handleExitClick}>
						Exit
					</Button>

					{/* Left side buttons */}
					<Box>
						{activeStep > 0 && (
							<Button onClick={handleBack} sx={{ mr: 1 }}>
								Back
							</Button>
						)}
						{activeStep < steps.length - 1 ? (
							<Button variant='contained' onClick={handleNext}>
								Next
							</Button>
						) : (
							<Button variant='contained' color='success' onClick={handleSubmit}>
								{isEditing ? 'Save' : 'Submit'}
							</Button>
						)}
					</Box>
				</Box>

				{/* Exit Confirmation Dialog */}
				<Dialog open={openExitConfirm} onClose={cancelExit}>
					<DialogTitle>Are you sure?</DialogTitle>
					<DialogContent>
						<DialogContentText>You have unsaved data. If you exit now, all progress will be lost. Do you really want to exit?</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button onClick={cancelExit} color='primary'>
							No, stay here
						</Button>
						<Button onClick={confirmExit} color='secondary' variant='contained'>
							Yes, exit
						</Button>
					</DialogActions>
				</Dialog>
			</Box>
		</Box>
	);
}
