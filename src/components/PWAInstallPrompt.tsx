import React, { useState, useEffect } from 'react';
import { TreePine } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface BrowserInfo {
  name: string;
  isAndroid: boolean;
  isIOS: boolean;
  isMobile: boolean;
  supportsInstallPrompt: boolean;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>({
    name: 'unknown',
    isAndroid: false,
    isIOS: false,
    isMobile: false,
    supportsInstallPrompt: false
  });

  useEffect(() => {
    // Comprehensive browser detection
    const detectBrowser = (): BrowserInfo => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroid = /android/.test(userAgent);
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isMobile = isAndroid || isIOS || /mobile/.test(userAgent);
      
      let browserName = 'unknown';
      let supportsInstallPrompt = false;

      if (userAgent.includes('samsungbrowser')) {
        browserName = 'samsung';
        supportsInstallPrompt = true; // Samsung Internet supports beforeinstallprompt
      } else if (userAgent.includes('firefox')) {
        browserName = 'firefox';
        supportsInstallPrompt = false; // Firefox doesn't support beforeinstallprompt
      } else if (userAgent.includes('edg/') || userAgent.includes('edgios') || userAgent.includes('edga')) {
        browserName = 'edge';
        supportsInstallPrompt = !isIOS; // Edge supports it on Android, not iOS
      } else if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
        browserName = 'chrome';
        supportsInstallPrompt = true; // Chrome supports beforeinstallprompt
      } else if (userAgent.includes('safari') && isIOS) {
        browserName = 'safari';
        supportsInstallPrompt = false; // Safari uses different method
      } else if (userAgent.includes('crios')) {
        browserName = 'chrome-ios';
        supportsInstallPrompt = false; // Chrome on iOS behaves like Safari
      } else if (userAgent.includes('fxios')) {
        browserName = 'firefox-ios';
        supportsInstallPrompt = false; // Firefox on iOS behaves like Safari
      }

      return {
        name: browserName,
        isAndroid,
        isIOS,
        isMobile,
        supportsInstallPrompt
      };
    };

    // Check if app is already installed
    const checkIfInstalled = (): boolean => {
      // Check for standalone mode (installed PWA)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
      
      // Check for iOS standalone mode
      if ((window.navigator as any).standalone === true) {
        return true;
      }

      // Check if running in WebView or installed context
      if (document.referrer.includes('android-app://')) {
        return true;
      }

      return false;
    };

    const browser = detectBrowser();
    const installed = checkIfInstalled();
    
    setBrowserInfo(browser);
    setIsInstalled(installed);

    // Don't show prompt if already installed or not on mobile
    if (installed || !browser.isMobile) {
      return;
    }

    // Listen for the beforeinstallprompt event (Chrome, Samsung Internet, Edge Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after delay for browsers that support native prompt
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    if (browser.supportsInstallPrompt) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    } else {
      // For browsers without beforeinstallprompt (Safari iOS, Firefox, etc.)
      // Show manual prompt after delay
      setTimeout(() => {
        if (!installed && !sessionStorage.getItem('pwa-prompt-dismissed')) {
          setShowPrompt(true);
        }
      }, 3000);
    }

    return () => {
      if (browser.supportsInstallPrompt) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  // Get browser-specific install instructions
  const getInstallInstructions = (): string => {
    const { name, isIOS, isAndroid } = browserInfo;

    switch (name) {
      case 'safari':
        return 'Tap the Share button (↗️) at the bottom of your screen, then select "Add to Home Screen"';
      
      case 'chrome':
        if (isAndroid) {
          return 'Tap "Add to Home Screen" when prompted, or find "Install app" in the browser menu (⋮)';
        }
        return 'Tap "Add to Home Screen" when prompted';
      
      case 'chrome-ios':
        return 'Tap the Share button at the bottom, then select "Add to Home Screen"';
      
      case 'samsung':
        return 'Tap "Add page to" in the browser menu, then select "Home screen"';
      
      case 'firefox':
        if (isAndroid) {
          return 'Tap the menu (⋮) and select "Install" or "Add to Home Screen"';
        }
        return 'Look for "Install" in your browser menu';
      
      case 'firefox-ios':
        return 'Tap the Share button, then select "Add to Home Screen"';
      
      case 'edge':
        if (isAndroid) {
          return 'Tap "Add to phone" when prompted, or find "Apps" in the browser menu (⋯)';
        } else if (isIOS) {
          return 'Tap the Share button, then select "Add to Home Screen"';
        }
        return 'Look for "Install app" in your browser menu';
      
      default:
        if (isIOS) {
          return 'Tap the Share button in your browser, then select "Add to Home Screen"';
        } else if (isAndroid) {
          return 'Look for "Add to Home Screen" or "Install" in your browser menu';
        }
        return 'Look for "Add to Home Screen" or "Install" option in your browser';
    }
  };

  const getBrowserName = (): string => {
    const { name, isIOS } = browserInfo;
    
    switch (name) {
      case 'safari': return 'Safari';
      case 'chrome': return 'Chrome';
      case 'chrome-ios': return 'Chrome';
      case 'samsung': return 'Samsung Internet';
      case 'firefox': return 'Firefox';
      case 'firefox-ios': return 'Firefox';
      case 'edge': return 'Microsoft Edge';
      default: return isIOS ? 'Safari' : 'your browser';
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt && browserInfo.supportsInstallPrompt) {
      // Use native install prompt for supported browsers
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowPrompt(false);
        }
      } catch (error) {
        console.log('Install prompt failed:', error);
        showManualInstructions();
      }
    } else {
      // Show manual instructions for other browsers
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    const instructions = getInstallInstructions();
    const browserName = getBrowserName();
    
    alert(`To install Dalmore Reserve on your device:\n\n${instructions}\n\nThis will add the app to your home screen for quick access, even when offline!`);
    setShowPrompt(false);
  };

  const handleCancelClick = () => {
    setShowPrompt(false);
    // Remember user dismissed the prompt for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed, not mobile, or user dismissed
  if (isInstalled || !browserInfo.isMobile || !showPrompt || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  const browserName = getBrowserName();
  const hasNativePrompt = deferredPrompt && browserInfo.supportsInstallPrompt;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-4">
            <TreePine className="h-8 w-8 text-white" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Install Dalmore Reserve
          </h2>
          
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            Install this app on your home screen for quick and easy access when you're in the field. 
            Works offline and syncs when you're back online.
          </p>

          {!hasNativePrompt && (
            <p className="text-gray-500 text-xs mb-4 italic">
              Instructions for {browserName}
            </p>
          )}

          <div className="space-y-3">
            <button
              onClick={handleInstallClick}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
              style={{ minHeight: '48px' }}
            >
              <TreePine className="h-5 w-5" />
              {hasNativePrompt ? 'Install Now' : 'Show Instructions'}
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