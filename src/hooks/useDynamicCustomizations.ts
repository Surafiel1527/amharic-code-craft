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
      console.log('🔄 LOADING CUSTOMIZATIONS...');
      const { data, error } = await supabase
        .from('admin_customizations')
        .select('*')
        .eq('status', 'applied')
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading customizations:', error);
        throw error;
      }
      
      console.log('📦 LOADED CUSTOMIZATIONS:', {
        count: data?.length || 0,
        data: data
      });
      
      setCustomizations(data || []);
    } catch (error) {
      console.error('❌ FATAL Error loading customizations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate dynamic styles from customizations
  const getDynamicStyles = (component: string) => {
    console.log(`\n🎨 ========== GET DYNAMIC STYLES ==========`);
    console.log(`🎯 Looking for component: "${component}"`);
    console.log(`📚 Total customizations available: ${customizations.length}`);
    
    const styles: string[] = [];
    
    customizations.forEach((custom, index) => {
      try {
        const changes = custom.applied_changes;
        console.log(`\n   [${index + 1}/${customizations.length}] Checking customization:`);
        console.log(`   - ID: ${custom.id}`);
        console.log(`   - Type: ${custom.customization_type}`);
        console.log(`   - Component in changes: "${changes?.component}"`);
        console.log(`   - Target in changes: "${changes?.target}"`);
        console.log(`   - Has modifications: ${!!changes?.modifications}`);
        console.log(`   - Full changes object:`, JSON.stringify(changes, null, 2));
        
        // Check if the component matches
        const componentMatches = changes?.component === component;
        const targetMatches = changes?.target === component;
        
        console.log(`   - Component match: ${componentMatches}`);
        console.log(`   - Target match: ${targetMatches}`);
        
        if (componentMatches || targetMatches) {
          console.log(`   ✅ MATCH FOUND!`);
          
          if (changes?.modifications && Array.isArray(changes.modifications)) {
            console.log(`   - Processing ${changes.modifications.length} modifications...`);
            changes.modifications.forEach((mod: any, modIndex: number) => {
              console.log(`      Modification [${modIndex + 1}]:`, mod);
              if (mod.styles) {
                console.log(`      ✅ Adding styles: "${mod.styles}"`);
                styles.push(mod.styles);
              } else {
                console.log(`      ⚠️ No styles in this modification`);
              }
            });
          } else if (changes?.styles) {
            console.log(`   ✅ Adding direct styles: "${changes.styles}"`);
            styles.push(changes.styles);
          } else {
            console.log(`   ⚠️ No styles found in this customization`);
          }
        } else {
          console.log(`   ❌ No match`);
        }
      } catch (e) {
        console.error(`   ❌ Error parsing customization:`, e);
      }
    });

    const result = styles.length > 0 ? styles.join(' ') : '';
    console.log(`\n🎨 ========== RESULT ==========`);
    console.log(`Final styles for "${component}": "${result}"`);
    console.log(`==========================================\n`);
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
