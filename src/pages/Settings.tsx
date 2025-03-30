import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Save, AlertCircle } from 'lucide-react';

type User = Database['public']['Tables']['users']['Row'];
type Setting = Database['public']['Tables']['settings']['Row'];

export default function Settings() {
  const { user } = useAuth();
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchData() {
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

        // Only fetch settings if user is admin
        if (userData?.role === 'admin') {
          const { data: settingsData } = await supabase
            .from('settings')
            .select('*')
            .order('key');

          if (settingsData) {
            setSettings(settingsData);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const handleSettingUpdate = async (settingId: string, newValue: any) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { error } = await supabase
        .from('settings')
        .update({ value: newValue })
        .eq('id', settingId);

      if (error) throw error;

      setSettings(settings.map(s => 
        s.id === settingId ? { ...s, value: newValue } : s
      ));
      setSuccess('Settings updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      setError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (userDetails?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You don't have permission to access this page. Please contact an administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage system-wide settings and configurations
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Save className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            {settings.map((setting) => (
              <div key={setting.id} className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start">
                <label
                  htmlFor={setting.key}
                  className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                >
                  {setting.key.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                  {typeof setting.value === 'boolean' ? (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={setting.key}
                        checked={setting.value}
                        onChange={(e) => handleSettingUpdate(setting.id, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor={setting.key} className="ml-2 block text-sm text-gray-900">
                        {setting.value ? 'Enabled' : 'Disabled'}
                      </label>
                    </div>
                  ) : typeof setting.value === 'number' ? (
                    <input
                      type="number"
                      id={setting.key}
                      value={setting.value}
                      onChange={(e) => handleSettingUpdate(setting.id, parseFloat(e.target.value))}
                      className="max-w-lg block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                    />
                  ) : (
                    <input
                      type="text"
                      id={setting.key}
                      value={typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)}
                      onChange={(e) => {
                        try {
                          const value = e.target.value.startsWith('{') ? 
                            JSON.parse(e.target.value) : 
                            e.target.value;
                          handleSettingUpdate(setting.id, value);
                        } catch (error) {
                          handleSettingUpdate(setting.id, e.target.value);
                        }
                      }}
                      className="max-w-lg block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}