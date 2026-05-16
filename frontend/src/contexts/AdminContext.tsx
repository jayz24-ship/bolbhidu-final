import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { apiService } from '../utils/api';
import { getSocket } from '../utils/socket';

export interface Issue {
  id: string;
  postId: string;
  postDescription: string;
  postCategory: string;
  postLocation: string;
  userInfo: {
    id: string;
    name: string;
    avatar: string;
    email: string;
    reportCount: number;
  };
  engagementScore: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Rejected';
  reportedAt: Date;
  timeRequired?: number;
  deadline?: Date;
  progress: number;
  beforeImage?: string;
  afterImage?: string;
  deadlineExtended: boolean;
}

interface AdminContextType {
  issues: Issue[];
  isLoading: boolean;
  validateIssue: (issueId: string, timeRequired: number) => Promise<void>;
  invalidateIssue: (issueId: string) => Promise<void>;
  reportUser: (issueId: string) => void;
  updateProgress: (issueId: string, progress: number) => Promise<void>;
  uploadBeforeAfter: (issueId: string, beforeImage?: string, afterImage?: string) => Promise<void>;
  markResolved: (issueId: string) => Promise<void>;
  extendDeadline: (issueId: string, additionalDays: number) => Promise<void>;
  fetchIssues: () => Promise<void>;
  getIssuesByStatus: (status: Issue['status']) => Issue[];
  getSortedIssuesByEngagement: () => Issue[];
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchIssues = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiService.admin.getIssues();
      const fetchedIssues = response.data.issues.map((issue: any) => ({
        ...issue,
        reportedAt: new Date(issue.reportedAt),
        deadline: issue.deadline ? new Date(issue.deadline) : undefined,
      }));
      console.log('[AdminContext] Fetched issues:', fetchedIssues);
      console.log('[AdminContext] Issue statuses:', fetchedIssues.map((i: any) => i.status));
      setIssues(fetchedIssues);
    } catch (error: any) {
      console.error('[AdminContext] Fetch issues error:', error);
      // Don't throw, just log
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for real-time events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('issue.created', (data: any) => {
      console.log('[AdminContext] New issue created:', data);
      fetchIssues();
    });

    socket.on('issue.updated', (data: any) => {
      console.log('[AdminContext] Issue updated:', data);
      setIssues(prev => prev.map(issue => 
        issue.id === data.issueId 
          ? { ...issue, ...data.updates }
          : issue
      ));
    });

    socket.on('issue.completed', (data: any) => {
      console.log('[AdminContext] Issue completed:', data);
      setIssues(prev => prev.map(issue => 
        issue.id === data.issueId 
          ? { ...issue, status: 'Completed' as const, progress: 100 }
          : issue
      ));
    });

    return () => {
      socket.off('issue.created');
      socket.off('issue.updated');
      socket.off('issue.completed');
    };
  }, [fetchIssues]);

  const validateIssue = async (issueId: string, timeRequired: number) => {
    try {
      await apiService.admin.validateIssue(issueId, timeRequired);
      
      // Update local state
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + timeRequired);
      
      setIssues(prev => {
        const updated = prev.map(issue => 
          issue.id === issueId 
            ? { ...issue, status: 'In Progress' as const, timeRequired, deadline }
            : issue
        );
        console.log('[AdminContext] After validate, updated issues:', updated);
        console.log('[AdminContext] In Progress issues:', updated.filter(i => i.status === 'In Progress'));
        return updated;
      });
      
      // Refetch to ensure sync with backend
      await fetchIssues();
    } catch (error: any) {
      console.error('[AdminContext] Validate issue error:', error);
      throw new Error(error.response?.data?.message || 'Failed to validate issue');
    }
  };

  const invalidateIssue = async (issueId: string) => {
    try {
      await apiService.admin.markInvalid(issueId, 'Does not meet criteria');
      
      setIssues(prev => prev.map(issue => 
        issue.id === issueId 
          ? { ...issue, status: 'Rejected' as const }
          : issue
      ));
    } catch (error: any) {
      console.error('[AdminContext] Invalidate issue error:', error);
      throw new Error(error.response?.data?.message || 'Failed to invalidate issue');
    }
  };

  const reportUser = (issueId: string) => {
    // This increments report count on the backend
    invalidateIssue(issueId);
  };

  const updateProgress = async (issueId: string, progress: number) => {
    try {
      await apiService.admin.updateIssueProgress(issueId, progress);
      
      setIssues(prev => prev.map(issue => 
        issue.id === issueId 
          ? { ...issue, progress }
          : issue
      ));
    } catch (error: any) {
      console.error('[AdminContext] Update progress error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update progress');
    }
  };

  const uploadBeforeAfter = async (issueId: string, beforeImage?: string, afterImage?: string) => {
    try {
      const data: any = {};
      if (beforeImage) data.beforeImages = [beforeImage];
      if (afterImage) data.afterImages = [afterImage];
      
      await apiService.admin.uploadIssueImages(issueId, data);
      
      setIssues(prev => prev.map(issue => 
        issue.id === issueId 
          ? { ...issue, beforeImage, afterImage }
          : issue
      ));
    } catch (error: any) {
      console.error('[AdminContext] Upload images error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload images');
    }
  };

  const markResolved = async (issueId: string) => {
    try {
      const issue = issues.find(i => i.id === issueId);
      if (!issue?.afterImage) {
        throw new Error('After image is required to mark as resolved');
      }
      
      await apiService.admin.completeIssue(issueId, [issue.afterImage]);
      
      setIssues(prev => prev.map(issue => 
        issue.id === issueId 
          ? { ...issue, status: 'Completed' as const, progress: 100 }
          : issue
      ));
    } catch (error: any) {
      console.error('[AdminContext] Mark resolved error:', error);
      throw new Error(error.response?.data?.message || 'Failed to mark as resolved');
    }
  };

  const extendDeadline = async (issueId: string, additionalDays: number) => {
    try {
      await apiService.admin.extendDeadline(issueId);
      
      const issue = issues.find(i => i.id === issueId);
      if (issue?.deadline) {
        const newDeadline = new Date(issue.deadline);
        newDeadline.setDate(newDeadline.getDate() + additionalDays);
        
        setIssues(prev => prev.map(i => 
          i.id === issueId 
            ? { ...i, deadline: newDeadline, deadlineExtended: true }
            : i
        ));
      }
    } catch (error: any) {
      console.error('[AdminContext] Extend deadline error:', error);
      throw new Error(error.response?.data?.message || 'Failed to extend deadline');
    }
  };

  const getIssuesByStatus = (status: Issue['status']): Issue[] => {
    return issues.filter(issue => issue.status === status);
  };

  const getSortedIssuesByEngagement = (): Issue[] => {
    return [...issues].sort((a, b) => b.engagementScore - a.engagementScore);
  };

  const value: AdminContextType = {
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
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};
