import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Store, Download, Star, DollarSign, TrendingUp, Search } from "lucide-react";

const Marketplace = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlugin, setSelectedPlugin] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch marketplace plugins
  const { data: plugins } = useQuery({
    queryKey: ['marketplace-plugins', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('marketplace_plugins')
        .select(`
          *,
          plugin:ai_plugins(*)
        `)
        .eq('approved', true)
        .order('downloads_count', { ascending: false });

      if (searchQuery) {
        query = query.ilike('plugin.plugin_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch user's installed plugins
  const { data: installed } = useQuery({
    queryKey: ['installed-plugins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plugin_installations')
        .select('plugin_id')
        .eq('installation_status', 'active');
      if (error) throw error;
      return data?.map(i => i.plugin_id) || [];
    }
  });

  // Fetch reviews for a plugin
  const { data: reviews } = useQuery({
    queryKey: ['plugin-reviews', selectedPlugin?.plugin_id],
    queryFn: async () => {
      if (!selectedPlugin) return [];
      const { data, error } = await supabase
        .from('plugin_reviews')
        .select('*')
        .eq('plugin_id', selectedPlugin.plugin_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPlugin
  });

  // Install plugin mutation
  const installPlugin = useMutation({
    mutationFn: async (pluginId: string) => {
      const { data, error } = await supabase
        .from('plugin_installations')
        .insert({
          plugin_id: pluginId,
          installed_version: '1.0.0',
          installation_status: 'active'
        })
        .select()
        .single();
      
      if (error) throw error;

      // Increment download count
      await supabase.rpc('increment', {
        table_name: 'marketplace_plugins',
        row_id: selectedPlugin.id,
        column_name: 'downloads_count'
      });

      return data;
    },
    onSuccess: () => {
      toast.success('Plugin installed successfully!');
      queryClient.invalidateQueries({ queryKey: ['installed-plugins'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-plugins'] });
    },
    onError: (error: Error) => {
      toast.error(`Installation failed: ${error.message}`);
    }
  });

  const isInstalled = (pluginId: string) => {
    return installed?.includes(pluginId);
  };

  const getAverageRating = (pluginId: string) => {
    const pluginReviews = reviews?.filter(r => r.plugin_id === pluginId) || [];
    if (pluginReviews.length === 0) return 0;
    const sum = pluginReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / pluginReviews.length).toFixed(1);
  };

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
            {plugins?.map((listing) => (
              <Dialog key={listing.id}>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedPlugin(listing)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="line-clamp-1">
                          {listing.plugin?.plugin_name || 'Unnamed Plugin'}
                        </CardTitle>
                        {listing.featured && (
                          <Badge variant="secondary">Featured</Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {listing.plugin?.description || 'No description available'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{listing.plugin?.rating || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          <span>{listing.downloads_count}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {listing.tags?.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1">
                          {listing.pricing_model === 'free' ? (
                            <Badge variant="secondary">Free</Badge>
                          ) : (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-bold">{listing.price}</span>
                            </div>
                          )}
                        </div>
                        {isInstalled(listing.plugin_id) ? (
                          <Badge>Installed</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Click to view</span>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </DialogTrigger>

                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{selectedPlugin?.plugin?.plugin_name}</DialogTitle>
                    <DialogDescription>
                      {selectedPlugin?.plugin?.description}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold">{getAverageRating(selectedPlugin?.plugin_id)}</span>
                        <span className="text-sm text-muted-foreground">
                          ({reviews?.length || 0} reviews)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="h-5 w-5" />
                        <span>{selectedPlugin?.downloads_count} downloads</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Reviews</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {reviews?.map((review) => (
                          <div key={review.id} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex">
                                {Array.from({ length: review.rating }).map((_, i) => (
                                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm">{review.review_text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {!isInstalled(selectedPlugin?.plugin_id) && (
                      <Button
                        onClick={() => installPlugin.mutate(selectedPlugin.plugin_id)}
                        disabled={installPlugin.isPending}
                        className="w-full"
                      >
                        {installPlugin.isPending ? 'Installing...' : 'Install Plugin'}
                      </Button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </TabsContent>

        {/* Other tabs would filter the plugins array accordingly */}
        <TabsContent value="featured">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plugins?.filter(p => p.featured).map((listing) => (
              <Card key={listing.id}>
                <CardHeader>
                  <CardTitle>{listing.plugin?.plugin_name}</CardTitle>
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
