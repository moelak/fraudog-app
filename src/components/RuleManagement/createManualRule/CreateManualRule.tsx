import { useEffect, useState } from 'react';
import {
	Stepper,
	Step,
	StepLabel,
	Button,
	Typography,
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Box,
	Switch,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from '@mui/material';
import { ruleManagementStore } from '.././RuleManagementStore';
import CircleStepIcon from '../cricleStepIcon/CircleStepIconRoot';
import { useRules } from '../../../hooks/useRules';
import { showErrorToast, showSuccessToast } from '../../../utils/toast';
import { runInAction } from 'mobx';
import { validateRuleCondition } from '../../../utils/sqlValidator';
import { Rule as RuleIcon, Description as DescriptionIcon, DoneAll as DoneAllIcon } from '@mui/icons-material';
const steps = ['Rule Info', 'Condition & Description', 'Review'];

interface CreateRuleData {
	name: string;
	description: string;
	category: string;
	condition: string;
	status: 'active' | 'inactive' | 'warning';
	severity: 'low' | 'medium' | 'high';
	decision: 'allow' | 'review' | 'deny';
	log_only: boolean;
	source?: 'AI' | 'User';
}

interface FormData {
	name: string;
	category: string;
	status: 'active' | 'inactive' | 'warning' | 'in_progress';
	severity: 'low' | 'medium' | 'high';
	decision: 'allow' | 'review' | 'deny';
	condition: string;
	description: string;
	log_only: boolean;
}

interface UpdateRuleData {
	name?: string;
	description?: string;
	category?: string;
	condition?: string;
	status?: 'active' | 'inactive' | 'warning' | 'in progress';
	severity?: 'low' | 'medium' | 'high';
	decision?: 'allow' | 'review' | 'deny';
	log_only?: boolean;
	source?: 'AI' | 'User';
	catches?: number;
	false_positives?: number;
	effectiveness?: number;
}

interface FormErrors {
	name?: string;
	category?: string;
	status?: string;
	severity?: string;
	decision?: string;
	condition?: string;
	description?: string;
}

export default function CreateManualRule() {
	const [activeStep, setActiveStep] = useState(0);
	const [formData, setFormData] = useState({
		name: '',
		category: '',
		decision: '',
		severity: '',
		condition: '',
		description: '',
		status: 'inactive',
		log_only: false,
	});

	const [errors, setErrors] = useState<FormErrors>({});
	const [openExitConfirm, setOpenExitConfirm] = useState(false); // 👈 modal state
	const [completed, setCompleted] = useState<{ [k: number]: boolean }>({});
	const { createRule, updateRule } = useRules();
	const isEditingFromGenerated = ruleManagementStore.isEditingFromGenerated;
	const isEditing = !!ruleManagementStore.editingRule;
	// check if form has any filled values
	// const isFormDirty = Object.values(formData).some((v) => v && v !== 'active' && v !== false);

	const [initialData, setInitialData] = useState(formData);
	const icons: { [index: string]: React.ReactElement } = {
		1: <RuleIcon />,
		2: <DescriptionIcon />,
		3: <DoneAllIcon />,
	};

	useEffect(() => {
		if (isEditing && ruleManagementStore.editingRule) {
			const r = ruleManagementStore.editingRule;
			const data = {
				name: r.name || '',
				category: r.category || '',
				decision: r.decision || '',
				severity: r.severity || '',
				condition: r.condition || '',
				description: r.description || '',
				status: r.status || 'inactive',
				log_only: r.log_only ?? false,
			};
			setFormData(data);
			setInitialData(data); // snapshot original
		} else {
			const blank = {
				name: '',
				category: '',
				decision: '',
				severity: '',
				condition: '',
				description: '',
				status: 'inactive',
				log_only: false,
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
			category: '',
			decision: '',
			severity: '',
			condition: '',
			description: '',
			status: 'inactive',
			log_only: false,
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
			ruleManagementStore.setDisplayManualRuleStepper(false); // safe to exit
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
			if (!formData.category) errs.category = 'Category is required';
			if (!formData.decision) errs.decision = 'Decision is required';
			if (!formData.severity) errs.severity = 'Severity is required';
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

			if (!formData.description) {
				errs.description = 'Description is required';
			}

			setErrors(errs);
			if (Object.keys(errs).length) return; // 🚫 Stop if errors exist
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
				category: r.category || '',
				decision: r.decision || '',
				severity: r.severity || '',
				condition: r.condition || '',
				description: r.description || '',
				status: r.status || 'inactive',
				log_only: r.log_only ?? false,
			});
		}
	}, [isEditing, ruleManagementStore.editingRule]);

	// replace your handleSubmit with this one
	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();

		// validate final step fields
		if (!formData.condition || !formData.description) {
			setErrors({
				condition: !formData.condition ? 'Rule condition is required' : undefined,
				description: !formData.description ? 'Description is required' : undefined,
			});
			return;
		}

		try {
			if (isEditing && ruleManagementStore.editingRule) {
				// Update existing rule
				const updates: UpdateRuleData = {
					name: formData.name,
					description: formData.description,
					category: formData.category,
					decision: formData.decision.toLowerCase() as 'allow' | 'review' | 'deny',
					condition: formData.condition,
					severity: formData.severity as 'low' | 'medium' | 'high',
					log_only: formData.log_only,
				};

				// Only update status if NOT editing from Generated Rules
				if (!isEditingFromGenerated) {
					updates.status = formData.status as 'active' | 'inactive' | 'warning';
				} else {
					updates.status = 'in progress';
				}

				await updateRule(ruleManagementStore.editingRule.id, updates);

				// Merge with existing rule
				const updatedRule = {
					...ruleManagementStore.editingRule,
					...updates,
					updated_at: new Date().toISOString(),
				};

				runInAction(() => {
					ruleManagementStore.updateRuleInStore(updatedRule);
				});
				showSuccessToast('Rule updated successfully.');
			} else {
				// Create new rule
				const ruleData: CreateRuleData = {
					name: formData.name,
					description: formData.description,
					category: formData.category,
					decision: formData.decision.toLowerCase() as 'allow' | 'review' | 'deny',
					condition: formData.condition,
					status: formData.status as 'active' | 'inactive' | 'warning',
					severity: formData.severity as 'low' | 'medium' | 'high',
					log_only: formData.log_only,
					source: 'User',
				};

				await createRule(ruleData);
				showSuccessToast('Rule created successfully.');
			}

			// Close modal
			ruleManagementStore.setDisplayManualRuleStepper(false);
		} catch (error) {
			console.error('Error saving rule:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			showErrorToast(`Failed to save rule: ${errorMessage}`);
		}
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

			if (!formData.description) {
				errs.description = 'Description is required';
			}

			setErrors(errs);
			if (Object.keys(errs).length) return; // 🚫 Block step change
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

							{/* Category / Decision / Severity */}
							<Box
								sx={{
									display: 'grid',
									gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
									gap: 2,
									maxWidth: '100%',
								}}
							>
								<FormControl size='small' fullWidth>
									<InputLabel required id='category-label'>
										Category
									</InputLabel>
									<Select labelId='category-label' label='Category' value={formData.category} onChange={(e) => handleChange('category', e.target.value)}>
										{['Behavioral', 'Payment Method', 'Technical', 'Identity'].map((c) => (
											<MenuItem key={c} value={c}>
												{c}
											</MenuItem>
										))}
									</Select>
									{errors.category && (
										<Typography variant='caption' color='error'>
											{errors.category}
										</Typography>
									)}
								</FormControl>

								<FormControl size='small' fullWidth>
									<InputLabel required id='decision-label'>
										Decision
									</InputLabel>
									<Select
										labelId='decision-label'
										label='Decision'
										value={formData.decision}
										onChange={(e) => handleChange('decision', e.target.value as 'allow' | 'review' | 'deny')}
									>
										{['allow', 'review', 'deny'].map((d) => (
											<MenuItem key={d} value={d}>
												{d}
											</MenuItem>
										))}
									</Select>
									{errors.decision && (
										<Typography variant='caption' color='error'>
											{errors.decision}
										</Typography>
									)}
								</FormControl>

								<FormControl size='small' fullWidth>
									<InputLabel required id='severity-label'>
										Severity
									</InputLabel>
									<Select
										labelId='severity-label'
										label='Severity'
										value={formData.severity}
										onChange={(e) => handleChange('severity', e.target.value as 'low' | 'medium' | 'high')}
									>
										{['low', 'medium', 'high'].map((s) => (
											<MenuItem key={s} value={s}>
												{s}
											</MenuItem>
										))}
									</Select>
									{errors.severity && (
										<Typography variant='caption' color='error'>
											{errors.severity}
										</Typography>
									)}
								</FormControl>
							</Box>
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

							<TextField
								fullWidth
								multiline
								rows={3}
								required
								label='Description'
								value={formData.description}
								onChange={(e) => handleChange('description', e.target.value)}
								placeholder='Describe what this rule does and when it triggers'
								error={!!errors.description}
								helperText={errors.description}
								InputLabelProps={{ shrink: true }}
								sx={{ mt: 2 }}
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

								{/* Decision, Category, Severity (responsive row) */}
								<Box
									sx={{
										display: 'grid',
										gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
										gap: 2,
									}}
								>
									<Box>
										<Typography variant='subtitle1' fontWeight='bold'>
											Decision
										</Typography>
										<Typography variant='body1' sx={{ textTransform: 'capitalize' }}>
											{formData.decision || '-'}
										</Typography>
									</Box>

									<Box>
										<Typography variant='subtitle1' fontWeight='bold'>
											Category
										</Typography>
										<Typography variant='body1'>{formData.category || '-'}</Typography>
									</Box>

									<Box>
										<Typography variant='subtitle1' fontWeight='bold'>
											Severity
										</Typography>
										<Typography
											variant='body1'
											sx={{
												color: formData.severity === 'high' ? 'error.main' : formData.severity === 'medium' ? 'warning.main' : 'success.main',
												fontWeight: 'bold',
												textTransform: 'capitalize',
											}}
										>
											{formData.severity || '-'}
										</Typography>
									</Box>
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

								{/* Description */}
								<Box>
									<Typography variant='subtitle1' fontWeight='bold'>
										Description
									</Typography>
									<Typography variant='body2'>{formData.description || '-'}</Typography>
								</Box>

								{/* Status - default inactive */}
								<Box>
									<Typography variant='subtitle1' fontWeight='bold'>
										Status
									</Typography>
									<Box sx={{ display: 'flex', alignItems: 'center' }}>
										<Switch checked={formData.status === 'active'} onChange={(e) => handleChange('status', e.target.checked ? 'active' : 'inactive')} />
										<Typography>{formData.status === 'active' ? 'Active' : 'Inactive'}</Typography>
									</Box>
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
