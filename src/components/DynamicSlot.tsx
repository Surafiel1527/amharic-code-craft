import { ReactNode } from 'react';
import { useDynamicCustomizations } from '@/hooks/useDynamicCustomizations';

interface DynamicSlotProps {
  name: string;
  fallback?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * DynamicSlot - Renders AI-customized content in designated slots
 * 
 * Usage:
 * <DynamicSlot name="header-actions" fallback={<DefaultContent />} />
 * 
 * The AI can inject new content into these slots by targeting the slot name
 */
export function DynamicSlot({ name, fallback, children, className }: DynamicSlotProps) {
  const { getDynamicContent, getDynamicStyles } = useDynamicCustomizations();
  
  const dynamicContent = getDynamicContent(name);
  const dynamicStyles = getDynamicStyles(name);
  
  // If AI has provided content for this slot, render it
  if (dynamicContent && dynamicContent.length > 0) {
    return (
      <div className={`dynamic-slot-${name} ${dynamicStyles} ${className || ''}`}>
        {dynamicContent.map((mod, index) => (
          <div key={index} dangerouslySetInnerHTML={{ __html: mod.content || '' }} />
        ))}
      </div>
    );
  }
  
  // Otherwise render fallback or children
  return (
    <div className={`dynamic-slot-${name} ${dynamicStyles} ${className || ''}`}>
      {children || fallback}
    </div>
  );
}

