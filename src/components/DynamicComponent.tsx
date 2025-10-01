import { ReactElement, cloneElement } from 'react';
import { useDynamicCustomizations } from '@/hooks/useDynamicCustomizations';

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
  
  // Merge dynamic props with existing props
  const mergedProps = {
    ...dynamicProps,
    className: `${children.props.className || ''} ${dynamicStyles}`.trim(),
    'data-order': order, // Add order as data attribute for parent sorting
  };
  
  // Clone the child element with merged props
  return cloneElement(children, mergedProps);
}
