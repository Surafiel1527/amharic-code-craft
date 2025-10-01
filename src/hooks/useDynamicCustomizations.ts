import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Customization {
  id: string;
  customization_type: string;
  applied_changes: any; // JSON from database
  applied_at: string | null;
}

interface DynamicModification {
  type: 'add' | 'modify' | 'remove' | 'hide' | 'show';
  target: string;
  styles?: string;
  content?: string;
  props?: Record<string, any>;
  order?: number;
  visibility?: boolean;
  component?: string;
}

export const useDynamicCustomizations = () => {
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomizations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-customizations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_customizations',
          filter: 'status=eq.applied'
        },
        () => {
          loadCustomizations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCustomizations = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_customizations')
        .select('*')
        .eq('status', 'applied')
        .order('applied_at', { ascending: false });

      if (error) throw error;
      console.log('📦 Loaded customizations:', data);
      setCustomizations(data || []);
    } catch (error) {
      console.error('Error loading customizations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate dynamic styles from customizations
  const getDynamicStyles = (component: string) => {
    const styles: string[] = [];
    
    console.log(`🎨 Getting styles for component: "${component}"`);
    console.log(`📚 Available customizations:`, customizations.length);
    
    customizations.forEach(custom => {
      try {
        const changes = custom.applied_changes;
        console.log(`   Checking customization:`, {
          component: changes?.component,
          target: changes?.target,
          hasModifications: !!changes?.modifications,
          hasDirectStyles: !!changes?.styles,
          fullChanges: changes
        });
        
        // Check if the component matches directly or if modifications target this component
        if (changes?.component === component || changes?.target === component) {
          console.log(`   ✅ Match found for "${component}"`);
          if (changes?.modifications) {
            changes.modifications.forEach((mod: any) => {
              if (mod.styles) {
                console.log(`      Adding styles from modification:`, mod.styles);
                styles.push(mod.styles);
              }
            });
          } else if (changes?.styles) {
            // Handle direct styles on changes object
            console.log(`      Adding direct styles:`, changes.styles);
            styles.push(changes.styles);
          }
        }
      } catch (e) {
        console.error('Error parsing customization:', e);
      }
    });

    const result = styles.length > 0 ? styles.join(' ') : '';
    console.log(`🎨 Final styles for "${component}":`, result);
    return result;
  };

  // Get dynamic content modifications
  const getDynamicContent = (slotName: string): DynamicModification[] => {
    const modifications: DynamicModification[] = [];
    
    customizations.forEach(custom => {
      try {
        const changes = custom.applied_changes;
        if (changes?.component === slotName && changes?.modifications) {
          changes.modifications.forEach((mod: any) => {
            if (mod.type === 'modify' || mod.type === 'add') {
              modifications.push(mod as DynamicModification);
            }
          });
        }
      } catch (e) {
        console.error('Error parsing customization:', e);
      }
    });

    return modifications;
  };

  // Get visibility state for a component
  const isVisible = (componentName: string): boolean => {
    let visible = true;
    
    customizations.forEach(custom => {
      try {
        const changes = custom.applied_changes;
        if (changes?.component === componentName && changes?.modifications) {
          changes.modifications.forEach((mod: any) => {
            if (mod.type === 'hide') {
              visible = false;
            } else if (mod.type === 'show') {
              visible = true;
            }
          });
        }
      } catch (e) {
        console.error('Error parsing customization:', e);
      }
    });

    return visible;
  };

  // Get dynamic props for a component
  const getDynamicProps = (componentName: string): Record<string, any> => {
    const props: Record<string, any> = {};
    
    customizations.forEach(custom => {
      try {
        const changes = custom.applied_changes;
        if (changes?.component === componentName && changes?.modifications) {
          changes.modifications.forEach((mod: any) => {
            if (mod.props) {
              Object.assign(props, mod.props);
            }
          });
        }
      } catch (e) {
        console.error('Error parsing customization:', e);
      }
    });

    return props;
  };

  // Get sort order for components
  const getOrder = (componentName: string): number | undefined => {
    let order: number | undefined;
    
    customizations.forEach(custom => {
      try {
        const changes = custom.applied_changes;
        if (changes?.component === componentName && changes?.modifications) {
          changes.modifications.forEach((mod: any) => {
            if (mod.order !== undefined) {
              order = mod.order;
            }
          });
        }
      } catch (e) {
        console.error('Error parsing customization:', e);
      }
    });

    return order;
  };

  return {
    customizations,
    loading,
    getDynamicStyles,
    getDynamicContent,
    isVisible,
    getDynamicProps,
    getOrder
  };
};
