import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Customization {
  id: string;
  customization_type: string;
  applied_changes: any; // JSON from database
  applied_at: string | null;
  status: string;
  created_at: string;
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

export const useDynamicCustomizations = (previewMode = false, snapshotId?: string, currentRoute?: string) => {
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomizations();

    // Subscribe to real-time updates (any status changes)
    // Don't subscribe when in snapshot preview mode
    if (!snapshotId) {
      const channel = supabase
        .channel('admin-customizations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'admin_customizations'
          },
          () => {
            console.log('🔔 Realtime update received, reloading customizations');
            loadCustomizations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [previewMode, snapshotId, currentRoute]);

  const loadCustomizations = async () => {
    try {
      console.log('🔄 LOADING CUSTOMIZATIONS...', { previewMode, snapshotId });
      
      // If snapshot preview mode, load from snapshot
      if (snapshotId) {
        console.log('📸 SNAPSHOT PREVIEW MODE: Loading from snapshot', snapshotId);
        const { data: snapshot, error } = await supabase
          .from('customization_snapshots')
          .select('customizations')
          .eq('id', snapshotId)
          .single();

        if (error) {
          console.error('❌ Error loading snapshot:', error);
          throw error;
        }

        // Convert snapshot customizations to the format we need
        const snapshotCustomizations = Array.isArray(snapshot.customizations) 
          ? snapshot.customizations.map((c: any) => ({
              id: c.id || crypto.randomUUID(),
              customization_type: c.customization_type || 'unknown',
              applied_changes: c.applied_changes || {},
              applied_at: c.applied_at || c.created_at,
              status: 'applied', // Treat all snapshot customizations as applied
              created_at: c.created_at || new Date().toISOString()
            }))
          : [];

        console.log('📦 LOADED SNAPSHOT CUSTOMIZATIONS:', {
          snapshotId,
          count: snapshotCustomizations.length,
          data: snapshotCustomizations
        });

        setCustomizations(snapshotCustomizations);
        setLoading(false);
        return;
      }
      
      // In preview mode, load BOTH pending AND applied customizations
      // Otherwise, only load applied ones
      let query = supabase
        .from('admin_customizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (previewMode) {
        console.log('🔍 PREVIEW MODE: Loading pending + applied');
        // Load pending AND applied (pending will override applied)
        query = query.in('status', ['pending', 'applied']);
      } else {
        console.log('✅ NORMAL MODE: Loading only applied');
        // Only load applied customizations
        query = query.eq('status', 'applied');
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error loading customizations:', error);
        throw error;
      }
      
      console.log('📦 LOADED CUSTOMIZATIONS:', {
        previewMode,
        count: data?.length || 0,
        currentRoute,
        data: data
      });
      
      // Filter customizations by current route (page)
      // A customization applies if its page matches the current route OR if it's marked as "global"
      let filteredData = data || [];
      if (currentRoute) {
        filteredData = (data || []).filter((c: any) => {
          const custPage = c.applied_changes?.page;
          return custPage === currentRoute || custPage === 'global' || !custPage;
        });
        console.log(`🔍 Filtered to ${filteredData.length} customizations for route: ${currentRoute}`);
      }
      
      setCustomizations(filteredData);
    } catch (error) {
      console.error('❌ FATAL Error loading customizations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert Tailwind gradient classes to inline CSS
  const convertTailwindToInlineStyles = (tailwindClasses: string): CSSProperties => {
    const styles: CSSProperties = {};
    
    // Check for solid background colors first
    if (tailwindClasses.includes('bg-black')) {
      styles.background = '#000000';
      styles.color = '#ffffff'; // white text on black
      return styles;
    }
    if (tailwindClasses.includes('bg-white')) {
      styles.background = '#ffffff';
      styles.color = '#000000'; // black text on white
      return styles;
    }
    
    // Helper function to extract color (supports both named colors and hex codes)
    const extractColor = (colorString: string): string => {
      // Check for hex color in brackets: [#RRGGBB]
      const hexMatch = colorString.match(/\[#([0-9A-Fa-f]{6})\]/);
      if (hexMatch) {
        return `#${hexMatch[1]}`;
      }
      
      // Otherwise use color map for named colors
      const colorMap: Record<string, string> = {
        'red-50': 'hsl(0, 85%, 97%)',
        'red-100': 'hsl(0, 93%, 94%)',
        'red-200': 'hsl(0, 96%, 89%)',
        'red-500': 'hsl(0, 84%, 60%)',
        'red-800': 'hsl(0, 70%, 35%)',
        'red-950': 'hsl(0, 75%, 15%)',
        'pink-50': 'hsl(330, 85%, 97%)',
        'pink-100': 'hsl(326, 78%, 95%)',
        'pink-200': 'hsl(326, 85%, 90%)',
        'pink-400': 'hsl(330, 81%, 60%)',
        'pink-800': 'hsl(336, 74%, 35%)',
        'pink-950': 'hsl(336, 84%, 17%)',
        'blue-200': 'hsl(214, 95%, 93%)',
        'blue-800': 'hsl(214, 80%, 35%)',
        'green-50': 'hsl(138, 76%, 97%)',
        'green-100': 'hsl(141, 84%, 93%)',
        'green-200': 'hsl(141, 79%, 85%)',
        'green-800': 'hsl(142, 76%, 26%)',
        'green-900': 'hsl(143, 85%, 20%)',
        'green-950': 'hsl(144, 90%, 12%)',
        'yellow-50': 'hsl(55, 92%, 95%)',
        'yellow-100': 'hsl(55, 97%, 88%)',
        'yellow-200': 'hsl(48, 95%, 76%)',
        'purple-50': 'hsl(270, 100%, 98%)',
        'purple-200': 'hsl(270, 67%, 90%)',
        'purple-800': 'hsl(271, 81%, 35%)',
        'violet-200': 'hsl(252, 100%, 91%)',
        'violet-800': 'hsl(251, 91%, 35%)',
        'gray-50': 'hsl(0, 0%, 98%)',
        'gray-100': 'hsl(0, 0%, 96%)',
        'gray-200': 'hsl(0, 0%, 90%)',
        'slate-50': 'hsl(210, 40%, 98%)',
        'slate-100': 'hsl(210, 40%, 96%)',
        'slate-200': 'hsl(214, 32%, 91%)',
      };
      
      return colorMap[colorString] || 'hsl(0, 0%, 50%)';
    };
    
    // Match gradient patterns - supports both named colors and hex codes
    // Examples: 
    //   - bg-gradient-to-br from-red-50 to-red-200
    //   - bg-gradient-to-br from-[#B62D26] to-[#8B1F1F]
    const gradientMatch = tailwindClasses.match(/bg-gradient-to-(\w+)/);
    const fromMatch = tailwindClasses.match(/from-([\w-]+|\[#[0-9A-Fa-f]{6}\])/);
    const viaMatch = tailwindClasses.match(/via-([\w-]+|\[#[0-9A-Fa-f]{6}\])/);
    const toMatch = tailwindClasses.match(/to-([\w-]+|\[#[0-9A-Fa-f]{6}\])/);
    
    if (gradientMatch && fromMatch && toMatch) {
      const direction = gradientMatch[1];
      const fromColor = extractColor(fromMatch[1]);
      const toColor = extractColor(toMatch[1]);
      const viaColor = viaMatch ? extractColor(viaMatch[1]) : null;
      
      // Map Tailwind directions to CSS gradient directions
      const directionMap: Record<string, string> = {
        'br': 'to bottom right',
        'tr': 'to top right',
        'bl': 'to bottom left',
        'tl': 'to top left',
        't': 'to top',
        'b': 'to bottom',
        'l': 'to left',
        'r': 'to right',
      };
      
      const cssDirection = directionMap[direction] || 'to bottom right';
      
      if (viaColor) {
        styles.background = `linear-gradient(${cssDirection}, ${fromColor}, ${viaColor}, ${toColor})`;
      } else {
        styles.background = `linear-gradient(${cssDirection}, ${fromColor}, ${toColor})`;
      }
    }
    
    // Handle text color if specified
    if (tailwindClasses.includes('text-white')) {
      styles.color = '#ffffff';
    } else if (tailwindClasses.includes('text-black')) {
      styles.color = '#000000';
    }
    
    return styles;
  };

  // Generate dynamic styles from customizations
  // IMPORTANT: When multiple customizations target the same component,
  // only use the MOST RECENT one to avoid style conflicts
  const getDynamicStyles = (component: string) => {
    console.log(`\n🎨 ========== GET DYNAMIC STYLES ==========`);
    console.log(`🎯 Looking for component: "${component}"`);
    console.log(`📚 Total customizations available: ${customizations.length}`);
    
    // Find the most recent matching customization
    let latestMatch: Customization | null = null;
    
    customizations.forEach((custom, index) => {
      try {
        const changes = custom.applied_changes;
        console.log(`\n   [${index + 1}/${customizations.length}] Checking customization:`);
        console.log(`   - ID: ${custom.id}`);
        console.log(`   - Type: ${custom.customization_type}`);
        console.log(`   - Status: ${custom.status}`);
        console.log(`   - Created: ${custom.created_at}`);
        console.log(`   - Component in changes: "${changes?.component}"`);
        
        const componentMatches = changes?.component === component;
        const targetMatches = changes?.target === component;
        
        console.log(`   - Component match: ${componentMatches}`);
        console.log(`   - Target match: ${targetMatches}`);
        
        if (componentMatches || targetMatches) {
          console.log(`   ✅ MATCH FOUND!`);
          // Use the first match we find (they're ordered by created_at DESC)
          if (!latestMatch) {
            latestMatch = custom;
            console.log(`   🎯 This is now the active customization`);
          } else {
            console.log(`   ⏭️ Skipping - already have a more recent match`);
          }
        }
      } catch (e) {
        console.error(`   ❌ Error parsing customization:`, e);
      }
    });

    // Extract styles from the latest match
    const styles: string[] = [];
    if (latestMatch) {
      console.log(`\n🎯 Using customization: ${latestMatch.id}`);
      const changes = latestMatch.applied_changes;
      
      if (changes?.modifications && Array.isArray(changes.modifications)) {
        console.log(`   - Processing ${changes.modifications.length} modifications...`);
        changes.modifications.forEach((mod: any, modIndex: number) => {
          console.log(`      Modification [${modIndex + 1}]:`, mod);
          if (mod.styles) {
            console.log(`      ✅ Adding styles: "${mod.styles}"`);
            styles.push(mod.styles);
          }
        });
      } else if (changes?.styles) {
        console.log(`   ✅ Adding direct styles: "${changes.styles}"`);
        styles.push(changes.styles);
      }
    }

    const result = styles.length > 0 ? styles.join(' ') : '';
    console.log(`\n🎨 ========== RESULT ==========`);
    console.log(`Final styles for "${component}": "${result}"`);
    console.log(`==========================================\n`);
    return result;
  };

  // Get inline CSS styles (converted from Tailwind classes)
  const getDynamicInlineStyles = (component: string): CSSProperties => {
    const tailwindClasses = getDynamicStyles(component);
    if (!tailwindClasses) return {};
    
    const inlineStyles = convertTailwindToInlineStyles(tailwindClasses);
    console.log(`🎨 Converted to inline styles:`, inlineStyles);
    return inlineStyles;
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
    const propsModifications = customizations
      .filter(c => c.status === 'applied' || (previewMode && c.status === 'pending'))
      .flatMap(c => c.applied_changes?.modifications || [])
      .filter(mod => mod.target === componentName && (mod.type === 'props' || mod.props));
    
    // Merge all props (later ones override earlier ones)
    const mergedProps = propsModifications.reduce((acc, mod) => {
      return { ...acc, ...(mod.props || {}) };
    }, {});
    
    if (Object.keys(mergedProps).length > 0) {
      console.log(`📦 Props for ${componentName}:`, mergedProps);
    }
    
    return mergedProps;
  };

  // Get sort order for components
  const getOrder = (componentName: string): number | undefined => {
    const reorderModifications = customizations
      .filter(c => c.status === 'applied' || (previewMode && c.status === 'pending'))
      .flatMap(c => c.applied_changes?.modifications || [])
      .filter(mod => mod.target === componentName && (mod.type === 'reorder' || mod.order !== undefined))
      .sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA; // Most recent first
      });
    
    const latestOrder = reorderModifications[0]?.order;
    
    if (latestOrder !== undefined) {
      console.log(`🔢 Order for ${componentName}:`, latestOrder);
      return latestOrder;
    }
    
    return undefined;
  };

  return {
    customizations,
    loading,
    getDynamicStyles,
    getDynamicInlineStyles,
    getDynamicContent,
    isVisible,
    getDynamicProps,
    getOrder
  };
};
