"use client";

import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  const imageRef = useRef<HTMLImageElement>(null);

  const handleCrop = useCallback(async () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const image = imageRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size for profile picture (400x400)
    const size = 400;
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Save context state
    ctx.save();

    // Move to center
    ctx.translate(size / 2, size / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate scaled dimensions
    const scaledSize = size * zoom;

    // Draw image centered
    ctx.drawImage(
      image,
      -scaledSize / 2,
      -scaledSize / 2,
      scaledSize,
      scaledSize
    );

    // Restore context
    ctx.restore();

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, "image/jpeg", 0.92);
  }, [zoom, rotation, onCropComplete]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Area */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-square">
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="max-w-full max-h-full object-contain"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
                crossOrigin="anonymous"
              />
            </div>
            {/* Crop overlay circle */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/40" />
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg"
                style={{ width: "80%", paddingBottom: "80%" }}
              />
            </div>
          </div>

          {/* Hidden canvas for cropping */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
                  Zoom
                </label>
                <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
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
              <Slider
                value={[rotation]}
                onValueChange={([value]) => setRotation(value)}
                min={0}
                max={360}
                step={15}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCrop}>
            Apply & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
