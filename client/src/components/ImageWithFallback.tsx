import { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
}

export function ImageWithFallback({ 
  src, 
  alt, 
  fallbackText = "Image failed to load",
  className = "",
  ...props 
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when src changes to allow retry with new URL
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-muted text-muted-foreground ${className}`}
        data-testid="img-fallback"
        role="img"
        aria-label={alt}
      >
        <ImageOff className="w-8 h-8 mb-2" />
        <span className="text-xs text-center px-2">{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
