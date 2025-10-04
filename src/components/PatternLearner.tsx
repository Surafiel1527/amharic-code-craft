import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function PatternLearner() {
  useEffect(() => {
    const teachHeaderNavPattern = async () => {
      try {
        await supabase.functions.invoke('learn-pattern', {
          body: {
            patternName: "SPA Header Navigation Fix",
            category: "navigation",
            issue: "Header links with href='#section' open blank pages in iframe",
            solution: "Inject JavaScript to prevent default navigation and use smooth scroll instead",
            codeExample: {
              problem: "<a href='#about'>About</a> opens blank page",
              solution: `<script>
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
</script>`,
              context: "Single-page applications with anchor navigation"
            }
          }
        });
        console.log("✅ Pattern learned: Header navigation fix");
      } catch (error) {
        console.error("Failed to learn pattern:", error);
      }
    };

    // Teach the pattern once on mount
    teachHeaderNavPattern();
  }, []);

  return null; // This is a utility component with no UI
}
