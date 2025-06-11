import { useState, useCallback } from 'react';
import { uploadFile } from '../utils/fileUpload';
import { 
  ArrowUpTrayIcon, 
  DocumentIcon, 
  XMarkIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

const FileUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    
    try {
      const result = await uploadFile(file);
      setUploadResult(result);
      if (!result.success) {
        setError(result.error || 'Failed to upload file');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles?.[0]) {
      setFile(droppedFiles[0]);
    }
  }, []);

  const removeFile = () => {
    setFile(null);
    setUploadResult(null);
    setError(null);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <ArrowUpTrayIcon className="h-6 w-6 mr-2" />
            File Upload
          </h2>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center
              ${file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              transition-colors duration-200 ease-in-out`}
          >
            {!file ? (
              <div className="space-y-4">
                <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-gray-600 mb-1">Drag and drop your file here, or</p>
                  <label className="inline-block cursor-pointer">
                    <span className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                      Browse Files
                    </span>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-white rounded border border-gray-200">
                <div className="flex items-center space-x-3">
                  <DocumentIcon className="h-8 w-8 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex justify-center">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`px-6 py-3 rounded-md text-white font-medium flex items-center space-x-2
                ${!file || uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                }`}
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XMarkIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadResult?.success && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Upload Successful</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Your file has been uploaded successfully.
                    {uploadResult.publicUrl && (
                      <a
                        href={uploadResult.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 underline hover:text-green-900"
                      >
                        View File
                      </a>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
