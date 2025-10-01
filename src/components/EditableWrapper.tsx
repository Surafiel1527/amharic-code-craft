import { ReactElement, cloneElement, useState } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';

interface EditableWrapperProps {
  componentName: string;
  children: ReactElement;
}

/**
 * EditableWrapper - Enables visual point-and-click editing of components
 * 
 * When Edit Mode is active:
 * - Shows a dashed blue outline on hover
 * - Allows clicking to select the component for editing
 * - Displays component name on hover
 */
export function EditableWrapper({ componentName, children }: EditableWrapperProps) {
  const { isEditMode, selectedComponent, setSelectedComponent } = useEditMode();
  const [isHovered, setIsHovered] = useState(false);
  
  const isSelected = selectedComponent === componentName;

  if (!isEditMode) {
    return children;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedComponent(componentName);
    console.log('Selected component:', componentName);
  };

  const wrapperClassName = `
    relative cursor-pointer transition-all
    ${isHovered || isSelected ? 'ring-2 ring-blue-500 ring-dashed' : ''}
    ${isSelected ? 'ring-offset-2' : ''}
  `.trim();

  return (
    <div
      className={wrapperClassName}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Component name label on hover */}
      {(isHovered || isSelected) && (
        <div className="absolute -top-6 left-0 z-50 bg-blue-500 text-white text-xs px-2 py-1 rounded pointer-events-none">
          {componentName}
        </div>
      )}
      {children}
    </div>
  );
}
