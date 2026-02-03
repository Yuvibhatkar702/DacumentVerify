/**
 * History Page
 * Shows all verification history with filtering and pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FiClock, 
  FiFileText, 
  FiCreditCard, 
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiTrash2,
  FiEye
} from 'react-icons/fi';
import { getHistory, deleteVerification, getVerificationById } from '../services/verification.service';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import ConfidenceScore from '../components/common/ConfidenceScore';
import toast from 'react-hot-toast';

const HistoryPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0
  });
  const [filters, setFilters] = useState({
    documentType: '',
    status: ''
  });
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: 10,
        ...(filters.documentType && { documentType: filters.documentType }),
        ...(filters.status && { status: filters.status })
      };

      const response = await getHistory(params);

      if (response.success) {
        setDocuments(response.data.documents);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination
        }));
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, filters]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleViewDetails = async (doc) => {
    setDetailsLoading(true);
    try {
      const response = await getVerificationById(doc.id);
      if (response.success) {
        setSelectedDoc(response.data);
      }
    } catch (error) {
      toast.error('Failed to load details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this verification record?')) {
      return;
    }

    try {
      const response = await deleteVerification(id);
      if (response.success) {
        toast.success('Record deleted successfully');
        fetchHistory();
        if (selectedDoc?.id === id) {
          setSelectedDoc(null);
        }
      }
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <FiClock className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">
              Verification History
            </h1>
            <p className="text-gray-600">
              View and manage your past document verifications
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="card mb-6"
      >
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <FiFilter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={filters.documentType}
            onChange={(e) => handleFilterChange('documentType', e.target.value)}
            className="input w-auto py-2"
          >
            <option value="">All Documents</option>
            <option value="aadhaar">Aadhaar Card</option>
            <option value="pan">PAN Card</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input w-auto py-2"
          >
            <option value="">All Status</option>
            <option value="verified">Verified</option>
            <option value="suspicious">Suspicious</option>
            <option value="rejected">Rejected</option>
          </select>

          <div className="ml-auto text-sm text-gray-500">
            {pagination.totalRecords} records found
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List Section */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="card flex items-center justify-center py-20">
              <LoadingSpinner text="Loading history..." />
            </div>
          ) : documents.length === 0 ? (
            <div className="card text-center py-16">
              <FiClock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No records found</h3>
              <p className="text-gray-500 text-sm">
                {filters.documentType || filters.status
                  ? 'Try adjusting your filters'
                  : 'Start by verifying a document'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`card cursor-pointer transition-all hover:shadow-lg ${
                    selectedDoc?.id === doc.id ? 'ring-2 ring-government-blue' : ''
                  }`}
                  onClick={() => handleViewDetails(doc)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      doc.documentType === 'aadhaar' ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      {doc.documentType === 'aadhaar' ? (
                        <FiFileText className="w-6 h-6 text-orange-600" />
                      ) : (
                        <FiCreditCard className="w-6 h-6 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {doc.documentType} Card
                        </h3>
                        <StatusBadge status={doc.status} size="small" />
                      </div>
                      <p className="text-sm text-gray-600">
                        {doc.extractedData?.name || doc.extractedData?.panNumber || doc.extractedData?.aadhaarNumber || 'Document'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(doc.createdAt)}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {doc.confidenceScore}%
                      </div>
                      <p className="text-xs text-gray-500">confidence</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(doc);
                        }}
                        className="p-2 text-gray-400 hover:text-government-blue rounded-lg hover:bg-gray-100"
                        title="View details"
                      >
                        <FiEye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                        title="Delete"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <FiChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {detailsLoading ? (
              <div className="card flex items-center justify-center py-20">
                <LoadingSpinner text="Loading details..." />
              </div>
            ) : selectedDoc ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Details</h3>
                  <StatusBadge status={selectedDoc.status} />
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Document Type</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedDoc.documentType} Card</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">File Name</p>
                    <p className="font-medium text-gray-900 text-sm truncate">{selectedDoc.originalFileName}</p>
                  </div>

                  <ConfidenceScore score={selectedDoc.confidenceScore} />

                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Extracted Data</p>
                    <div className="space-y-2 text-sm">
                      {selectedDoc.documentType === 'aadhaar' ? (
                        <>
                          <DataRow label="Aadhaar" value={selectedDoc.extractedData?.aadhaarNumber} />
                          <DataRow label="Name" value={selectedDoc.extractedData?.name} />
                          <DataRow label="DOB" value={selectedDoc.extractedData?.dateOfBirth} />
                          <DataRow label="Gender" value={selectedDoc.extractedData?.gender} />
                        </>
                      ) : (
                        <>
                          <DataRow label="PAN" value={selectedDoc.extractedData?.panNumber} />
                          <DataRow label="Name" value={selectedDoc.extractedData?.name} />
                          <DataRow label="Father's Name" value={selectedDoc.extractedData?.fatherName} />
                          <DataRow label="DOB" value={selectedDoc.extractedData?.dateOfBirth} />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Verification Checks</p>
                    <div className="space-y-1">
                      <CheckRow label="Number Valid" checked={selectedDoc.verificationDetails?.numberValid} />
                      <CheckRow label="Format Valid" checked={selectedDoc.verificationDetails?.formatValid} />
                      {selectedDoc.documentType === 'aadhaar' && (
                        <>
                          <CheckRow label="QR Code Found" checked={selectedDoc.verificationDetails?.qrCodeFound} />
                          <CheckRow label="Checksum Valid" checked={selectedDoc.verificationDetails?.checksumValid} />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4 text-xs text-gray-500">
                    <p>Verified on: {formatDate(selectedDoc.createdAt)}</p>
                    <p>Processing time: {selectedDoc.processingTime}ms</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="card bg-gray-50 text-center py-12">
                <FiSearch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  Select a record to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const DataRow = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-500">{label}:</span>
    <span className="font-medium text-gray-900">{value || '-'}</span>
  </div>
);

const CheckRow = ({ label, checked }) => (
  <div className="flex items-center gap-2">
    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
      checked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
    }`}>
      {checked ? '✓' : '×'}
    </span>
    <span className="text-gray-600">{label}</span>
  </div>
);

export default HistoryPage;
