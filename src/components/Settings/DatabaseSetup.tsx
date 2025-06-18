import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { createUsersTable, createUsersTableAlternative } from '../../utils/createUsersTable';
import { 
  DatabaseIcon, 
  PlayIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

const DatabaseSetup = observer(() => {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: any; sql?: string } | null>(null);
  const [showSql, setShowSql] = useState(false);

  const handleCreateTable = async () => {
    setIsCreating(true);
    setResult(null);

    try {
      const result = await createUsersTable();
      setResult(result);
    } catch (error) {
      setResult({ success: false, error });
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowSql = async () => {
    const result = await createUsersTableAlternative();
    setResult(result);
    setShowSql(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('SQL copied to clipboard!');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center mb-6">
        <DatabaseIcon className="h-6 w-6 text-blue-600 mr-3" />
        <h2 className="text-lg font-medium text-gray-900">Database Setup</h2>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Create the users table in your Supabase database to enable user data synchronization.
        </p>

        <div className="flex space-x-3">
          <button
            onClick={handleCreateTable}
            disabled={isCreating}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                Create Users Table
              </>
            )}
          </button>

          <button
            onClick={handleShowSql}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
            Show SQL Commands
          </button>
        </div>

        {result && (
          <div className={`p-4 rounded-lg ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {result.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              )}
              <span className={`text-sm font-medium ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? 'Success!' : 'Error'}
              </span>
            </div>
            
            {result.error && (
              <div className="mt-2">
                <p className="text-sm text-red-700">
                  {result.error.message || 'An error occurred'}
                </p>
              </div>
            )}

            {result.sql && showSql && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    Copy this SQL and run it in your Supabase SQL Editor:
                  </p>
                  <button
                    onClick={() => copyToClipboard(result.sql!)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                  >
                    Copy SQL
                  </button>
                </div>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                  {result.sql}
                </pre>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Instructions:</strong>
                  </p>
                  <ol className="text-sm text-blue-700 mt-1 list-decimal list-inside space-y-1">
                    <li>Go to your Supabase dashboard</li>
                    <li>Navigate to SQL Editor</li>
                    <li>Paste the SQL commands above</li>
                    <li>Click "Run" to execute</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Important Notes:</p>
              <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside space-y-1">
                <li>Make sure you have configured the Supabase JWT template in Clerk</li>
                <li>The table will have Row Level Security (RLS) enabled</li>
                <li>Users can only access their own data</li>
                <li>If the automatic method fails, use the manual SQL method</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DatabaseSetup;