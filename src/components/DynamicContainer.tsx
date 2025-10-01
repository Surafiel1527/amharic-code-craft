import { ReactElement, Children, isValidElement } from 'react';

interface DynamicContainerProps {
  children: ReactElement | ReactElement[];
  className?: string;
}

/**
 * DynamicContainer - Automatically sorts children by their data-order attribute
 * 
 * Usage:
 * <DynamicContainer className="grid gap-4">
 *   <DynamicComponent name="Card1" defaultOrder={1}>...</DynamicComponent>
 *   <DynamicComponent name="Card2" defaultOrder={2}>...</DynamicComponent>
 * </DynamicContainer>
 * 
 * The AI can change the order and this container will automatically re-sort
 */
export function DynamicContainer({ children, className }: DynamicContainerProps) {
  // Convert children to array and filter valid elements
  const childArray = Children.toArray(children).filter(
    (child): child is ReactElement => isValidElement(child)
  );
  
  // Sort by data-order attribute
  const sortedChildren = [...childArray].sort((a, b) => {
    const orderA = typeof a.props['data-order'] === 'number' ? a.props['data-order'] : 0;
    const orderB = typeof b.props['data-order'] === 'number' ? b.props['data-order'] : 0;
    return orderA - orderB;
  });
  
  return <div className={className}>{sortedChildren}</div>;
}
