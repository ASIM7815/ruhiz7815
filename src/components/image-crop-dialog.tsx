"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, RotateCw } from "lucide-react";

interface ImageCropDialogProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImage: Blob) => void;
}

export function ImageCropDialog({
  open,
  onClose,
  imageSrc,
  onCropComplete,
}: ImageCropDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleCrop = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const size = 400;
      canvas.width = size;
      canvas.height = size;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      const scaledSize = size * zoom;
      ctx.drawImage(img, -scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      }, "image/jpeg", 0.92);
    };

    img.src = imageSrc;
  }, [zoom, rotation, imageSrc, onCropComplete]);

  if (!mounted) {
    return null;
  }

  const transformStyle = `scale(${zoom}) rotate(${rotation}deg)`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-square">
            <div className="absolute inset-0 flex items-center justify-center p-4">
              {imageSrc && (
                <div
                  className="max-w-full max-h-full transition-transform duration-200 ease-out"
                  style={{ transform: transformStyle }}
                >
                  <img
                    src={imageSrc}
                    alt="Crop preview"
                    onLoad={() => setImageLoaded(true)}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
            </div>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg w-4/5 aspect-square" />
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
                  Zoom
                </label>
                <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <RotateCw className="h-4 w-4" />
                  Rotation
                </label>
                <span className="text-sm text-muted-foreground">{rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={!imageLoaded}>
            Apply & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
