import React, { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void;
  onError: (error: Error) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  isLoading = false,
  disabled = false,
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);

  useEffect(() => {
    // Load Google Sign-In script
    const loadScript = () => {
      if ((window as any).google) {
        setScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => onError(new Error('Failed to load Google Sign-In'));
      document.head.appendChild(script);
    };

    loadScript();
  }, [onError]);

  useEffect(() => {
    if (!scriptLoaded || !buttonRef.current) return;

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!googleClientId) {
      onError(new Error('Google Client ID not configured'));
      return;
    }

    try {
      const google = (window as any).google;
      
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: any) => {
          if (response.credential) {
            onSuccess(response.credential);
          } else {
            onError(new Error('No credential received'));
          }
        },
        ux_mode: 'popup', // Use popup instead of One Tap
        auto_select: false,
      });

      // Render the button
      google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: buttonRef.current.offsetWidth,
        text: 'continue_with',
        shape: 'rectangular',
      });
    } catch (error) {
      onError(error as Error);
    }
  }, [scriptLoaded, onSuccess, onError]);

  if (!scriptLoaded) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 rounded-xl"
        disabled
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading Google Sign-In...
      </Button>
    );
  }

  return (
    <div ref={buttonRef} className="w-full" style={{ minHeight: '48px' }} />
  );
};
