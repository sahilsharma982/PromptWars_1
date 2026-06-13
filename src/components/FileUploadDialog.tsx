"use client";

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  onUploadSuccess: (data: any) => void;
}

export default function FileUploadDialog({ onUploadSuccess }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    const file = acceptedFiles[0];

    setTimeout(() => {
      setIsUploading(false);
      setIsSuccess(true);
      
      const mockData = {
        title: "Physics Assignment 3",
        events: [
          { title: "Review Chapter 4", date: new Date(Date.now() + 86400000), type: 'study' },
          { title: "Solve Problems 1-10", date: new Date(Date.now() + 86400000 * 2), type: 'study' },
        ]
      };
      
      setTimeout(() => {
        onUploadSuccess(mockData);
        setIsSuccess(false);
      }, 1500);
    }, 2500);
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg']} });

  return (
    <div className="mb-12">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#27272A] mb-3">Upload Syllabus</h3>
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragActive ? 'border-[#27272A] bg-[#F4F4F5]' : 'border-[#E4E4E7] hover:border-[#A1A1AA] hover:bg-[#FDFCF8]'
        }`}
      >
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-[#27272A]">
              <Loader2 className="w-6 h-6 animate-spin mb-3" />
              <p className="font-medium text-sm">Parsing document...</p>
            </motion.div>
          ) : isSuccess ? (
            <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-[#D97757]">
              <CheckCircle className="w-6 h-6 mb-3" />
              <p className="font-medium text-sm">Scheduled.</p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-[#71717A]">
              <UploadCloud className="w-6 h-6 mb-3 text-[#A1A1AA]" />
              <p className="font-medium text-sm mb-1 text-[#27272A]">Drag & drop or click to upload</p>
              <p className="text-xs">PDF, JPG, PNG</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
