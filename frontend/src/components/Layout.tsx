import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePost } from '../contexts/PostContext';
import { useTheme } from '../contexts/ThemeContext';
import { createSocket, SocketNotification } from '../utils/socket';
import { apiService } from '../utils/api';
import { Bell, Home, User, Settings, Search, LogOut, AlertCircle, Flag, Moon, Sun, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = usePost();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch persisted notifications from API on mount
  useEffect(() => {
    if (user) {
      console.log('[Layout] Fetching notifications from API...');
      apiService.notifications.list()
        .then(response => {
          console.log('[Layout] Fetched notifications:', response.data);
          setNotifications(response.data.notifications || []);
          setUnreadCount(response.data.unreadCount || 0);
        })
        .catch(error => {
          console.error('[Layout] Error fetching notifications:', error);
        });
    }
  }, [user]);

  // Set up socket listeners for real-time notifications
  useEffect(() => {
    if (user) {
      console.log('[Layout] Setting up socket connection for user:', user.id);
      const socket = createSocket();
      
      // Listen to all backend socket events and convert to notifications
      const addNotification = (message: string) => {
        console.log('[Layout] Adding notification:', message);
        const notification: SocketNotification = {
          message,
          timestamp: new Date(),
        };
        setNotifications(prev => {
          const newNotifications = [notification, ...prev.slice(0, 9)];
          console.log('[Layout] Updated notifications:', newNotifications);
          return newNotifications;
        });
        setUnreadCount(prev => prev + 1);
      };

      // Setup socket event listeners - function to be called when socket is ready
      const setupListeners = () => {
        console.log('[Layout] ✅ Setting up notification listeners...');

        // AI Result
        socket.on('post.ai.result', (data: any) => {
          console.log('[Layout] Received post.ai.result:', data);
          if (data.aiVerdict === 'accepted') {
            addNotification('✅ Your post has been approved and is now visible!');
          } else if (data.aiVerdict === 'rejected') {
            const reasons = data.reasons?.join(', ') || 'Content did not meet guidelines';
            addNotification(`❌ Post rejected: ${reasons}`);
          }
        });

        // Post Escalated to Issue
        socket.on('post.escalated', (data: any) => {
          console.log('[Layout] Received post.escalated:', data);
          addNotification('🔥 Your post has gained attention and been escalated to an issue!');
        });

        // Issue Created
        socket.on('issue.created', (data: any) => {
          console.log('[Layout] Received issue.created:', data);
          addNotification('📋 A new issue has been created from your post');
        });

        // Issue Updated
        socket.on('issue.updated', (data: any) => {
          console.log('[Layout] Received issue.updated:', data);
          addNotification('🔄 An issue related to your post has been updated');
        });

        // Issue Completed
        socket.on('issue.completed', (data: any) => {
          console.log('[Layout] Received issue.completed:', data);
          addNotification('🎉 Great news! The issue from your post has been resolved');
        });

        // User Enforcement
        socket.on('user.enforcement.updated', (data: any) => {
          console.log('[Layout] Received user.enforcement.updated:', data);
          if (data.suspendedUntil) {
            addNotification(`⚠️ Your posting has been temporarily suspended due to ${data.reportCount} reports`);
          }
        });

        // Post Activity - EVERY like, not just milestones
        socket.on('post.like.updated', (data: any) => {
          console.log('[Layout] Received post.like.updated:', data);
          if (data.likedBy) {
            addNotification(`❤️ ${data.likedBy} liked your post`);
          }
        });

        // Comment notifications with user name
        socket.on('post.comment.created', (data: any) => {
          console.log('[Layout] Received post.comment.created:', data);
          if (data.commentedBy) {
            addNotification(`💬 ${data.commentedBy} commented: "${data.commentText?.slice(0, 50)}${data.commentText?.length > 50 ? '...' : ''}"`);
          }
        });

        // Share notifications
        socket.on('post.share.created', (data: any) => {
          console.log('[Layout] Received post.share.created:', data);
          if (data.sharedBy) {
            addNotification(`🔁 ${data.sharedBy} shared your post`);
          }
        });

        // Issue Validated by Admin
        socket.on('issue.validated', (data: any) => {
          console.log('[Layout] Received issue.validated:', data);
          addNotification(`✅ Admin validated your issue! Work will be completed in ${data.etaDays} days`);
        });

        // Issue Rejected by Admin
        socket.on('issue.rejected', (data: any) => {
          console.log('[Layout] Received issue.rejected:', data);
          addNotification(`❌ Admin marked your issue as invalid: ${data.reason}`);
        });
      };

      // Set up listeners immediately if already connected, otherwise wait for connect event
      if (socket.connected) {
        console.log('[Layout] Socket already connected, setting up listeners now');
        setupListeners();
      } else {
        console.log('[Layout] Socket not connected yet, will set up listeners on connect');
        socket.once('connect', () => {
          console.log('[Layout] Socket connected! Now setting up listeners');
          setupListeners();
        });
      }

      return () => {
        console.log('[Layout] Cleaning up socket connection');
        socket.disconnect();
      };
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markNotificationsRead = () => {
    setUnreadCount(0);
  };

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/app/feed" className="flex items-center space-x-2">
              <div className="bg-primary text-primary-foreground rounded-xl p-2">
                <span className="font-bold">BB</span>
              </div>
              <span className="text-xl font-bold text-primary">Bol Bhidu</span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-full bg-input-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Navigation */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="relative"
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>

              {/* Notifications */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={markNotificationsRead}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((notification, index) => (
                        <div 
                          key={notification.id || index} 
                          className={`p-4 border-b hover:bg-muted/50 ${!notification.isRead ? 'bg-primary/5' : ''}`}
                        >
                          <p className="text-sm font-medium">{notification.title || 'Notification'}</p>
                          <p className="text-sm mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.createdAt || notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuItem onClick={() => navigate('/app/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/app/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  {user.isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/app/admin')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              <nav className="space-y-1">
                <Link
                  to="/app/feed"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive('/app/feed')
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </Link>
                <Link
                  to="/app/profile"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive('/app/profile')
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/app/my-issues"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive('/app/my-issues')
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <AlertCircle className="h-5 w-5" />
                  <span>My Issues</span>
                </Link>
                <Link
                  to="/app/my-reports"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive('/app/my-reports')
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Flag className="h-5 w-5" />
                  <span>My Reports</span>
                </Link>
                <Link
                  to="/app/trending"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive('/app/trending')
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <TrendingUp className="h-5 w-5" />
                  <span>Trending Issues</span>
                </Link>
                {user.isAdmin && (
                  <Link
                    to="/app/admin"
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive('/app/admin')
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                    <span>Admin</span>
                  </Link>
                )}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;