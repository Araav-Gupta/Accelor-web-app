import React, { useState } from 'react';
import axios from 'axios';

const ExcelUpload = () => {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('excel', file);

    try {
      const response = await axios.post('/api/employees/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setResults({
        success: response.data.success,
        errors: response.data.errors
      });
    } catch (error) {
      console.error('Upload failed:', error);
      setResults({
        errors: [{ error: error.response?.data?.message || 'Upload failed' }]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <div className="mb-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
      
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Uploading...' : 'Upload Employees'}
      </button>

      {results && (
        <div className="mt-4">
          <div className="p-4 mb-4 text-green-800 bg-green-100 rounded-lg">
            Successfully created {results.success.length} employees
          </div>

          {results.errors.length > 0 && (
            <div className="p-4 text-red-800 bg-red-100 rounded-lg">
              <h3 className="mb-2 text-lg font-semibold">Errors:</h3>
              <ul className="list-disc pl-5">
                {results.errors.map((error, index) => (
                  <li key={index} className="mb-2">
                    <span className="font-medium">Row {index + 1}:</span> {error.error}
                    {error.row && (
                      <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto">
                        {JSON.stringify(error.row, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExcelUpload;
