import React, { useRef, useEffect } from 'react';
import { Template, UserProfile } from '../types';

interface PosterCanvasProps {
  template: Template;
  userProfile: UserProfile;
  userPhoto?: string; // base64 or URL
  onGenerated?: (dataUrl: string) => void;
}

export const PosterCanvas: React.FC<PosterCanvasProps> = ({
  template,
  userProfile,
  userPhoto,
  onGenerated,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const draw = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load images
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      try {
        // 1. Draw Template Background
        const bgImg = await loadImage(template.imageURL);
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;
        ctx.drawImage(bgImg, 0, 0);

        // 2. Draw Placeholders
        for (const placeholder of template.placeholders) {
          if (placeholder.type === 'image') {
            if (placeholder.key === 'userPhoto' && userPhoto) {
              const photoImg = await loadImage(userPhoto);
              // Draw image within placeholder bounds
              // Maintain aspect ratio or stretch? Let's stretch for now or fit
              ctx.drawImage(
                photoImg,
                placeholder.x,
                placeholder.y,
                placeholder.width,
                placeholder.height
              );
            } else if (placeholder.key === 'logo' && userProfile.logoURL) {
              const logoImg = await loadImage(userProfile.logoURL);
              ctx.drawImage(
                logoImg,
                placeholder.x,
                placeholder.y,
                placeholder.width,
                placeholder.height
              );
            }
          } else if (placeholder.type === 'text') {
            const textValue = userProfile[placeholder.key as keyof UserProfile] || placeholder.label;
            ctx.font = `${placeholder.fontSize || 24}px sans-serif`;
            ctx.fillStyle = placeholder.color || '#000000';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(String(textValue), placeholder.x, placeholder.y);
          }
        }

        // 3. Notify parent
        if (onGenerated) {
          onGenerated(canvas.toDataURL('image/png'));
        }
      } catch (error) {
        console.error('Error drawing canvas:', error);
      }
    };

    draw();
  }, [template, userProfile, userPhoto, onGenerated]);

  return (
    <div className="relative w-full max-w-lg mx-auto overflow-hidden rounded-xl shadow-2xl border border-white/10 bg-black/20">
      <canvas
        ref={canvasRef}
        className="w-full h-auto block"
      />
    </div>
  );
};
