/**
 * Google OAuth Utility
 * Handles Google Sign-In integration
 */

declare global {
  interface Window {
    google: any;
  }
}

export const loadGoogleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In script'));
    document.head.appendChild(script);
  });
};

export const getGoogleIdToken = async (clientId: string): Promise<string> => {
  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    const google = window.google;
    
    if (!google) {
      reject(new Error('Google Sign-In library not loaded'));
      return;
    }

    // Initialize Google Sign-In
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (response.credential) {
          resolve(response.credential);
        } else {
          reject(new Error('No credential received from Google'));
        }
      },
    });

    // Show the One Tap dialog
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed()) {
        // Fallback to button click if One Tap is not displayed
        reject(new Error('One Tap not displayed. Please click the Google Sign-In button.'));
      } else if (notification.isSkippedMoment()) {
        reject(new Error('User closed the One Tap dialog'));
      }
    });
  });
};

export const initGoogleButton = (
  elementId: string,
  clientId: string,
  onSuccess: (idToken: string) => void,
  onError: (error: Error) => void
) => {
  loadGoogleScript().then(() => {
    const google = window.google;
    
    if (!google) {
      onError(new Error('Google Sign-In library not loaded'));
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (response.credential) {
          onSuccess(response.credential);
        } else {
          onError(new Error('No credential received from Google'));
        }
      },
    });

    // Render the button
    google.accounts.id.renderButton(
      document.getElementById(elementId),
      {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'continue_with',
      }
    );
  }).catch(onError);
};
