/**
 * Dashboard Page
 * Main dashboard with statistics and quick actions
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiFileText, 
  FiCreditCard, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiXCircle,
  FiClock,
  FiTrendingUp,
  FiArrowRight
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getStats, getRecent } from '../services/verification.service';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentVerifications, setRecentVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        getStats(),
        getRecent(5)
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (recentRes.success) {
        setRecentVerifications(recentRes.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="large" text="Loading dashboard..." />
      </div>
    );
  }

  const statCards = [
    { 
      label: 'Total Verifications', 
      value: stats?.overview?.total || 0, 
      icon: FiFileText, 
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Verified', 
      value: stats?.overview?.verified || 0, 
      icon: FiCheckCircle, 
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    { 
      label: 'Suspicious', 
      value: stats?.overview?.suspicious || 0, 
      icon: FiAlertTriangle, 
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50'
    },
    { 
      label: 'Rejected', 
      value: stats?.overview?.rejected || 0, 
      icon: FiXCircle, 
      color: 'bg-red-500',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="page-container">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-display font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Here's an overview of your document verifications
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.bgColor} rounded-xl p-6 border border-gray-100`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {stats?.overview?.total > 0 && stat.label !== 'Total Verifications' && (
                  <span className="text-sm text-gray-500">
                    {Math.round((stat.value / stats.overview.total) * 100)}%
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-gray-600 text-sm mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <Link
              to="/verify/aadhaar"
              className="card flex items-center gap-4 hover:border-government-blue border-2 border-transparent transition-all group"
            >
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                <FiFileText className="w-7 h-7 text-orange-600" />
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-gray-900">Verify Aadhaar</h3>
                <p className="text-sm text-gray-500">Upload & verify Aadhaar card</p>
              </div>
              <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-government-blue transition-colors" />
            </Link>

            <Link
              to="/verify/pan"
              className="card flex items-center gap-4 hover:border-government-blue border-2 border-transparent transition-all group"
            >
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiCreditCard className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-gray-900">Verify PAN Card</h3>
                <p className="text-sm text-gray-500">Upload & verify PAN card</p>
              </div>
              <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-government-blue transition-colors" />
            </Link>

            <Link
              to="/history"
              className="card flex items-center gap-4 hover:border-government-blue border-2 border-transparent transition-all group"
            >
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <FiClock className="w-7 h-7 text-purple-600" />
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-gray-900">View History</h3>
                <p className="text-sm text-gray-500">See all past verifications</p>
              </div>
              <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-government-blue transition-colors" />
            </Link>
          </div>

          {/* Verification Rate */}
          {stats?.overview?.total > 0 && (
            <div className="mt-6 card bg-gradient-government text-white">
              <div className="flex items-center gap-3 mb-2">
                <FiTrendingUp className="w-5 h-5" />
                <span className="font-medium">Verification Rate</span>
              </div>
              <div className="text-4xl font-bold">
                {stats?.overview?.verificationRate || 0}%
              </div>
              <p className="text-white/70 text-sm mt-1">
                of documents verified successfully
              </p>
            </div>
          )}
        </motion.div>

        {/* Recent Verifications */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Verifications</h2>
            <Link to="/history" className="text-government-blue hover:underline text-sm font-medium">
              View all
            </Link>
          </div>

          <div className="card">
            {recentVerifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentVerifications.map((verification, index) => (
                  <motion.div
                    key={verification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="py-4 first:pt-0 last:pb-0 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        verification.documentType === 'aadhaar' ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        {verification.documentType === 'aadhaar' ? (
                          <FiFileText className="w-5 h-5 text-orange-600" />
                        ) : (
                          <FiCreditCard className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {verification.documentType} Card
                        </p>
                        <p className="text-sm text-gray-500">
                          {verification.documentNumber || verification.name || 'Document'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={verification.status} size="small" />
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(verification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No verifications yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Start by verifying an Aadhaar or PAN card
                </p>
              </div>
            )}
          </div>

          {/* Document Type Stats */}
          {(stats?.byDocumentType?.aadhaar?.count > 0 || stats?.byDocumentType?.pan?.count > 0) && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="card bg-orange-50">
                <h3 className="font-semibold text-gray-900 mb-2">Aadhaar Cards</h3>
                <div className="text-2xl font-bold text-orange-600">
                  {stats?.byDocumentType?.aadhaar?.count || 0}
                </div>
                <p className="text-sm text-gray-600">
                  {stats?.byDocumentType?.aadhaar?.verified || 0} verified
                </p>
              </div>
              <div className="card bg-blue-50">
                <h3 className="font-semibold text-gray-900 mb-2">PAN Cards</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.byDocumentType?.pan?.count || 0}
                </div>
                <p className="text-sm text-gray-600">
                  {stats?.byDocumentType?.pan?.verified || 0} verified
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
