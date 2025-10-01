import { ReactElement, cloneElement } from 'react';
import { useDynamicCustomizations } from '@/hooks/useDynamicCustomizations';
import { EditableWrapper } from './EditableWrapper';

interface DynamicComponentProps {
  name: string;
  children: ReactElement;
  defaultOrder?: number;
}

/**
 * DynamicComponent - Wraps components to apply AI-modified props and ordering
 * 
 * Usage:
 * <DynamicComponent name="StatsCard1" defaultOrder={1}>
 *   <Card>...</Card>
 * </DynamicComponent>
 * 
 * The AI can:
 * - Modify props (e.g., change button variant, add className)
 * - Change order (e.g., move a card to first position)
 */
export function DynamicComponent({ name, children, defaultOrder = 0 }: DynamicComponentProps) {
  const { getDynamicProps, getOrder, getDynamicStyles } = useDynamicCustomizations();
  
  // Get dynamic props from AI
  const dynamicProps = getDynamicProps(name);
  
  // Get order for sorting (if parent handles ordering)
  const order = getOrder(name) ?? defaultOrder;
  
  // Get dynamic styles
  const dynamicStyles = getDynamicStyles(name);
  
  // Merge dynamic props with existing props, being careful not to override critical props
  const mergedProps: Record<string, any> = {
    'data-order': order, // Add order as data attribute for parent sorting
  };
  
  // Merge className carefully
  if (dynamicStyles || dynamicProps.className) {
    mergedProps.className = `${children.props.className || ''} ${dynamicStyles} ${dynamicProps.className || ''}`.trim();
  }
  
  // Add dynamic props, but NEVER override event handlers or critical props
  Object.keys(dynamicProps).forEach(key => {
    // Skip className (handled above), event handlers, and critical props
    if (key === 'className' || key.startsWith('on') || key === 'ref' || key === 'key') {
      return;
    }
    // Only add if it doesn't exist or if it's explicitly allowed to override
    if (children.props[key] === undefined || key === 'variant' || key === 'size') {
      mergedProps[key] = dynamicProps[key];
    }
  });
  
  // Clone the child element with merged props
  const modifiedChild = cloneElement(children, mergedProps);
  
  // Wrap in EditableWrapper for visual editing mode
  return (
    <EditableWrapper componentName={name}>
      {modifiedChild}
    </EditableWrapper>
  );
}
