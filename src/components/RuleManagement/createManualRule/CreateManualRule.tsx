import { useEffect, useRef, useState } from 'react';
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
	Popper,
	Paper,
	List,
	ListItem,
	ClickAwayListener,
	ToggleButtonGroup,
	ToggleButton,
} from '@mui/material';

import { ruleManagementStore } from '.././RuleManagementStore';
import CircleStepIcon from '../cricleStepIcon/CircleStepIconRoot';
import { useRules } from '../../../hooks/useRules';
import { showErrorToast, showSuccessToast } from '../../../utils/toast';
import { runInAction } from 'mobx';
import { validateRuleCondition } from '../../../utils/sqlValidator';
import { CircularProgress } from '@mui/material';
import { useColumns } from '../../../hooks/useColumns';
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

	// 👇 separate checks for description
	descriptionLength?: string;
	descriptionColumn?: string;
	descriptionInvalidColumns?: string;
}
import { InfoOutlined } from '@mui/icons-material';

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
	const [openExitConfirm, setOpenExitConfirm] = useState(false);
	const [completed, setCompleted] = useState<{ [k: number]: boolean }>({});
	const { createRule, updateRule } = useRules();
	const isEditingFromGenerated = ruleManagementStore.isEditingFromGenerated;
	const isEditing = !!ruleManagementStore.editingRule;
	const [generating, setGenerating] = useState(false);
	const [initialData, setInitialData] = useState(formData);
	const { columns, loading: columnsLoading } = useColumns();
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [invalidColumns, setInvalidColumns] = useState<string[]>([]);
	const icons: { [index: string]: React.ReactElement } = {
		1: <RuleIcon />,
		2: <DescriptionIcon />,
		3: <DoneAllIcon />,
	};
	const [inputMode, setInputMode] = useState<'manual' | 'ai'>('manual');
	const [highlightedIndex, setHighlightedIndex] = useState(0);
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
			const errs: FormErrors = {};

			// always require condition
			if (!formData.condition) {
				errs.condition = 'Rule condition is required';
			} else {
				const { valid, errors: syntaxErrors } = validateRuleCondition(formData.condition);
				if (!valid) {
					errs.condition = syntaxErrors.join(', ');
				}
			}

			// validate description
			if (!formData.description) {
				errs.descriptionLength = 'Description is required';
			} else {
				if (inputMode === 'manual') {
					if (formData.description.length < 20 || formData.description.length > 160) {
						errs.descriptionLength = 'Description must be between 20 and 500 characters.';
					}
				} else if (inputMode === 'ai') {
					if (formData.description.length < 20 || formData.description.length > 500) {
						errs.descriptionLength = 'Description must be between 20 and 500 characters.';
					}

					// must include @column
					const matches = [...formData.description.matchAll(/@([a-zA-Z0-9_]+)/g)].map((m) => m[1]);
					// if (matches.length === 0) {
					// 	errs.descriptionColumn = 'At least one @column reference is required.';
					// }

					// invalid/misspelled columns
					const invalid = matches.filter((col) => !columns.some((c) => c.toLowerCase() === col.toLowerCase()));
					if (invalid.length > 0) {
						errs.descriptionInvalidColumns = `Invalid column(s): ${invalid.join(', ')}`;
					}
				}
			}

			setErrors(errs);
			if (Object.keys(errs).length) return; // 🚫 block next step
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
		setErrors({});
	}, [inputMode]);

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
			if (Object.keys(errs).length) return;
		}

		if (completed[step] || step === activeStep || step < activeStep) {
			setActiveStep(step);
		}
	};

	const handleGenerateCondition = async () => {
		const { valid, errors } = validateDescriptionForCondition(formData.description, columns, inputMode);

		if (!valid) {
			const newErrors: FormErrors = {};
			errors.forEach((msg) => {
				if (msg.includes('20') || msg.includes('500')) newErrors.descriptionLength = msg;
				else if (msg.includes('@column')) newErrors.descriptionColumn = msg;
				else if (msg.includes('Invalid column')) newErrors.descriptionInvalidColumns = msg;
			});
			setErrors((prev) => ({ ...prev, ...newErrors }));
			showErrorToast(errors[0]); // still show toast
			return;
		}

		try {
			setGenerating(true);

			const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-condition`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
					Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
				},
				body: JSON.stringify({
					description: formData.description,
					columns,
				}),
			});

			const data = await res.json();

			if (data.condition) {
				setFormData((prev) => ({ ...prev, condition: data.condition }));

				// ✅ clear description errors on success
				setErrors((prev) => ({
					...prev,
					descriptionLength: undefined,
					descriptionColumn: undefined,
					descriptionInvalidColumns: undefined,
				}));

				showSuccessToast('Condition generated successfully.');
			} else {
				showErrorToast('AI did not return a condition.');
			}
		} catch (err) {
			console.error(err);
			showErrorToast('Failed to generate condition.');
		} finally {
			setGenerating(false);
		}
	};

	useEffect(() => {
		if (!formData.description) {
			setInvalidColumns([]);
			return;
		}

		const regex = /@([a-zA-Z0-9_]+)/g;
		const matches = [...formData.description.matchAll(regex)].map((m) => m[1]);
		const invalid = matches.filter((col) => !columns.some((c) => c.toLowerCase() === col.toLowerCase()));
		setInvalidColumns(invalid);
	}, [formData.description, columns]);
	const descriptionRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

	const handleSuggestionSelect = (selected: string) => {
		const input = descriptionRef.current;
		let cursorPos = formData.description.length;

		if (input && typeof input.selectionStart === 'number') {
			cursorPos = input.selectionStart;
		}

		const beforeCursor = formData.description.slice(0, cursorPos);
		const afterCursor = formData.description.slice(cursorPos);

		const newBeforeCursor = beforeCursor.replace(/@([a-zA-Z0-9_]*)$/, `@${selected} `);
		const newValue = newBeforeCursor + afterCursor;

		setFormData((prev) => ({ ...prev, description: newValue }));
		setShowSuggestions(false);

		setTimeout(() => {
			if (input) {
				input.focus();
				input.setSelectionRange(newBeforeCursor.length, newBeforeCursor.length);
			}
		}, 0);
	};

	// --- keyboard nav
	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (!showSuggestions || suggestions.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			e.preventDefault();
			handleSuggestionSelect(suggestions[highlightedIndex]);
		}
	};

	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	const handleDescriptionChange = (value: string, e?: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setFormData((prev) => ({ ...prev, description: value }));

		// live validation
		const { valid, errors: descErrors } = validateDescriptionForCondition(value, columns, inputMode);

		if (valid) {
			// ✅ clear all description-related errors
			setErrors((prev) => ({
				...prev,
				descriptionLength: undefined,
				descriptionColumn: undefined,
				descriptionInvalidColumns: undefined,
			}));
		} else {
			// ❌ re-apply only the failing ones
			const newErrors: FormErrors = {};
			descErrors.forEach((msg) => {
				if (msg.includes('20') || msg.includes('500')) newErrors.descriptionLength = msg;
				else if (msg.includes('@column')) newErrors.descriptionColumn = msg;
				else if (msg.includes('Invalid column')) newErrors.descriptionInvalidColumns = msg;
			});
			setErrors((prev) => ({ ...prev, ...newErrors }));
		}

		// --- keep your suggestion logic
		const cursorPos = e?.target.selectionStart || value.length;
		const beforeCursor = value.slice(0, cursorPos);

		const match = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);
		if (match) {
			const prefix = match[1].toLowerCase();
			const filtered = prefix.length === 0 ? columns : columns.filter((col) => col.toLowerCase().startsWith(prefix));

			setSuggestions(filtered);
			setShowSuggestions(filtered.length > 0);

			if (e?.target) setAnchorEl(e.target as HTMLElement);
		} else {
			setShowSuggestions(false);
			setAnchorEl(null);
		}
	};

	const validateDescriptionForCondition = (description: string, columns: string[], mode: 'manual' | 'ai') => {
		const errors: string[] = [];

		// find all @columns
		const matches = [...description.matchAll(/@([a-zA-Z0-9_]+)/g)].map((m) => m[1]);

		if (mode === 'ai') {
			// if (matches.length === 0) {
			// 	errors.push('At least one @column reference is required.');
			// }

			const invalid = matches.filter((col) => !columns.some((c) => c.toLowerCase() === col.toLowerCase()));
			if (invalid.length > 0) {
				errors.push(`Invalid column(s): ${invalid.join(', ')}`);
			}
		}

		//length rule applies for both
		if (description.length < 20 || description.length > 500) {
			errors.push('Description must be between 20 and 500 characters.');
		}

		return { valid: errors.length === 0, errors };
	};

	const handleDescriptionBlur = () => {
		setShowSuggestions(false);
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
							{/* Mode Switcher */}
							<Box sx={{ mb: 2 }}>
								<ToggleButtonGroup value={inputMode} exclusive onChange={(e, val) => val && setInputMode(val)} size='small'>
									<ToggleButton value='manual'>Manual Entry</ToggleButton>
									<ToggleButton value='ai'>AI Generated</ToggleButton>
								</ToggleButtonGroup>
							</Box>

							{/* Notice text only in AI mode */}
							{inputMode === 'ai' && (
								<Typography
									variant='body2'
									sx={{
										mb: 1,
										color: 'info.main',
										display: 'flex',
										alignItems: 'center',
										gap: 0.5, // small spacing between icon and text
									}}
								>
									<InfoOutlined fontSize='small' sx={{ color: 'info.main' }} />
									For more accurate results, include pre-built column options (e.g. @columnName).
								</Typography>
							)}

							{/* Description Field */}
							<Box sx={{ position: 'relative', mt: 2 }}>
								<TextField
									fullWidth
									multiline
									rows={5}
									required
									label='Description'
									inputRef={descriptionRef}
									value={formData.description}
									onChange={(e) => handleDescriptionChange(e.target.value, e)}
									onKeyDown={handleKeyDown}
									placeholder={
										inputMode === 'manual'
											? 'Enter a short description (20–500 characters)'
											: 'Describe requirements (20–500 characters, include @columns for accuracy)'
									}
									error={!!(errors.descriptionLength || errors.descriptionColumn || errors.descriptionInvalidColumns)}
									helperText={
										<>
											{errors.descriptionLength && <div>{errors.descriptionLength}</div>}
											{errors.descriptionColumn && <div>{errors.descriptionColumn}</div>}
											{errors.descriptionInvalidColumns && <div>{errors.descriptionInvalidColumns}</div>}
										</>
									}
									InputLabelProps={{ shrink: true }}
									onBlur={handleDescriptionBlur}
								/>

								{/* Character Counter inside bottom-right */}
								<Typography
									variant='caption'
									sx={{
										position: 'absolute',
										bottom: 2,
										right: 12,
										color: formData.description.length < 20 || formData.description.length > 500 ? 'error.main' : 'text.secondary',
										pointerEvents: 'none', // avoid blocking text input
									}}
								>
									{formData.description.length} / 500
								</Typography>
							</Box>

							{/* Suggestions dropdown (was missing) */}
							<ClickAwayListener onClickAway={() => setShowSuggestions(false)}>
								<Popper
									open={showSuggestions}
									anchorEl={anchorEl}
									placement='bottom-start'
									modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
									sx={{ zIndex: 2000 }}
								>
									<Paper
										sx={{
											bgcolor: 'background.paper',
											borderRadius: 1,
											boxShadow: 3,
											minWidth: 200,
											maxHeight: 180,
											overflowY: 'auto',
										}}
									>
										<List dense>
											{suggestions.map((s, idx) => (
												<ListItem
													key={s}
													onMouseDown={(e) => {
														e.preventDefault(); // prevent blur
														handleSuggestionSelect(s);
													}}
													sx={{
														py: 1,
														px: 2,
														cursor: 'pointer',
														bgcolor: idx === highlightedIndex ? 'action.selected' : 'transparent',
														'&:hover': { bgcolor: 'action.hover' },
													}}
												>
													{s}
												</ListItem>
											))}
										</List>
									</Paper>
								</Popper>
							</ClickAwayListener>

							{/* Generate Button (AI mode only) */}
							{inputMode === 'ai' && (
								<Button variant='outlined' onClick={handleGenerateCondition} disabled={generating || columnsLoading} sx={{ mt: 2 }}>
									{generating ? <CircularProgress size={20} /> : 'Generate Condition →'}
								</Button>
							)}

							{/* Condition Field (always editable) */}
							<TextField
								fullWidth
								multiline
								rows={2}
								required
								label='Rule Condition'
								placeholder="amount_to_send > 1000 AND to_currency = 'USD'"
								value={formData.condition}
								onChange={(e) => handleChange('condition', e.target.value)}
								error={!!errors.condition}
								helperText={errors.condition}
								InputLabelProps={{ shrink: true }}
								sx={{ mt: 4 }}
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
									<Typography variant='body2'>
										{formData.description
											? formData.description.split(/(@[a-zA-Z0-9_]+)/).map((part, i) =>
													part.startsWith('@') ? (
														<span
															key={i}
															style={{
																color: invalidColumns.includes(part.substring(1)) ? 'red' : 'blue',
																borderBottom: invalidColumns.includes(part.substring(1)) ? '1px dotted red' : 'none',
															}}
															title={invalidColumns.includes(part.substring(1)) ? 'Column does not exist' : 'Valid column'}
														>
															{part}
														</span>
													) : (
														part
													)
											  )
											: '-'}
									</Typography>
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
