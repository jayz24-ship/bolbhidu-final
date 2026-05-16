import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Flag, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const MyReports: React.FC = () => {
  const { user } = useAuth();

  const reportCount = user?.reportCount || 0;
  const isSuspended = user?.suspendedUntil && new Date(user.suspendedUntil) > new Date();
  const suspendedUntil = user?.suspendedUntil ? new Date(user.suspendedUntil) : null;

  const getReportStatus = () => {
    if (reportCount === 0) {
      return {
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: <CheckCircle className="h-5 w-5" />,
        title: 'Good Standing',
        description: 'You have no reports. Keep up the good work!'
      };
    } else if (reportCount < 3) {
      return {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: <AlertTriangle className="h-5 w-5" />,
        title: 'Warning',
        description: 'You have some reports. Please ensure you follow community guidelines.'
      };
    } else if (reportCount < 5) {
      return {
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        icon: <AlertTriangle className="h-5 w-5" />,
        title: 'Multiple Reports',
        description: 'You are close to suspension. Please be careful with your posts.'
      };
    } else {
      return {
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        icon: <XCircle className="h-5 w-5" />,
        title: 'Suspended',
        description: 'You have been suspended from posting due to multiple reports.'
      };
    }
  };

  const status = getReportStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Reports</h1>
        <p className="text-muted-foreground">
          View your report status and account standing
        </p>
      </div>

      {/* Suspension Alert */}
      {isSuspended && suspendedUntil && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Account Suspended</AlertTitle>
          <AlertDescription>
            Your account is suspended from posting until{' '}
            <strong>{suspendedUntil.toLocaleDateString()}</strong> due to multiple invalid posts.
          </AlertDescription>
        </Alert>
      )}

      {/* Report Count Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Report Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-4xl font-bold">{reportCount}</p>
              <p className="text-sm text-muted-foreground">Total Reports</p>
            </div>
            <Badge className={`${status.color} flex items-center gap-2 px-4 py-2`}>
              {status.icon}
              {status.title}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{status.description}</p>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">What are reports?</h3>
            <p className="text-sm text-muted-foreground">
              Reports are issued by admins when you post invalid or misleading content. 
              They help maintain the quality and authenticity of community issues.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Report Thresholds</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span><strong>0 reports:</strong> Good standing</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span><strong>1-2 reports:</strong> Warning issued</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span><strong>3-4 reports:</strong> Multiple warnings</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span><strong>5+ reports:</strong> 10-day posting suspension</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How to avoid reports?</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Only post genuine community issues</li>
              <li>Provide accurate descriptions and locations</li>
              <li>Upload clear, relevant photos</li>
              <li>Don't spam or post duplicate issues</li>
              <li>Follow community guidelines</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyReports;
