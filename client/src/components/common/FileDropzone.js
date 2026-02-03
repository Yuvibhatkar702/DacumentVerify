/**
 * File Dropzone Component
 * Drag and drop file upload with preview
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFile, FiImage, FiX, FiCheck } from 'react-icons/fi';

const FileDropzone = ({ onFileSelect, accept = {}, maxSize = 10485760, disabled = false }) => {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      alert(error.message);
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);

      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }

      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
      ...accept
    },
    maxSize,
    multiple: false,
    disabled
  });

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    onFileSelect(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragActive ? 'border-government-blue bg-blue-50' : 'border-gray-300 hover:border-government-blue'}
          ${isDragReject ? 'border-red-500 bg-red-50' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${file ? 'border-green-500 bg-green-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                className="mb-4"
              >
                <FiUploadCloud className={`w-16 h-16 ${isDragActive ? 'text-government-blue' : 'text-gray-400'}`} />
              </motion.div>
              
              <p className="text-lg font-medium text-gray-700 mb-2">
                {isDragActive ? 'Drop your document here' : 'Drag & drop your document'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse files
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                  JPG, PNG, GIF, WEBP
                </span>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                  PDF
                </span>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                  Max {formatFileSize(maxSize)}
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
            >
              {/* Clear button */}
              <button
                onClick={clearFile}
                className="absolute -top-2 -right-2 z-10 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <FiX className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="flex-shrink-0">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-lg shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                      {file.type === 'application/pdf' ? (
                        <FiFile className="w-10 h-10 text-red-500" />
                      ) : (
                        <FiImage className="w-10 h-10 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="flex-grow text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCheck className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-gray-800">File selected</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate max-w-xs">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FileDropzone;
