// Context for sharing page data across view-page components
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnail?: string;
}

interface ViewPageContextData {
  companyName: string;
  mediaItems: MediaItem[];
  setCompanyName: (name: string) => void;
  setMediaItems: (items: MediaItem[]) => void;
}

const ViewPageContext = createContext<ViewPageContextData | undefined>(undefined);

export const ViewPageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [companyName, setCompanyName] = useState<string>('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  return (
    <ViewPageContext.Provider
      value={{
        companyName,
        mediaItems,
        setCompanyName,
        setMediaItems,
      }}
    >
      {children}
    </ViewPageContext.Provider>
  );
};

export const useViewPage = () => {
  const context = useContext(ViewPageContext);
  if (!context) {
    throw new Error('useViewPage must be used within ViewPageProvider');
  }
  return context;
};
