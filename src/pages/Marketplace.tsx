import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Store, Search, Star, Download, DollarSign, Info } from "lucide-react";

const Marketplace = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Sample plugin data for preview
  const samplePlugins = [
    {
      id: "1",
      name: "Code Formatter Pro",
      description: "Automatically format your code with custom style rules",
      rating: 4.8,
      downloads: 1234,
      price: 0,
      featured: true,
      tags: ["productivity", "formatting", "code-quality"]
    },
    {
      id: "2",
      name: "AI Code Reviewer",
      description: "Get instant AI-powered code reviews and suggestions",
      rating: 4.6,
      downloads: 892,
      price: 9.99,
      featured: false,
      tags: ["ai", "code-review", "quality"]
    },
    {
      id: "3",
      name: "Component Generator",
      description: "Generate React components from descriptions",
      rating: 4.9,
      downloads: 2156,
      price: 0,
      featured: true,
      tags: ["react", "generator", "components"]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Store className="h-10 w-10 text-primary" />
            Plugin Marketplace
          </h1>
          <p className="text-muted-foreground mt-2">
            Discover and install AI plugins to enhance your workspace
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Database types are regenerating. Full marketplace functionality will be available shortly...
        </AlertDescription>
      </Alert>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search plugins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Plugins</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="popular">Most Popular</TabsTrigger>
          <TabsTrigger value="free">Free</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {samplePlugins.map((plugin) => (
              <Card key={plugin.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1">{plugin.name}</CardTitle>
                    {plugin.featured && (
                      <Badge variant="secondary">Featured</Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {plugin.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{plugin.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      <span>{plugin.downloads}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {plugin.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                      {plugin.price === 0 ? (
                        <Badge variant="secondary">Free</Badge>
                      ) : (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-bold">{plugin.price}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Click to view</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="featured">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {samplePlugins.filter(p => p.featured).map((plugin) => (
              <Card key={plugin.id}>
                <CardHeader>
                  <CardTitle>{plugin.name}</CardTitle>
                  <CardDescription>{plugin.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{plugin.rating}</span>
                    <span className="text-muted-foreground">•</span>
                    <Download className="h-4 w-4" />
                    <span>{plugin.downloads}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="popular">
          <div className="text-center py-12 text-muted-foreground">
            <p>Loading popular plugins...</p>
          </div>
        </TabsContent>

        <TabsContent value="free">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {samplePlugins.filter(p => p.price === 0).map((plugin) => (
              <Card key={plugin.id}>
                <CardHeader>
                  <CardTitle>{plugin.name}</CardTitle>
                  <CardDescription>{plugin.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Marketplace;
