
import React, { useRef, useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle, FilePlus, ShieldCheck } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert("Format Not Supported. Use PDF or JPG/PNG.");
      return;
    }
    setFileName(file.name);
    onFileUpload(file);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-4">
      <div
        className={`relative flex flex-col items-center justify-center w-full min-h-[180px] rounded-3xl border-2 border-dashed transition-all duration-300 ease-in-out ${
          dragActive
            ? "border-rose-500 bg-rose-50 scale-[1.02]"
            : "border-slate-200 bg-white hover:border-rose-400 hover:bg-slate-50"
        } ${isLoading ? "opacity-75 pointer-events-none" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept="image/*,application/pdf"
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
              <div className="absolute inset-0 bg-rose-400 blur-xl opacity-20 animate-pulse" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 leading-none mb-2">Cycle Active</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Decrypting Data Stream...</p>
            </div>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[200px]">{fileName}</p>
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Ingested Successfully</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center p-6 group">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                <FilePlus className="w-6 h-6 text-slate-400 group-hover:text-rose-600 transition-colors" />
            </div>
            <div>
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Source Ingest</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Drop PDF / Image</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Helper Info */}
      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed tracking-wider">
          System automatically cleans OCR noise and formats LaTeX math blocks. High-res images yield superior diagram extraction.
        </p>
      </div>
    </div>
  );
};

export default FileUpload;
