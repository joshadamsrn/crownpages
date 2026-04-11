"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-md" }: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            dialog.showModal();
        } else {
            dialog.close();
        }

        const handleClose = () => onClose();
        dialog.addEventListener('close', handleClose);

        return () => {
            dialog.removeEventListener('close', handleClose);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <dialog
            ref={dialogRef}
            className="backdrop:bg-black/50 p-0 rounded-lg shadow-xl border"
            onClick={(e) => {
                if (e.target === dialogRef.current) {
                    onClose();
                }
            }}
        >
            <div className={`bg-white dark:bg-gray-900 ${maxWidth} w-full p-6`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                {children}
            </div>
        </dialog>
    );
} 