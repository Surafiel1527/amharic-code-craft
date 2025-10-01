import { ComponentType, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart3, 
  Users, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Activity,
  Bell,
  Settings,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

/**
 * Component Registry - AI can reference these components by name
 * 
 * Each component has:
 * - component: The actual React component
 * - props: TypeScript interface for props
 * - description: What the component does
 * - examples: Sample usage
 */

interface RegisteredComponent {
  component: ComponentType<any>;
  props: Record<string, any>;
  description: string;
  examples: string[];
  category: 'layout' | 'data' | 'ui' | 'icon' | 'feedback';
}

export const COMPONENT_REGISTRY: Record<string, RegisteredComponent> = {
  // Layout Components
  'Card': {
    component: Card,
    props: { className: 'string' },
    description: 'Container card for grouping content',
    examples: ['<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader></Card>'],
    category: 'layout'
  },
  'CardHeader': {
    component: CardHeader,
    props: { className: 'string' },
    description: 'Header section of a card',
    examples: ['<CardHeader><CardTitle>My Title</CardTitle></CardHeader>'],
    category: 'layout'
  },
  'CardTitle': {
    component: CardTitle,
    props: { className: 'string' },
    description: 'Title text for card header',
    examples: ['<CardTitle>Analytics Dashboard</CardTitle>'],
    category: 'layout'
  },
  'CardDescription': {
    component: CardDescription,
    props: { className: 'string' },
    description: 'Description text for card header',
    examples: ['<CardDescription>View your statistics</CardDescription>'],
    category: 'layout'
  },
  'CardContent': {
    component: CardContent,
    props: { className: 'string' },
    description: 'Main content area of a card',
    examples: ['<CardContent>Your content here</CardContent>'],
    category: 'layout'
  },

  // UI Components
  'Button': {
    component: Button,
    props: { 
      variant: "'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'",
      size: "'default' | 'sm' | 'lg' | 'icon'",
      onClick: 'function'
    },
    description: 'Interactive button element',
    examples: ['<Button variant="outline">Click Me</Button>'],
    category: 'ui'
  },
  'Badge': {
    component: Badge,
    props: { 
      variant: "'default' | 'secondary' | 'destructive' | 'outline'" 
    },
    description: 'Small status or label indicator',
    examples: ['<Badge variant="secondary">New</Badge>'],
    category: 'ui'
  },

  // Data Display
  'Table': {
    component: Table,
    props: { className: 'string' },
    description: 'Responsive data table',
    examples: ['<Table><TableHeader>...</TableHeader><TableBody>...</TableBody></Table>'],
    category: 'data'
  },
  'TableHeader': {
    component: TableHeader,
    props: {},
    description: 'Table header section',
    examples: ['<TableHeader><TableRow><TableHead>Name</TableHead></TableRow></TableHeader>'],
    category: 'data'
  },
  'TableBody': {
    component: TableBody,
    props: {},
    description: 'Table body section',
    examples: ['<TableBody><TableRow><TableCell>Data</TableCell></TableRow></TableBody>'],
    category: 'data'
  },
  'TableRow': {
    component: TableRow,
    props: {},
    description: 'Single table row',
    examples: ['<TableRow><TableCell>Value</TableCell></TableRow>'],
    category: 'data'
  },
  'TableHead': {
    component: TableHead,
    props: {},
    description: 'Table header cell',
    examples: ['<TableHead>Column Name</TableHead>'],
    category: 'data'
  },
  'TableCell': {
    component: TableCell,
    props: {},
    description: 'Table data cell',
    examples: ['<TableCell>Cell Value</TableCell>'],
    category: 'data'
  },

  // Feedback Components
  'Alert': {
    component: Alert,
    props: { 
      variant: "'default' | 'destructive'" 
    },
    description: 'Alert message box',
    examples: ['<Alert><AlertTitle>Note</AlertTitle><AlertDescription>Message</AlertDescription></Alert>'],
    category: 'feedback'
  },
  'AlertTitle': {
    component: AlertTitle,
    props: {},
    description: 'Alert title',
    examples: ['<AlertTitle>Important</AlertTitle>'],
    category: 'feedback'
  },
  'AlertDescription': {
    component: AlertDescription,
    props: {},
    description: 'Alert description text',
    examples: ['<AlertDescription>This is a message</AlertDescription>'],
    category: 'feedback'
  },

  // Icons
  'BarChart3': {
    component: BarChart3,
    props: { className: 'string', size: 'number' },
    description: 'Bar chart icon',
    examples: ['<BarChart3 className="h-4 w-4" />'],
    category: 'icon'
  },
  'Users': {
    component: Users,
    props: { className: 'string', size: 'number' },
    description: 'Users icon',
    examples: ['<Users className="h-4 w-4" />'],
    category: 'icon'
  },
  'FileText': {
    component: FileText,
    props: { className: 'string', size: 'number' },
    description: 'File/document icon',
    examples: ['<FileText className="h-4 w-4" />'],
    category: 'icon'
  },
  'MessageSquare': {
    component: MessageSquare,
    props: { className: 'string', size: 'number' },
    description: 'Message/chat icon',
    examples: ['<MessageSquare className="h-4 w-4" />'],
    category: 'icon'
  },
  'TrendingUp': {
    component: TrendingUp,
    props: { className: 'string', size: 'number' },
    description: 'Trending up icon',
    examples: ['<TrendingUp className="h-4 w-4" />'],
    category: 'icon'
  },
  'Activity': {
    component: Activity,
    props: { className: 'string', size: 'number' },
    description: 'Activity/pulse icon',
    examples: ['<Activity className="h-4 w-4" />'],
    category: 'icon'
  },
  'Bell': {
    component: Bell,
    props: { className: 'string', size: 'number' },
    description: 'Notification bell icon',
    examples: ['<Bell className="h-4 w-4" />'],
    category: 'icon'
  },
  'Settings': {
    component: Settings,
    props: { className: 'string', size: 'number' },
    description: 'Settings/gear icon',
    examples: ['<Settings className="h-4 w-4" />'],
    category: 'icon'
  },
  'Info': {
    component: Info,
    props: { className: 'string', size: 'number' },
    description: 'Information icon',
    examples: ['<Info className="h-4 w-4" />'],
    category: 'icon'
  },
  'AlertCircle': {
    component: AlertCircle,
    props: { className: 'string', size: 'number' },
    description: 'Alert/warning icon',
    examples: ['<AlertCircle className="h-4 w-4" />'],
    category: 'icon'
  },
  'CheckCircle': {
    component: CheckCircle,
    props: { className: 'string', size: 'number' },
    description: 'Success/checkmark icon',
    examples: ['<CheckCircle className="h-4 w-4" />'],
    category: 'icon'
  }
};

/**
 * Get component documentation for AI prompts
 */
export function getComponentDocs(): string {
  const categories = Object.entries(COMPONENT_REGISTRY).reduce((acc, [name, info]) => {
    if (!acc[info.category]) {
      acc[info.category] = [];
    }
    acc[info.category].push({ name, ...info });
    return acc;
  }, {} as Record<string, any[]>);

  let docs = '# Available Components\n\n';
  
  Object.entries(categories).forEach(([category, components]) => {
    docs += `## ${category.toUpperCase()}\n\n`;
    components.forEach(({ name, description, props, examples }) => {
      docs += `### ${name}\n`;
      docs += `${description}\n`;
      docs += `Props: ${JSON.stringify(props, null, 2)}\n`;
      docs += `Example: ${examples[0]}\n\n`;
    });
  });

  return docs;
}

/**
 * Render a registered component by name
 */
export function renderRegisteredComponent(
  componentName: string, 
  props: any = {}, 
  children?: ReactNode
): ReactNode {
  const registered = COMPONENT_REGISTRY[componentName];
  
  if (!registered) {
    console.warn(`Component "${componentName}" not found in registry`);
    return null;
  }

  const Component = registered.component;
  return <Component {...props}>{children}</Component>;
}
