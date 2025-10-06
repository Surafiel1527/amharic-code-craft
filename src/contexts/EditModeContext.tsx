import { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface ModificationObject {
  type: 'hide' | 'show' | 'modify' | 'add';
  target: string;
  styles?: string;
  content?: string;
}

interface EditModeContextType {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  selectedComponent: string | null;
  setSelectedComponent: (name: string | null) => void;
  createModification: (modification: ModificationObject) => Promise<void>;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  const createModification = async (modification: ModificationObject) => {
    try {
      logger.info('Creating modification', { modification });
      
      const { data, error } = await supabase.functions.invoke('create-modification', {
        body: { modification }
      });

      if (error) {
        logger.error('Error creating modification', error);
        toast.error('Failed to create modification');
        return;
      }

      logger.success('Modification created', { data });
      toast.success('Change saved for review');
      
      // Close the inspector panel after successful modification
      setSelectedComponent(null);
    } catch (error) {
      logger.error('Error in createModification', error);
      toast.error('Failed to create modification');
    }
  };

  return (
    <EditModeContext.Provider
      value={{
        isEditMode,
        setIsEditMode,
        selectedComponent,
        setSelectedComponent,
        createModification,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
}
