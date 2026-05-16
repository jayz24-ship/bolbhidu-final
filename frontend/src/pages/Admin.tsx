import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { apiService } from '../utils/api';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Upload, Camera } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    issues,
    isLoading,
    validateIssue,
    invalidateIssue,
    reportUser,
    updateProgress,
    uploadBeforeAfter,
    markResolved,
    extendDeadline,
    fetchIssues,
    getIssuesByStatus,
    getSortedIssuesByEngagement,
  } = useAdmin();

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      toast.error('Please login to access admin dashboard');
      navigate('/login');
      return;
    }
    
    if (!user.isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/feed');
      return;
    }
  }, [user, navigate]);

  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [timeRequired, setTimeRequired] = useState('');
  const [newProgress, setNewProgress] = useState('');
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleValidate = (issueId: string) => {
    if (!timeRequired || parseInt(timeRequired) <= 0) {
      toast.error('Please enter a valid time requirement');
      return;
    }

    validateIssue(issueId, parseInt(timeRequired));
    toast.success('Issue validated successfully');
    setSelectedIssue(null);
    setTimeRequired('');
  };

  const handleInvalidate = (issueId: string) => {
    invalidateIssue(issueId);
    toast.success('Issue marked as invalid');
  };

  const handleProgressUpdate = (issueId: string) => {
    if (!newProgress || parseInt(newProgress) < 0 || parseInt(newProgress) > 100) {
      toast.error('Please enter a valid progress value (0-100)');
      return;
    }

    updateProgress(issueId, parseInt(newProgress));
    toast.success('Progress updated successfully');
    setSelectedIssue(null);
    setNewProgress('');
  };

  const handleMarkResolved = (issueId: string) => {
    markResolved(issueId);
    toast.success('Issue marked as resolved');
  };

  const handleExtendDeadline = (issueId: string) => {
    extendDeadline(issueId, 5); // Extend by 5 days
    toast.success('Deadline extended by 5 days');
  };

  const handleReportUser = (issueId: string, userName: string) => {
    reportUser(issueId);
    toast.error(`User ${userName} has been reported for posting invalid issue`);
  };

  const handleImageUpload = async (issueId: string) => {
    if (!afterImage) {
      toast.error('Please select an after image to upload');
      return;
    }

    setIsUploadingImages(true);
    try {
      // Upload after image
      const signatureResponse = await apiService.upload.getSignature();
      const { signature, timestamp, cloud_name, api_key, folder } = signatureResponse.data;

      const formData = new FormData();
      formData.append('file', afterImage);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', api_key);
      formData.append('folder', folder);
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      const afterUrl = data.secure_url;

      // Get the original post image as before image
      const issue = issues.find(i => i.id === issueId);
      const beforeUrl = issue?.beforeImage; // This should be set from the original post

      await uploadBeforeAfter(issueId, beforeUrl, afterUrl);
      toast.success('After image uploaded successfully');
      setSelectedIssue(null);
      setAfterImage(null);
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-500';
      case 'Validated':
        return 'bg-blue-500';
      case 'Invalid':
        return 'bg-red-500';
      case 'Resolved':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const renderIssueCard = (issue: any) => (
    <Card key={issue.id} className="rounded-2xl shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={issue.userInfo.avatar} alt={issue.userInfo.name} />
              <AvatarFallback>{issue.userInfo.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{issue.userInfo.name}</h3>
                {issue.userInfo.reportCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {issue.userInfo.reportCount} {issue.userInfo.reportCount === 1 ? 'Report' : 'Reports'}
                  </Badge>
                )}
                {issue.userInfo.reportCount >= 5 && (
                  <Badge variant="destructive" className="text-xs bg-red-600">
                    Suspended
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{issue.postLocation}</p>
            </div>
          </div>
          <Badge className={getStatusColor(issue.status)} variant="secondary">
            {issue.status}
          </Badge>
        </div>

        <div className="mb-4">
          <h4 className="font-medium mb-2">{issue.postDescription}</h4>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Category: {issue.postCategory}</span>
            <span>•</span>
            <span>Engagement: {issue.engagementScore}%</span>
            <span>•</span>
            <span>Reported: {formatDate(issue.reportedAt)}</span>
          </div>
        </div>

        {issue.status === 'Validated' && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{issue.progress}%</span>
            </div>
            <Progress value={issue.progress} className="h-2" />
            {issue.deadline && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Deadline: {formatDate(issue.deadline)}</span>
              </div>
            )}
          </div>
        )}

        {/* Before/After Images */}
        {(issue.beforeImage || issue.afterImage) && (
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issue.beforeImage && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Before</Label>
                  <img
                    src={issue.beforeImage}
                    alt="Before"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}
              {issue.afterImage && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">After</Label>
                  <img
                    src={issue.afterImage}
                    alt="After"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {issue.status === 'Pending' && (
            <>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setSelectedIssue(issue.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Validate Issue</DialogTitle>
                    <DialogDescription>
                      Set the estimated time required to resolve this issue.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="timeRequired">Time Required (days)</Label>
                      <Input
                        id="timeRequired"
                        type="number"
                        placeholder="Enter number of days"
                        value={timeRequired}
                        onChange={(e) => setTimeRequired(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setSelectedIssue(null)}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleValidate(issue.id)}>
                        Validate Issue
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleInvalidate(issue.id)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Mark Invalid
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReportUser(issue.id, issue.userInfo.name)}
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Report User
              </Button>
            </>
          )}

          {issue.status === 'In Progress' && (
            <>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setSelectedIssue(issue.id)}>
                    <Clock className="h-4 w-4 mr-2" />
                    Update Progress
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Progress</DialogTitle>
                    <DialogDescription>
                      Update the current progress percentage for this issue.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="progress">Progress (%)</Label>
                      <Input
                        id="progress"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Enter progress percentage"
                        value={newProgress}
                        onChange={(e) => setNewProgress(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setSelectedIssue(null)}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleProgressUpdate(issue.id)}>
                        Update Progress
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setSelectedIssue(issue.id)}>
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Images
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload After Image</DialogTitle>
                    <DialogDescription>
                      Upload the after image to show progress. The before image is from the original post.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="afterImage">After Image (Progress Photo)</Label>
                      <Input
                        id="afterImage"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAfterImage(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => {
                        setSelectedIssue(null);
                        setAfterImage(null);
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleImageUpload(issue.id)} disabled={isUploadingImages}>
                        {isUploadingImages ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {issue.progress === 100 && (
                <Button
                  size="sm"
                  onClick={() => handleMarkResolved(issue.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Resolved
                </Button>
              )}

              {!issue.deadlineExtended && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExtendDeadline(issue.id)}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Extend Deadline
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage community issues and track progress
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{getIssuesByStatus('Pending').length}</p>
                <p className="text-sm text-muted-foreground">Pending Issues</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{getIssuesByStatus('In Progress').length}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{getIssuesByStatus('Completed').length}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{getIssuesByStatus('Rejected').length}</p>
                <p className="text-sm text-muted-foreground">Invalid</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All Issues ({issues.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({getIssuesByStatus('Pending').length})
          </TabsTrigger>
          <TabsTrigger value="validated">
            In Progress ({getIssuesByStatus('In Progress').length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({getIssuesByStatus('Completed').length})
          </TabsTrigger>
          <TabsTrigger value="invalid">
            Invalid ({getIssuesByStatus('Rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Issues are sorted by engagement score (highest priority first)
            </p>
          </div>
          <div className="space-y-4">
            {getSortedIssuesByEngagement().map(renderIssueCard)}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="space-y-4">
            {getIssuesByStatus('Pending')
              .sort((a, b) => b.engagementScore - a.engagementScore)
              .map(renderIssueCard)}
          </div>
        </TabsContent>

        <TabsContent value="validated" className="mt-6">
          <div className="space-y-4">
            {getIssuesByStatus('In Progress').map(renderIssueCard)}
          </div>
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          <div className="space-y-4">
            {getIssuesByStatus('Completed').map(renderIssueCard)}
          </div>
        </TabsContent>

        <TabsContent value="invalid" className="mt-6">
          <div className="space-y-4">
            {getIssuesByStatus('Rejected').map(renderIssueCard)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;