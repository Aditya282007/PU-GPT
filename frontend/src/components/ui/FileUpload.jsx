import { useState, useCallback, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function FileUpload({ 
  onUpload, 
  accept = ['.pdf', '.docx', '.txt'],
  maxSize = 10 * 1024 * 1024,
  additionalFields = {},
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (f) => {
    if (f.size > maxSize) {
      return `File size exceeds ${maxSize / (1024 * 1024)}MB limit`;
    }
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(f.type)) {
      return 'Only PDF, DOCX, and TXT files are allowed';
    }
    return null;
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(f);
    setError(null);
    setSuccess(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-amber-chalk', 'bg-amber-chalk/5');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('border-amber-chalk', 'bg-amber-chalk/5');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-amber-chalk', 'bg-amber-chalk/5');
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect({ target: { files: [f] } });
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(additionalFields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      await onUpload(formData, (progressEvent) => {
        if (progressEvent.lengthComputable) {
          setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        }
      });

      setSuccess(true);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          file 
            ? 'border-rule-line bg-rule-line/20' 
            : 'border-rule-line hover:border-amber-chalk/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept.join(',')}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        {file ? (
          <div className="flex items-center justify-center gap-4 p-4 bg-chalkboard/50 rounded-lg border border-rule-line">
            <File className="w-10 h-10 text-amber-chalk flex-shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <p className="font-medium text-chalk truncate">{file.name}</p>
              <p className="text-sm text-chalk/50">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="p-2 text-chalk/50 hover:text-rust hover:bg-rust/10 rounded-lg transition-colors"
              aria-label="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-12 h-12 text-chalk/40 mx-auto" />
            <p className="text-chalk/60">Drag & drop your file here, or click to browse</p>
            <p className="text-xs text-chalk/40">PDF, DOCX, TXT up to {maxSize / (1024 * 1024)}MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rust/10 border border-rust/30 rounded-lg text-rust text-sm" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-sage/10 border border-sage/30 rounded-lg text-sage text-sm" role="status">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          File uploaded successfully! Processing will begin shortly.
        </div>
      )}

      {uploading && (
        <div className="space-y-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="flex justify-between text-sm text-chalk/60">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-rule-line rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-chalk transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!file && !uploading && !success && (
        <Button type="submit" disabled className="w-full opacity-50 cursor-not-allowed">
          Add to library
        </Button>
      )}

      {file && !uploading && !success && (
        <Button type="submit" className="w-full">
          <Upload className="w-4 h-4" />
          Add to library
        </Button>
      )}
    </form>
  );
}

function Button({ children, type = 'button', disabled, className = '', ...props }) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-chalk focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = 'bg-amber-chalk text-chalkboard hover:bg-amber-chalk/90 active:bg-amber-chalk';
  
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}