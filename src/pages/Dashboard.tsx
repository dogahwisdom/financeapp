import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { CreditCard, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

type Account = Database['public']['Tables']['accounts']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];
type User = Database['public']['Tables']['users']['Row'];

export default function Dashboard() {
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;

      try {
        // Fetch user details
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userData) {
          setUserDetails(userData);
        }

        // Fetch account details
        const { data: accountData } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (accountData) {
          setAccount(accountData);
        }

        // Fetch recent transactions
        const { data: transactionData } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (transactionData) {
          setTransactions(transactionData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {userDetails?.full_name}
        </h1>
        <p className="mt-2 text-gray-600">
          {userDetails?.role.charAt(0).toUpperCase() + userDetails?.role.slice(1)} Dashboard
        </p>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Current Balance</h2>
            <CreditCard className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="mt-4 text-3xl font-bold text-indigo-600">
            ₵{account?.balance.toFixed(2)}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Last updated: {new Date(account?.updated_at || '').toLocaleDateString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <p className="mt-4 text-3xl font-bold text-green-600">
            {transactions.length}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            transactions this month
          </p>
        </div>

        {userDetails?.role === 'student' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Student ID</h2>
              <div className="p-2 bg-indigo-100 rounded-full">
                <span className="text-indigo-600">#</span>
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-gray-900">
              {userDetails.student_id}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              University of Mines and Technology
            </p>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {transactions.length === 0 ? (
            <div className="px-6 py-4 text-center text-gray-500">
              No recent transactions found
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'payment' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {transaction.type === 'payment' ? (
                        <TrendingUp className={`w-5 h-5 ${
                          transaction.type === 'payment' ? 'text-green-600' : 'text-red-600'
                        }`} />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'payment' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'payment' ? '+' : '-'}₵{transaction.amount.toFixed(2)}
                      </p>
                      <div className="flex items-center mt-1">
                        {getStatusIcon(transaction.status)}
                        <span className={`text-xs ml-1 ${getStatusColor(transaction.status)}`}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}