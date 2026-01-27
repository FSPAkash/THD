import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './DataUpload.css';

function DataUpload({ onDataUploaded }) {
  const { isDevMode } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  if (!isDevMode()) {
    return (
      <div className="upload-restricted glass-heavy">
        <div className="restricted-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2>Developer Access Required</h2>
        <p>Data upload is restricted to developer accounts only. Please sign in with developer credentials to upload data.</p>
      </div>
    );
  }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    setResult(null);
    
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setError('Invalid file format. Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setResult(response.data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      if (onDataUploaded) onDataUploaded();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please check your file and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="upload-page">
      <div className="upload-header">
        <h1>Data Upload</h1>
        <p>Upload Excel file containing daily KPI data and feature configuration</p>
      </div>

      <div className="upload-grid">
        <div className="upload-card glass-heavy">
          <h3>Upload File</h3>
          
          <div 
            className={`drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleInputChange}
              hidden
            />
            
            {file ? (
              <div className="file-info">
                <div className="file-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div className="file-details">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            ) : (
              <div className="drop-content">
                <div className="drop-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <p className="drop-text">Drop Excel file here or click to browse</p>
                <p className="drop-hint">Supports .xlsx and .xls files</p>
              </div>
            )}
          </div>

          {error && (
            <div className="upload-message error">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="upload-message success">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <div className="success-content">
                <span className="success-title">{result.message}</span>
                <span className="success-details">{result.records} records loaded across {result.use_cases?.length || 0} use cases</span>
              </div>
            </div>
          )}

          <div className="upload-actions">
            <button 
              className="btn-secondary" 
              onClick={handleClear}
              disabled={uploading || (!file && !error && !result)}
            >
              Clear
            </button>
            <button 
              className="btn-primary" 
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <span className="btn-spinner"></span>
                  Uploading
                </>
              ) : (
                'Upload Data'
              )}
            </button>
          </div>
        </div>

        <div className="format-card glass-heavy">
          <h3>File Format</h3>
          
          <div className="format-section">
            <h4>Sheet 1: DailyData</h4>
            <p>Daily KPI metrics with the following columns:</p>
            <div className="format-table-wrapper">
              <table className="format-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>date</code></td>
                    <td>Date</td>
                    <td>2024-01-15</td>
                  </tr>
                  <tr>
                    <td><code>use_case</code></td>
                    <td>Text</td>
                    <td>Search Optimization</td>
                  </tr>
                  <tr>
                    <td><code>business_segment</code></td>
                    <td>Text</td>
                    <td>B2B, B2C</td>
                  </tr>
                  <tr>
                    <td><code>device_type</code></td>
                    <td>Text</td>
                    <td>MW, DTW, App</td>
                  </tr>
                  <tr>
                    <td><code>page_type</code></td>
                    <td>Text</td>
                    <td>PLP, PDP, Homepage</td>
                  </tr>
                  <tr>
                    <td><code>visits</code></td>
                    <td>Number</td>
                    <td>125000</td>
                  </tr>
                  <tr>
                    <td><code>orders</code></td>
                    <td>Number</td>
                    <td>3500</td>
                  </tr>
                  <tr>
                    <td><code>revenue</code></td>
                    <td>Number</td>
                    <td>525000.00</td>
                  </tr>
                  <tr>
                    <td><code>cvr</code></td>
                    <td>Decimal</td>
                    <td>2.80</td>
                  </tr>
                  <tr>
                    <td><code>aov</code></td>
                    <td>Decimal</td>
                    <td>150.00</td>
                  </tr>
                  <tr>
                    <td><code>rpv</code></td>
                    <td>Decimal</td>
                    <td>4.20</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="format-section">
            <h4>Sheet 2: FeatureConfig</h4>
            <p>Launch date configuration for each use case:</p>
            <div className="format-table-wrapper">
              <table className="format-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>use_case</code></td>
                    <td>Text</td>
                    <td>Search Optimization</td>
                  </tr>
                  <tr>
                    <td><code>launch_date</code></td>
                    <td>Date</td>
                    <td>2024-06-01</td>
                  </tr>
                  <tr>
                    <td><code>description</code></td>
                    <td>Text</td>
                    <td>Optional notes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="format-note">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <p>Include data for both current year and previous year to enable YoY comparison analysis. The use_case values must match exactly between both sheets.</p>
          </div>

          <div className="format-note">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <p><strong>Segment columns are optional.</strong> business_segment (B2B/B2C), device_type (MW/DTW/App), and page_type allow filtering. If omitted, data defaults to "All" for each segment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataUpload;