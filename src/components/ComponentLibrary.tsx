import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Copy, Check, Search } from "lucide-react";
import { toast } from "sonner";

interface Component {
  id: string;
  name: string;
  category: string;
  code: string;
  preview: string;
}

const COMPONENT_LIBRARY: Component[] = [
  {
    id: "hero-1",
    name: "የዋና ክፍል - ቀላል",
    category: "hero",
    preview: "የተመሰጥ ርዕስ + ጥሪ ለድርጊት",
    code: `<section class="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
  <div class="container mx-auto px-4 text-center">
    <h1 class="text-5xl font-bold mb-4">እንኳን ደህና መጡ</h1>
    <p class="text-xl mb-8">ድንቅ ነገር መገንባት ይጀምሩ</p>
    <button class="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100">
      ይጀምሩ
    </button>
  </div>
</section>`
  },
  {
    id: "card-1",
    name: "የምርት ካርድ",
    category: "cards",
    preview: "የምስል + ርዕስ + መግለጫ + ቁልፍ",
    code: `<div class="bg-white rounded-lg shadow-lg overflow-hidden max-w-sm">
  <img src="https://via.placeholder.com/400x300" alt="Product" class="w-full h-48 object-cover">
  <div class="p-6">
    <h3 class="text-xl font-bold mb-2">የምርት ስም</h3>
    <p class="text-gray-600 mb-4">የምርት መግለጫ እዚህ ይሄዳል። ልዩ ባህሪያትን ያሳዩ።</p>
    <div class="flex justify-between items-center">
      <span class="text-2xl font-bold text-blue-600">$99</span>
      <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        ይግዙ
      </button>
    </div>
  </div>
</div>`
  },
  {
    id: "nav-1",
    name: "የአሰሳ አሞሌ",
    category: "navigation",
    preview: "ምላሽ ሰጪ ናቭባር ከሎጎ",
    code: `<nav class="bg-white shadow-lg">
  <div class="container mx-auto px-4">
    <div class="flex justify-between items-center py-4">
      <div class="text-2xl font-bold text-blue-600">ሎጎ</div>
      <div class="hidden md:flex space-x-8">
        <a href="#" class="text-gray-700 hover:text-blue-600">መነሻ</a>
        <a href="#" class="text-gray-700 hover:text-blue-600">ስለእኛ</a>
        <a href="#" class="text-gray-700 hover:text-blue-600">አገልግሎቶች</a>
        <a href="#" class="text-gray-700 hover:text-blue-600">ያግኙን</a>
      </div>
      <button class="md:hidden">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>
  </div>
</nav>`
  },
  {
    id: "form-1",
    name: "የመገናኛ ቅፅ",
    category: "forms",
    preview: "ቀላል የመገናኛ ቅፅ",
    code: `<form class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
  <h2 class="text-2xl font-bold mb-6">ያግኙን</h2>
  <div class="mb-4">
    <label class="block text-gray-700 mb-2">ስም</label>
    <input type="text" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
  </div>
  <div class="mb-4">
    <label class="block text-gray-700 mb-2">ኢሜይል</label>
    <input type="email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
  </div>
  <div class="mb-6">
    <label class="block text-gray-700 mb-2">መልእክት</label>
    <textarea rows="4" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"></textarea>
  </div>
  <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
    ይላኩ
  </button>
</form>`
  },
  {
    id: "footer-1",
    name: "ግርጌ",
    category: "footer",
    preview: "የማህበራዊ አገናኞች ግርጌ",
    code: `<footer class="bg-gray-900 text-white py-12">
  <div class="container mx-auto px-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <h3 class="text-xl font-bold mb-4">ስለእኛ</h3>
        <p class="text-gray-400">የእኛ ድርጅት መግለጫ እዚህ ይሄዳል።</p>
      </div>
      <div>
        <h3 class="text-xl font-bold mb-4">አገናኞች</h3>
        <ul class="space-y-2">
          <li><a href="#" class="text-gray-400 hover:text-white">መነሻ</a></li>
          <li><a href="#" class="text-gray-400 hover:text-white">ስለእኛ</a></li>
          <li><a href="#" class="text-gray-400 hover:text-white">አገልግሎቶች</a></li>
        </ul>
      </div>
      <div>
        <h3 class="text-xl font-bold mb-4">ይከተሉን</h3>
        <div class="flex space-x-4">
          <a href="#" class="text-gray-400 hover:text-white">Facebook</a>
          <a href="#" class="text-gray-400 hover:text-white">Twitter</a>
          <a href="#" class="text-gray-400 hover:text-white">Instagram</a>
        </div>
      </div>
    </div>
    <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
      <p>&copy; 2025 የእርስዎ ኩባንያ። ሁሉም መብቶች የተጠበቁ ናቸው።</p>
    </div>
  </div>
</footer>`
  },
  {
    id: "testimonial-1",
    name: "የምስክርነት ካርድ",
    category: "testimonials",
    preview: "የደንበኛ ግምገማ ካርድ",
    code: `<div class="bg-white p-6 rounded-lg shadow-lg max-w-md">
  <div class="flex items-center mb-4">
    <img src="https://via.placeholder.com/50" alt="User" class="w-12 h-12 rounded-full mr-4">
    <div>
      <h4 class="font-bold">የደንበኛ ስም</h4>
      <p class="text-sm text-gray-600">የስራ መደብ</p>
    </div>
  </div>
  <div class="flex mb-4">
    <span class="text-yellow-400">★★★★★</span>
  </div>
  <p class="text-gray-700">
    "ድንቅ አገልግሎት! በጣም እረክቻለሁ። እጅግ በጣም እመክራለሁ።"
  </p>
</div>`
  }
];

export const ComponentLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(COMPONENT_LIBRARY.map(c => c.category)))];

  const filteredComponents = COMPONENT_LIBRARY.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         component.preview.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || component.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const copyComponent = async (component: Component) => {
    await navigator.clipboard.writeText(component.code);
    setCopiedId(component.id);
    toast.success(`${component.name} ተቀድቷል!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          የአካላት ቤተ-መዛግብት
        </CardTitle>
        <CardDescription>
          ወደ ፕሮጀክትዎ የተዘጋጁ አካላትን ያስገቡ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="አካላትን ይፈልጉ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">ሁሉም</TabsTrigger>
              <TabsTrigger value="hero">ዋና</TabsTrigger>
              <TabsTrigger value="cards">ካርዶች</TabsTrigger>
              <TabsTrigger value="forms">ቅጾች</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {filteredComponents.map((component) => (
              <Card key={component.id}>
                <CardHeader>
                  <CardTitle className="text-base">{component.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {component.preview}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md mb-4 overflow-x-auto">
                    <pre className="text-xs">
                      <code>{component.code}</code>
                    </pre>
                  </div>
                  <Button
                    onClick={() => copyComponent(component)}
                    variant="outline"
                    className="w-full"
                  >
                    {copiedId === component.id ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        ተቀድቷል!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        ኮድ ቅዳ
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
