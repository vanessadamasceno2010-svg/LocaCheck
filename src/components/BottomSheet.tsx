import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet-handle" />
        <div className="px-5 pb-6">
          {title && (
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-gray-100 text-gray-600 active:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
