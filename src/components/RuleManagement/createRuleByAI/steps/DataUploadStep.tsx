import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { StepperData } from '../CreateRuleByAI';

interface DataUploadStepProps {
  data: StepperData;
  updateData: (updates: Partial<StepperData>) => void;
  onValidation: (csvContent: string) => void;
}

const DataUploadStep: React.FC<DataUploadStepProps> = ({
  data,
  updateData,
  onValidation
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [errors, setErrors] = React.useState<{[key: string]: string}>({});

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('Empty CSV file');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );
    
    return { headers, rows };
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrors({ csvData: 'Please upload a CSV file' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setErrors({ csvData: 'File size must be less than 10MB' });
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      
      updateData({
        csvFile: file,
        csvContent: text,
        csvData: rows.slice(0, 1000) // Limit to first 1000 rows for preview
      });
      
      onValidation(text);
      setErrors({});
    } catch (error) {
      setErrors({ csvData: `Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const removeFile = () => {
    updateData({ 
      csvFile: null, 
      csvContent: '', 
      csvData: [] 
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const csvHeaders = data.csvContent ? parseCSV(data.csvContent).headers : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* CSV Upload Section */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Upload Transaction Data
        </Typography>
        
        {!data.csvFile ? (
          <Paper
            sx={{
              border: '2px dashed',
              borderColor: isDragOver ? 'primary.main' : 'grey.300',
              bgcolor: isDragOver ? 'primary.50' : 'grey.50',
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'primary.50'
              }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('csv-upload')?.click()}
          >
            {isUploading ? (
              <Box>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography>Processing file...</Typography>
              </Box>
            ) : (
              <Box>
                <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Drop your CSV file here or click to browse
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supports CSV files up to 10MB
                </Typography>
              </Box>
            )}
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </Paper>
        ) : (
          <Paper sx={{ p: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {data.csvFile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatFileSize(data.csvFile.size)} • {data.csvData.length} rows • {csvHeaders.length} columns
                </Typography>
              </Box>
              <Button
                startIcon={<DeleteIcon />}
                color="error"
                onClick={removeFile}
              >
                Remove
              </Button>
            </Box>
            
            {/* Data Preview */}
            <Typography variant="subtitle2" gutterBottom>
              Data Preview (first 5 rows):
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {csvHeaders.map((header, index) => (
                      <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.csvData.slice(0, 5).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {cell.length > 50 ? `${cell.substring(0, 50)}...` : cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
        
        {errors.csvData && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {errors.csvData}
          </Alert>
        )}
      </Box>

      {/* Custom Instructions */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Custom Instructions (Optional)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Additional instructions for AI analysis"
          placeholder="e.g., Focus on high-value transactions, Consider geographic patterns, Prioritize velocity-based rules..."
          value={data.userInstructions}
          onChange={(e) => updateData({ userInstructions: e.target.value })}
          helperText="Provide specific guidance for the AI to focus on particular fraud patterns or business requirements"
        />
      </Box>

      {/* Privacy Notice */}
      <Alert severity="info">
        <Typography variant="body2">
          <strong>Privacy Notice:</strong> Your transaction data will be sent to OpenAI for analysis. 
          Please ensure you have appropriate permissions and consider data privacy requirements.
        </Typography>
      </Alert>
    </Box>
  );
};

export default DataUploadStep;
