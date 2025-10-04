import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, DollarSign, Star, Download, Upload } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Template {
  id: string;
  title: string;
  description: string;
  preview_image: string;
  price: number;
  category: string;
  tags: string[];
  purchases_count: number;
  rating: number;
  author_id: string;
}

export default function PremiumTemplates() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [myTemplates, setMyTemplates] = useState<Template[]>([]);
  const [purchasedTemplates, setPurchasedTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newTemplate, setNewTemplate] = useState({
    title: "",
    description: "",
    price: 0,
    category: "landing",
    tags: [] as string[],
    code: {}
  });

  useEffect(() => {
    fetchTemplates();
    fetchMyTemplates();
    fetchPurchasedTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("premium_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching templates", variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const fetchMyTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("premium_templates")
      .select("*")
      .eq("author_id", user.id);

    if (!error) {
      setMyTemplates(data || []);
    }
  };

  const fetchPurchasedTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("template_purchases")
      .select("*, premium_templates(*)")
      .eq("user_id", user.id);

    if (!error) {
      setPurchasedTemplates(data?.map(p => p.premium_templates).filter(Boolean) || []);
    }
  };

  const handleCreateTemplate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please login to create templates", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("premium_templates")
      .insert({
        ...newTemplate,
        author_id: user.id
      });

    if (error) {
      toast({ title: "Error creating template", variant: "destructive" });
    } else {
      toast({ title: "Template created successfully!" });
      setIsCreateDialogOpen(false);
      fetchTemplates();
      fetchMyTemplates();
      setNewTemplate({
        title: "",
        description: "",
        price: 0,
        category: "landing",
        tags: [],
        code: {}
      });
    }
  };

  const handlePurchase = async (template: Template) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please login to purchase", variant: "destructive" });
      return;
    }

    // TODO: Integrate with Stripe payment when key is provided
    toast({ 
      title: "Stripe Integration Required", 
      description: "Please configure Stripe to enable payments"
    });
    
    // Placeholder for Stripe integration
    // const stripe = await loadStripe('pk_...');
    // Create checkout session and redirect
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", "landing", "dashboard", "ecommerce", "portfolio", "blog", "saas"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t("premium.title")}</h2>
          <p className="text-muted-foreground">{t("premium.subtitle")}</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("premium.createTemplate")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Premium Template</DialogTitle>
              <DialogDescription>List your template on the marketplace</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Template Title"
                value={newTemplate.title}
                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Price ($)"
                  value={newTemplate.price}
                  onChange={(e) => setNewTemplate({ ...newTemplate, price: parseFloat(e.target.value) })}
                />
                <Select
                  value={newTemplate.category}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c !== "all").map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Tags (comma separated)"
                onChange={(e) => setNewTemplate({ 
                  ...newTemplate, 
                  tags: e.target.value.split(',').map(t => t.trim()) 
                })}
              />
              <Button onClick={handleCreateTemplate} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Publish Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="marketplace" className="space-y-4">
        <TabsList>
          <TabsTrigger value="marketplace">{t("premium.marketplace")}</TabsTrigger>
          <TabsTrigger value="purchased">{t("premium.myPurchases")}</TabsTrigger>
          <TabsTrigger value="mytemplates">{t("premium.myTemplates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("premium.searchPlaceholder")}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="aspect-video bg-muted rounded-md mb-4" />
                  <CardTitle>{template.title}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-bold">{template.price}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{template.rating}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{template.category}</Badge>
                    {template.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handlePurchase(template)}
                  >
                    {t("premium.purchaseTemplate")}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="purchased">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchasedTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle>{template.title}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    {t("premium.download")}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mytemplates">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle>{template.title}</CardTitle>
                  <CardDescription>
                    {template.purchases_count} purchases • ${template.price}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" className="flex-1">{t("premium.edit")}</Button>
                  <Button variant="destructive" className="flex-1">{t("premium.delete")}</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}