import React from 'react';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../page-renderer';
import { TrackableButton } from '../trackable-button';
import { SectionStyles, ThemeConfig } from '@/types';

interface Document {
  id: string;
  title: string;
  description?: string;
  url: string;
  fileType?: string;
}

interface DocumentsData {
  title?: string;
  documents: Document[];
}

interface DocumentsSectionProps {
  data: DocumentsData;
  business: BusinessData;
  pageId: string;
  sectionId: string;
  styles?: SectionStyles;
}

const getFileIcon = (theme: ThemeConfig, fileType?: string) => {
  const type = fileType?.toLowerCase();

  if (type?.includes('pdf')) {
    return (
      <svg className="w-10 h-10" style={{ color: '#EF4444' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    );
  }

  if (type?.includes('doc') || type?.includes('word')) {
    return (
      <svg className="w-10 h-10" style={{ color: '#2563EB' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    );
  }

  return (
    <svg className="w-10 h-10" style={{ color: '#6B7280' }} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  );
};

export function DocumentsSection({ data, pageId, sectionId, styles }: DocumentsSectionProps) {
  const { title, documents } = data;
  const theme = useTheme();

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <section className="py-20 px-4" style={{ backgroundColor: styles?.background || theme.background }}>
      <div className="max-w-6xl mx-auto">
        {title && (
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-5xl font-bold mb-6"
              style={{ color: styles?.text?.primary || theme.text.primary }}
            >
              {title}
            </h2>
          </div>
        )}

                 <div className="flex flex-wrap justify-center gap-8">
           {documents.map((document) => (
             <TrackableButton
               key={document.id}
               href={document.url}
               pageId={pageId}
               sectionId={sectionId}
               eventType="link_click"
               eventData={{
                 document_title: document.title,
                 document_url: document.url,
                 file_type: document.fileType
               }}
                               className="group relative overflow-hidden px-6 py-6 rounded-xl border-2 transition-all duration-300 hover:shadow-xl cursor-pointer min-h-[80px] flex flex-col w-full max-w-sm md:max-w-md block text-decoration-none"
               style={{ 
                 backgroundColor: styles?.surface || theme.surface,
                 borderColor: 'rgba(0, 0, 0, 0.1)',
                 color: styles?.text?.primary || theme.text.primary
               }}
               target="_blank"
             >
                             <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getFileIcon(theme, document.fileType)}
                </div>
                <div className="flex-1">
                  <h3
                    className="font-semibold text-lg md:text-xl leading-tight mb-3"
                    style={{ color: styles?.text?.primary || theme.text.primary }}
                  >
                    {document.title}
                  </h3>
                                     {document.description && (
                     <p
                       className="text-base leading-relaxed mt-2"
                       style={{ color: styles?.text?.secondary || theme.text.secondary }}
                     >
                       {document.description}
                     </p>
                   )}
                </div>
              </div>
              
                             

                             {/* Enhanced hover effect with gradient overlay */}
               <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-white/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
             </TrackableButton>
           ))}
         </div>
      </div>
    </section>
  );
} 