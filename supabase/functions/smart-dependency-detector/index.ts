import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language = 'typescript', appType = 'general' } = await req.json();

    console.log('🔍 Smart Dependency Detector - Analyzing code...');

    const dependencies = detectDependenciesFromCode(code, language, appType);

    return new Response(
      JSON.stringify({
        success: true,
        dependencies,
        count: dependencies.length,
        message: `Detected ${dependencies.length} dependencies from code`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in smart-dependency-detector:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function detectDependenciesFromCode(code: string, language: string, appType: string): any[] {
  const dependencies: any[] = [];
  const detectedPackages = new Set<string>();

  // Common patterns for different package types
  const patterns = {
    // Game engines
    gameEngines: {
      'phaser': /phaser|Phaser\.Game|arcade physics/i,
      'three': /THREE\.|three\.js|WebGLRenderer|PerspectiveCamera/i,
      'babylonjs': /BABYLON\.|babylon\.js|Engine|Scene/i,
      'pixi.js': /PIXI\.|pixi\.js|Application|Sprite/i,
      '@react-three/fiber': /Canvas|useFrame|useThree/i,
      '@react-three/drei': /OrbitControls|Environment|Sky/i,
    },
    
    // UI libraries
    uiLibraries: {
      '@radix-ui/react-dialog': /Dialog\.Root|Dialog\.Trigger|Dialog\.Content/,
      '@radix-ui/react-dropdown-menu': /DropdownMenu\.Root|DropdownMenu\.Trigger/,
      'framer-motion': /motion\.|AnimatePresence|useAnimation/,
      'react-spring': /useSpring|animated\./,
      'recharts': /LineChart|BarChart|PieChart|ResponsiveContainer/,
      'react-chartjs-2': /Chart\.register|Line|Bar|Pie/,
    },
    
    // State management
    stateManagement: {
      'zustand': /create\(.*set.*get.*\)/,
      'redux': /@reduxjs|createSlice|configureStore/,
      'jotai': /atom\(|useAtom/,
      'recoil': /atom\(|selector\(|useRecoilState/,
    },
    
    // Data fetching
    dataFetching: {
      'axios': /axios\.|axios\.get|axios\.post/,
      'swr': /useSWR/,
      'react-query': /@tanstack\/react-query|useQuery|useMutation/,
    },
    
    // Utilities
    utilities: {
      'lodash': /lodash|_\./,
      'date-fns': /format\(.*Date|parseISO|addDays/,
      'uuid': /uuid\.|v4\(\)/,
      'classnames': /classnames|clsx/,
    },
    
    // Form handling
    forms: {
      'react-hook-form': /useForm|register|handleSubmit|Controller/,
      'formik': /useFormik|Formik|Field|Form/,
      'yup': /yup\.|object\(\)\.shape/,
      'zod': /z\.|ZodType|zodResolver/,
    },
    
    // Routing
    routing: {
      'react-router-dom': /BrowserRouter|Route|Link|useNavigate|useParams/,
    },
    
    // Animation
    animation: {
      'gsap': /gsap\.|TweenMax|TimelineMax/,
      'lottie-react': /Lottie|<Lottie/,
    },
    
    // Testing
    testing: {
      '@testing-library/react': /render\(|screen\.|fireEvent/,
      'vitest': /describe\(|it\(|expect\(/,
      'jest': /jest\.|mock\(/,
    }
  };

  // Scan code for each pattern
  for (const [category, packages] of Object.entries(patterns)) {
    for (const [packageName, pattern] of Object.entries(packages)) {
      if (pattern.test(code) && !detectedPackages.has(packageName)) {
        detectedPackages.add(packageName);
        
        // Determine if it's a dev dependency
        const isDevDep = category === 'testing';
        
        dependencies.push({
          name: packageName,
          version: 'latest',
          detectedFrom: 'code-analysis',
          category,
          shouldInstall: true,
          location: isDevDep ? 'devDependencies' : 'dependencies',
          context: { pattern: pattern.source },
          installCommand: `npm install ${isDevDep ? '--save-dev ' : ''}${packageName}`,
          confidence: 0.9
        });
      }
    }
  }

  // App-type specific dependencies
  if (appType === 'game') {
    if (!detectedPackages.has('phaser') && !detectedPackages.has('three') && !detectedPackages.has('babylonjs')) {
      dependencies.push({
        name: 'phaser',
        version: 'latest',
        detectedFrom: 'app-type-suggestion',
        category: 'gameEngines',
        shouldInstall: true,
        location: 'dependencies',
        context: { reason: 'Game app detected, suggesting Phaser as default game engine' },
        installCommand: 'npm install phaser',
        confidence: 0.7
      });
    }
  }

  return dependencies;
}
