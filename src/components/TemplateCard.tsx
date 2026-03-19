import React from 'react';
import { Template } from '../types';
import { motion } from 'motion/react';

interface TemplateCardProps {
  template: Template;
  isSelected?: boolean;
  onSelect: (template: Template) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSelected,
  onSelect,
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onSelect(template)}
      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 ${
        isSelected ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-white/10 hover:border-white/30'
      }`}
    >
      <img
        src={template.imageURL}
        alt={template.title}
        className="w-full aspect-[3/4] object-cover"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
        <h3 className="text-white font-medium text-sm truncate">{template.title}</h3>
        <span className="text-white/60 text-xs uppercase tracking-wider">{template.category}</span>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </motion.div>
  );
};
