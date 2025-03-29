import React, { ReactNode, useEffect, useState } from 'react';
import { ConnectWallet, useAddress } from '@thirdweb-dev/react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const address = useAddress();
  const [isMobile, setIsMobile] = useState(false);

  // Check if viewport is mobile size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return (
    <div className={`app-container ${isMobile ? 'mobile-view' : ''}`}>
      <header className="header">
        <div className="header-left">
          {/* Logo removed */}
          <img 
            src="https://bafybeidoee5nze6v6s2kkddecqmtiahp7he4jcu3au7ju3e5z43ihpfp3a.ipfs.dweb.link?filename=dontkillthejamheadernew.png" 
            alt="Don't Kill The Jam Header" 
            className="header-image"
          />
        </div>
        <div className="header-right">
          <ConnectWallet className="connect-button" />
        </div>
      </header>
      <main className="main-content">
        {/* Show content regardless of wallet connection status */}
        {children}
      </main>
    </div>
  );
};

export default Layout; 