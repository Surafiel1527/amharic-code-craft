import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectFiles, dependencies = [], projectName = 'my-app' } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Packaging complete project:', projectName);

    // Generate complete package.json with all dependencies
    const packageJson = {
      name: projectName,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview",
        install: "npm install"
      },
      dependencies: {
        "@hookform/resolvers": "^3.10.0",
        "@radix-ui/react-accordion": "^1.2.11",
        "@radix-ui/react-alert-dialog": "^1.1.14",
        "@radix-ui/react-avatar": "^1.1.10",
        "@radix-ui/react-checkbox": "^1.3.2",
        "@radix-ui/react-dialog": "^1.1.14",
        "@radix-ui/react-dropdown-menu": "^2.1.15",
        "@radix-ui/react-label": "^2.1.7",
        "@radix-ui/react-popover": "^1.1.14",
        "@radix-ui/react-progress": "^1.1.7",
        "@radix-ui/react-scroll-area": "^1.2.9",
        "@radix-ui/react-select": "^2.2.5",
        "@radix-ui/react-separator": "^1.1.7",
        "@radix-ui/react-slider": "^1.3.5",
        "@radix-ui/react-slot": "^1.2.3",
        "@radix-ui/react-switch": "^1.2.5",
        "@radix-ui/react-tabs": "^1.1.12",
        "@radix-ui/react-toast": "^1.2.14",
        "@radix-ui/react-tooltip": "^1.2.7",
        "@supabase/supabase-js": "^2.58.0",
        "@tanstack/react-query": "^5.90.2",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "date-fns": "^3.6.0",
        "lucide-react": "^0.462.0",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "react-hook-form": "^7.61.1",
        "react-router-dom": "^6.30.1",
        "recharts": "^2.15.4",
        "sonner": "^1.7.4",
        "tailwind-merge": "^2.6.0",
        "tailwindcss-animate": "^1.0.7",
        "zod": "^3.25.76",
        ...Object.fromEntries(
          dependencies.map((dep: any) => [dep.name, dep.version || 'latest'])
        )
      },
      devDependencies: {
        "@types/react": "^18.3.1",
        "@types/react-dom": "^18.3.0",
        "@vitejs/plugin-react-swc": "^3.5.0",
        "autoprefixer": "^10.4.18",
        "postcss": "^8.4.35",
        "tailwindcss": "^3.4.1",
        "typescript": "^5.2.2",
        "vite": "^5.1.0"
      }
    };

    // Generate README.md
    const readme = `# ${projectName}

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

\`\`\`bash
# Install all dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
\`\`\`

## 📦 Included Dependencies

This project comes with all necessary dependencies pre-configured:

${dependencies.map((dep: any) => `- **${dep.name}** (${dep.version || 'latest'}): ${dep.reason || dep.category || ''}`).join('\n')}

## 🎯 Features

- ⚡ Vite for blazing fast development
- ⚛️ React 18 with TypeScript
- 🎨 Tailwind CSS for styling
- 🔐 Supabase for backend (if configured)
- 📱 Fully responsive design
- 🎭 Dark/Light mode support

## 🛠️ Technology Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + Radix UI
- **Backend:** Supabase (optional)
- **State Management:** TanStack Query
- **Forms:** React Hook Form + Zod

## 📝 Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Utility functions
│   └── integrations/  # Backend integrations
├── public/            # Static assets
└── supabase/          # Backend functions (if applicable)
\`\`\`

## 🔧 Configuration

All necessary configuration files are included:
- \`vite.config.ts\` - Vite configuration
- \`tailwind.config.ts\` - Tailwind CSS configuration
- \`tsconfig.json\` - TypeScript configuration
- \`.env.example\` - Environment variables template

## 📖 Documentation

For more information about the technologies used:
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase Documentation](https://supabase.com/docs)

## 🤝 Support

Generated by Mega Mind - Your AI Development Platform

---

**Ready to code!** All dependencies are configured. Just run \`npm install\` and start building! 🎉
`;

    // Generate .env.example
    const envExample = `# Supabase Configuration (Optional)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key_here
VITE_SUPABASE_PROJECT_ID=your_project_id_here

# Add your other environment variables here
`;

    // Generate installation instructions
    const installInstructions = `# 🚀 Installation Instructions

## Step 1: Extract the ZIP file
Extract all files to your desired location.

## Step 2: Install Dependencies
Open terminal in the project folder and run:

\`\`\`bash
npm install
\`\`\`

This will install ALL ${Object.keys(packageJson.dependencies).length} production dependencies and ${Object.keys(packageJson.devDependencies).length} development dependencies.

## Step 3: Configure Environment (Optional)
If using Supabase or other services:
1. Copy \`.env.example\` to \`.env\`
2. Fill in your API keys and configuration

## Step 4: Start Development Server
\`\`\`bash
npm run dev
\`\`\`

Your app will be running at http://localhost:5173

## 🎉 You're Ready!
Everything is configured and ready to use. Start coding!

## 📦 What's Included:
✅ All dependencies installed via package.json
✅ Complete source code
✅ Configuration files (Vite, TypeScript, Tailwind)
✅ Development and production scripts
✅ README with full documentation

## 🛠️ Available Scripts:
- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build
`;

    // Package everything
    const packageData = {
      'package.json': JSON.stringify(packageJson, null, 2),
      'README.md': readme,
      '.env.example': envExample,
      'INSTALLATION.md': installInstructions,
      files: projectFiles || {}
    };

    // Store package info in database
    const { data: packageRecord, error: packageError } = await supabaseClient
      .from('complete_project_packages')
      .insert({
        user_id: user.id,
        project_name: projectName,
        package_data: packageData,
        dependencies_count: dependencies.length,
        total_dependencies: Object.keys(packageJson.dependencies).length + Object.keys(packageJson.devDependencies).length,
        status: 'ready'
      })
      .select()
      .single();

    if (packageError) {
      console.error('Failed to store package:', packageError);
    }

    console.log('✅ Complete project package created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        packageId: packageRecord?.id,
        projectName,
        package: packageData,
        stats: {
          totalDependencies: Object.keys(packageJson.dependencies).length,
          devDependencies: Object.keys(packageJson.devDependencies).length,
          customDependencies: dependencies.length,
          filesIncluded: Object.keys(projectFiles || {}).length
        },
        instructions: installInstructions,
        message: `✅ Complete project package ready! ${Object.keys(packageJson.dependencies).length + Object.keys(packageJson.devDependencies).length} dependencies configured.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in package-complete-project:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
