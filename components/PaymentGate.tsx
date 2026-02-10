import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { getApiUrl } from '../lib/api';
import PricingTable from './PricingTable';
import PaymentModal from './PaymentModal';

interface PaymentGateProps {
  onRefresh?: () => void;
}

export default function PaymentGate({ onRefresh }: PaymentGateProps) {
  const { user, signOut } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checking, setChecking] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Small delay to avoid flash
    const timer = setTimeout(() => setChecking(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (checking) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">Checking subscription...</p>
        </div>
      </div>
    );
  }

  const handleBackToHome = async () => {
    // Clear landing page flag and sign out
    localStorage.removeItem('edujourney_landing_seen');
    await signOut();
  };

  const handleRefresh = () => {
    if (onRefresh) {
      setRefreshing(true);
      onRefresh();
      // Reset refreshing state after a delay
      setTimeout(() => setRefreshing(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-50 overflow-y-auto">
      {/* Fixed Top Bar with Back Button & Refresh */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 py-3 z-50">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToHome}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            ← Back to Home
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Checking...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Already Paid? Refresh
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-6xl w-full my-8">
          {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full mb-6 shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 mb-3 font-outfit">
            Welcome, {user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-xl text-slate-600 font-medium mb-2">
            Choose your exam plan to start your preparation journey
          </p>
          <p className="text-sm text-slate-500">
            Select a plan below to unlock unlimited scans, AI analysis, and exam-specific content
          </p>
        </div>

        {/* Important Notice */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-8 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-bold text-amber-900 mb-1">Payment Required</h3>
              <p className="text-sm text-amber-800">
                You need an active subscription to access the app. Choose any plan to continue.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Table */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <PricingTable
            onSelectPlan={(plan) => {
              setSelectedPlan(plan);
              setShowPaymentModal(true);
            }}
          />
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            🔒 Secure payment powered by RazorPay • 💳 All major cards accepted • ✨ Cancel anytime
          </p>
        </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            // Reload page to check subscription and grant access
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
