'use client';

import React, { useState } from 'react';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../page-renderer';
import { SectionStyles } from '@/types';

interface Question {
  id: string;
  question: string;
  answer: string;
}

interface FAQData {
  title?: string;
  questions: Question[];
}

interface FAQSectionProps {
  data: FAQData;
  business: BusinessData;
  pageId: string;
  sectionId: string;
  styles?: SectionStyles;
}

export function FAQSection({ data, styles }: FAQSectionProps) {
  const { title, questions } = data;
  const theme = useTheme();
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());

  if (!questions || questions.length === 0) {
    return null;
  }

  const toggleQuestion = (questionId: string) => {
    const newOpenQuestions = new Set(openQuestions);
    if (newOpenQuestions.has(questionId)) {
      newOpenQuestions.delete(questionId);
    } else {
      newOpenQuestions.add(questionId);
    }
    setOpenQuestions(newOpenQuestions);
  };

  return (
    <section className="py-16 px-4" style={{ backgroundColor: styles?.surface || theme.surface }}>
      <div className="max-w-4xl mx-auto">
        {title && (
          <h2 
            className="text-3xl md:text-4xl font-bold mb-12 text-center"
            style={{ color: styles?.text?.primary || theme.text.primary }}
          >
            {title}
          </h2>
        )}
        
        <div className="space-y-4">
          {questions.map((q) => {
            const isOpen = openQuestions.has(q.id);
            return (
              <div 
                key={q.id} 
                className="rounded-lg shadow-md overflow-hidden"
                style={{ backgroundColor: styles?.background || theme.background }}
              >
                <button
                  className="w-full px-6 py-4 text-left flex justify-between items-center transition-colors"
                  style={{ color: styles?.text?.primary || theme.text.primary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.surface}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => toggleQuestion(q.id)}
                >
                  <span className="font-semibold pr-4">
                    {q.question}
                  </span>
                  <svg
                    className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: styles?.text?.muted || theme.text.muted }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-6 pb-4">
                    <p 
                      className="leading-relaxed"
                      style={{ color: styles?.text?.secondary || theme.text.secondary }}
                    >
                      {q.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
} 