
import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Play, Database, MessageSquare, Linkedin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  details?: any;
  error?: string;
  duration?: number;
}

export const SystemTestsPage = (): JSX.Element => {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'LinkedIn Integration', status: 'pending' },
    { name: 'Messaging System', status: 'pending' },
    { name: 'Database Connectivity', status: 'pending' }
  ]);
  const [isRunning, setIsRunning] = useState(false);

  React.useEffect(() => {
    document.title = 'System Tests - TKS Alumni Portal';
  }, []);

  const updateTestStatus = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runLinkedInTest = async () => {
    const testIndex = 0;
    updateTestStatus(testIndex, { status: 'running' });
    const startTime = Date.now();

    try {
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch('/api/test/linkedin', {
        headers: { 'user-id': userId || '' }
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      if (result.success) {
        updateTestStatus(testIndex, {
          status: 'passed',
          details: result.results,
          duration
        });
      } else {
        updateTestStatus(testIndex, {
          status: 'failed',
          details: result.results,
          error: result.results.errors?.join(', ') || 'Test failed',
          duration
        });
      }
    } catch (error) {
      updateTestStatus(testIndex, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
    }
  };

  const runMessagingTest = async () => {
    const testIndex = 1;
    updateTestStatus(testIndex, { status: 'running' });
    const startTime = Date.now();

    try {
      const userId = user?.id || localStorage.getItem('userId');
      
      if (!userId) {
        updateTestStatus(testIndex, {
          status: 'failed',
          error: 'No user ID found. Please log in first.',
          duration: Date.now() - startTime
        });
        return;
      }

      const response = await fetch('/api/messages/test', {
        method: 'POST',
        headers: { 
          'user-id': userId,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      if (response.ok && result.success) {
        updateTestStatus(testIndex, {
          status: 'passed',
          details: result.results,
          duration
        });
      } else {
        updateTestStatus(testIndex, {
          status: 'failed',
          details: result.results || result,
          error: result.error || result.results?.errors?.join(', ') || `HTTP ${response.status}`,
          duration
        });
      }
    } catch (error) {
      updateTestStatus(testIndex, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
    }
  };

  const runDatabaseTest = async () => {
    const testIndex = 2;
    updateTestStatus(testIndex, { status: 'running' });
    const startTime = Date.now();

    try {
      const response = await fetch('/api/test/database');
      const result = await response.json();
      const duration = Date.now() - startTime;

      if (result.success) {
        updateTestStatus(testIndex, {
          status: 'passed',
          details: result,
          duration
        });
      } else {
        updateTestStatus(testIndex, {
          status: 'failed',
          details: result,
          error: result.errors?.join(', ') || 'Test failed',
          duration
        });
      }
    } catch (error) {
      updateTestStatus(testIndex, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    await runLinkedInTest();
    await runMessagingTest();
    await runDatabaseTest();
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getTestIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Linkedin className="w-6 h-6 text-blue-600" />;
      case 1:
        return <MessageSquare className="w-6 h-6 text-green-600" />;
      case 2:
        return <Database className="w-6 h-6 text-purple-600" />;
      default:
        return null;
    }
  };

  const passedTests = tests.filter(t => t.status === 'passed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;
  const totalTests = tests.length;

  return (
    <AppLayout currentPage="settings">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">System Tests</h1>
          <p className="text-gray-600 mt-2">Run comprehensive tests on critical system features</p>
          {!user && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                <strong>⚠️ Note:</strong> You are not logged in. Some tests (like Messaging) require authentication and may fail.
              </p>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Summary</span>
              <Button 
                onClick={runAllTests} 
                disabled={isRunning}
                className="bg-[#008060] hover:bg-[#007055]"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run All Tests
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{passedTests}</span>
                <span className="text-sm text-gray-600">Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-600">{failedTests}</span>
                <span className="text-sm text-gray-600">Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">{totalTests}</span>
                <span className="text-sm text-gray-600">Total</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual Tests */}
        <div className="space-y-4">
          {tests.map((test, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTestIcon(index)}
                    <div>
                      <CardTitle className="text-lg">{test.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {getStatusIcon(test.status)}
                        <span className="capitalize">{test.status}</span>
                        {test.duration && (
                          <Badge variant="outline" className="ml-2">
                            {test.duration}ms
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (index === 0) runLinkedInTest();
                      if (index === 1) runMessagingTest();
                      if (index === 2) runDatabaseTest();
                    }}
                    disabled={test.status === 'running'}
                  >
                    {test.status === 'running' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {test.status !== 'pending' && (
                <CardContent className="pt-4">
                  {test.status === 'failed' && test.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-red-900">Error:</p>
                      <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">{test.error}</p>
                      {test.error.includes('log in') && (
                        <p className="text-xs text-red-600 mt-2">
                          💡 Tip: Navigate to <a href="/login" className="underline">/login</a> to authenticate first.
                        </p>
                      )}
                    </div>
                  )}

                  {test.status === 'passed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-green-900">✅ Test Passed</p>
                    </div>
                  )}

                  {test.details && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Details:</p>
                      <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-96">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Test Information */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">About These Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong className="text-blue-900">LinkedIn Integration:</strong>
              <p className="text-gray-700">Tests OAuth setup, environment variables, database tables, and CRUD operations for LinkedIn integration.</p>
            </div>
            <div>
              <strong className="text-blue-900">Messaging System:</strong>
              <p className="text-gray-700">Tests message sending, receiving, marking as read, and table structure integrity.</p>
            </div>
            <div>
              <strong className="text-blue-900">Database Connectivity:</strong>
              <p className="text-gray-700">Comprehensive test of all database tables, storage buckets, and environment configuration.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
