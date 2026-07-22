import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StoriesCarouselProps {
  story: {
    id: string;
    user: { fullName: string; profilePhoto: string; username: string };
    storyType: 'text' | 'image' | 'video';
    content: string;
    backgroundColor?: string;
    caption?: string;
    createdAt: Date;
  } | null;
  onClose: () => void;
}

export const StoriesCarousel: React.FC<StoriesCarouselProps> = ({ story, onClose }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!story) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 1;
      });
    }, 50); // Total 5 seconds

    return () => clearInterval(interval);
  }, [story]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md text-white select-none">
      
      {/* Visualizer card */}
      <div className="relative w-full max-w-[440px] h-full md:h-[700px] md:rounded-3xl bg-[#090a10] border border-gray-800 flex flex-col justify-between overflow-hidden shadow-2xl p-6">
        
        {/* Progress Bar Header */}
        <div className="absolute top-4 inset-x-6 z-20">
          <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all duration-75" style={{ width: `${progress}%` }} />
          </div>

          {/* User profile header overlay */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 flex items-center justify-center font-bold text-xs">
                {story.user.fullName.charAt(0)}
              </div>
              <div>
                <h4 className="text-xs font-semibold">{story.user.fullName}</h4>
                <p className="text-[9px] text-gray-500">
                  {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <button onClick={onClose} className="p-1 rounded-lg bg-gray-800/30 hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Visual Feed */}
        <div 
          className="flex-1 flex items-center justify-center p-6 text-center rounded-2xl mt-16"
          style={{ 
            backgroundColor: story.storyType === 'text' ? story.backgroundColor || '#1E1B4B' : 'transparent' 
          }}
        >
          {story.storyType === 'text' ? (
            <motion.p 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-bold font-sans tracking-wide max-w-[85%] leading-relaxed"
            >
              {story.content}
            </motion.p>
          ) : (
            <img src={story.content} alt="Story Content" className="max-h-full max-w-full object-contain rounded-xl" />
          )}
        </div>

        {/* Caption */}
        {story.caption && (
          <div className="p-4 text-center text-xs text-gray-300 z-10">
            {story.caption}
          </div>
        )}

      </div>

    </div>
  );
};
export default StoriesCarousel;
