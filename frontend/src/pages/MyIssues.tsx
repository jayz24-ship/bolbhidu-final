import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UserIssue {
  id: string;
  postDescription: string;
  postCategory: string;
  postLocation: string;
  status: string;
  progress: number;
  reportedAt: string;
  deadline: string | null;
  beforeImage: string | null;
  afterImage: string | null;
}

const MyIssues: React.FC = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<UserIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyIssues();
  }, []);

  const fetchMyIssues = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.issues.getMyIssues();
      setIssues(response.data.issues);
    } catch (error) {
      toast.error('Failed to load your issues');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-4 w-4" />;
      case 'In Progress':
        return <AlertCircle className="h-4 w-4" />;
      case 'Completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Issues In Progress</h1>
        <p className="text-muted-foreground">
          Track the progress of your validated community issues that are currently being resolved
        </p>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-4xl font-bold">{issues.length}</p>
            <p className="text-sm text-muted-foreground">Issues In Progress</p>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="space-y-4">
        {issues.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Issues In Progress</h3>
              <p className="text-muted-foreground">
                Your validated issues that are being worked on by admins will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          issues.map((issue) => (
            <Card key={issue.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{issue.postDescription}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{issue.postCategory}</Badge>
                      <span>•</span>
                      <span>{issue.postLocation}</span>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(issue.status)} flex items-center gap-1`}>
                    {getStatusIcon(issue.status)}
                    {issue.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                {issue.status === 'In Progress' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-semibold">{issue.progress}%</span>
                    </div>
                    <Progress value={issue.progress} className="h-2" />
                  </div>
                )}

                {/* Before/After Images */}
                {(issue.beforeImage || issue.afterImage) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {issue.beforeImage && (
                      <div>
                        <p className="text-sm font-medium mb-2">Before</p>
                        <img
                          src={issue.beforeImage}
                          alt="Before"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    {issue.afterImage && (
                      <div>
                        <p className="text-sm font-medium mb-2">After</p>
                        <img
                          src={issue.afterImage}
                          alt="After"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Reported: {new Date(issue.reportedAt).toLocaleDateString()}</span>
                  {issue.deadline && (
                    <>
                      <span>•</span>
                      <span>Deadline: {new Date(issue.deadline).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MyIssues;
