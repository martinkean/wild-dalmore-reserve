import React, { useState, useEffect } from 'react';
import { TreePine, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check for standalone mode (installed PWA)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // Check for iOS standalone mode
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }

      // Check if running in WebView or installed context
      if (document.referrer.includes('android-app://')) {
        setIsInstalled(true);
        return;
      }
    };

    // Check if device is mobile
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    checkIfInstalled();
    checkIfMobile();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a small delay if not installed and on mobile
      setTimeout(() => {
        if (!isInstalled && isMobile) {
          setShowPrompt(true);
        }
      }, 2000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS devices, show prompt manually since beforeinstallprompt doesn't fire
    if (isMobile && !isInstalled) {
      const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
      const isInStandaloneMode = (window.navigator as any).standalone;
      
      if (isIOS && !isInStandaloneMode) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 2000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, isMobile]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // For Android and supported browsers
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else {
      // For iOS and other browsers, show instructions
      const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
      if (isIOS) {
        alert('To install this app on your iOS device, tap the Share button in Safari and select "Add to Home Screen"');
      } else {
        alert('To install this app, look for the "Add to Home Screen" option in your browser menu');
      }
      setShowPrompt(false);
    }
  };

  const handleCancelClick = () => {
    setShowPrompt(false);
    // Remember user dismissed the prompt for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed, not mobile, or user dismissed this session
  if (isInstalled || !isMobile || !showPrompt || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center">
          {/* TreePine Icon */}
          <div className="mx-auto w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-4">
            <TreePine className="h-8 w-8 text-white" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Install Dalmore Reserve
          </h2>
          
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Install this app on your home screen for quick and easy access when you're in the field. 
            Works offline and syncs when you're back online.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleInstallClick}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
              style={{ minHeight: '48px' }}
            >
              <TreePine className="h-5 w-5" />
              Add to Home Screen
            </button>
            
            <button
              onClick={handleCancelClick}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 font-medium"
              style={{ minHeight: '48px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};