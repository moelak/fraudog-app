import { useState } from 'react';
import { uploadFile } from '@/utils/fileUpload';

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

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">File Upload</h2>
      
      <div className="mb-4">
        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
          disabled={uploading}
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={`px-4 py-2 rounded-md text-white font-medium
          ${!file || uploading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
          }`}
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}

      {uploadResult?.success && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
          <p>File uploaded successfully!</p>
          <p className="text-sm mt-1">
            <a 
              href={uploadResult.publicUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-green-800"
            >
              View File
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
