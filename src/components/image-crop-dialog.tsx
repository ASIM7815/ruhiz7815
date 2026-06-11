"use client";

import { useState, useRef, useCallback, useEffect, TouchEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, RotateCw, Move } from "lucide-react";

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
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState<{ x: number; y: number } | null>(null);
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Touch gesture handlers for mobile
  const getTouchDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Pinch gesture
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setLastPinchDistance(distance);
    } else if (e.touches.length === 1) {
      // Pan gesture
      setIsDragging(true);
      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && lastPinchDistance !== null) {
      // Pinch zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const delta = distance - lastPinchDistance;
      const zoomChange = delta * 0.005;
      setZoom(prev => Math.max(0.01, Math.min(1, prev + zoomChange)));
      setLastPinchDistance(distance);
    } else if (e.touches.length === 1 && isDragging && lastTouch) {
      // Pan
      e.preventDefault();
      const dx = e.touches[0].clientX - lastTouch.x;
      const dy = e.touches[0].clientY - lastTouch.y;
      setPositionX(prev => Math.max(-100, Math.min(100, prev + dx)));
      setPositionY(prev => Math.max(-100, Math.min(100, prev + dy)));
      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [isDragging, lastTouch, lastPinchDistance]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setLastTouch(null);
    setLastPinchDistance(null);
  }, []);

  const handleCrop = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      // Use high-resolution output (800x800) for better quality
      const outputSize = 800;
      canvas.width = outputSize;
      canvas.height = outputSize;

      // Enable high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.clearRect(0, 0, outputSize, outputSize);
      
      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      ctx.save();
      
      // Apply transformations
      ctx.translate(outputSize / 2 + positionX * 2, outputSize / 2 + positionY * 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Calculate dimensions to maintain aspect ratio
      const imgAspect = img.width / img.height;
      let drawWidth, drawHeight;

      if (imgAspect > 1) {
        // Landscape image
        drawWidth = outputSize * zoom;
        drawHeight = drawWidth / imgAspect;
      } else {
        // Portrait or square image
        drawHeight = outputSize * zoom;
        drawWidth = drawHeight * imgAspect;
      }

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Use high quality PNG encoding to preserve transparency for circular shape
      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      }, "image/png", 1.0);
    };

    img.src = imageSrc;
  }, [zoom, rotation, positionX, positionY, imageSrc, onCropComplete]);

  if (!mounted) {
    return null;
  }

  const transformStyle = `scale(${zoom}) rotate(${rotation}deg) translate(${positionX}px, ${positionY}px)`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-square touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
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
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
              <Move className="h-3 w-3" />
              <span>Pinch to zoom • Drag to move</span>
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
                min="0.01"
                max="1"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1%</span>
                <span>100%</span>
              </div>
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0°</span>
                <span>360°</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Horizontal
                  </label>
                  <span className="text-sm text-muted-foreground">{positionX}px</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={positionX}
                  onChange={(e) => setPositionX(parseInt(e.target.value))}
                  className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-100px</span>
                  <span>+100px</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Vertical
                  </label>
                  <span className="text-sm text-muted-foreground">{positionY}px</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={positionY}
                  onChange={(e) => setPositionY(parseInt(e.target.value))}
                  className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-100px</span>
                  <span>+100px</span>
                </div>
              </div>
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
