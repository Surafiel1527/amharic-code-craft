import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Edit2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversation: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  onConversationsChange: () => void;
}

export const ConversationSidebar = ({
  conversations,
  activeConversation,
  onConversationSelect,
  onNewConversation,
  onConversationsChange,
}: ConversationSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) {
      toast.error("ርዕሱ ባዶ መሆን አይችልም");
      return;
    }

    try {
      const { error } = await supabase
        .from("conversations")
        .update({ title: editTitle })
        .eq("id", id);

      if (error) throw error;

      toast.success("ርዕስ ተቀይሯል");
      setEditingId(null);
      setEditTitle("");
      onConversationsChange();
    } catch (error) {
      console.error("Error renaming conversation:", error);
      toast.error("ርዕስ መቀየር አልተቻለም");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("ውይይት ተሰርዟል");
      setDeleteId(null);
      
      // If we deleted the active conversation, clear it
      if (deleteId === activeConversation) {
        onConversationSelect("");
      }
      
      onConversationsChange();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("ውይይት መሰረዝ አልተቻለም");
    }
  };

  const startEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ውይይቶችን ፈልግ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button size="sm" onClick={onNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-450px)]">
          <div className="space-y-2">
            {filteredConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? "ምንም ውይይቶች አልተገኙም" : "ምንም ውይይቶች የሉም"}
              </p>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative rounded-lg border transition-all ${
                    activeConversation === conv.id
                      ? "bg-secondary border-primary/50"
                      : "bg-card hover:border-primary/30"
                  }`}
                >
                  {editingId === conv.id ? (
                    <div className="p-2 space-y-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleRename(conv.id);
                          }
                        }}
                        autoFocus
                        className="h-8"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleRename(conv.id)}
                          className="flex-1 h-7"
                        >
                          አስቀምጥ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                          className="flex-1 h-7"
                        >
                          ሰርዝ
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onConversationSelect(conv.id)}
                      className="w-full text-left p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {conv.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(conv.updated_at).toLocaleDateString("am-ET")}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(conv);
                            }}
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(conv.id);
                            }}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ውይይት ይሰረዝ?</AlertDialogTitle>
            <AlertDialogDescription>
              ይህ ውይይት እና ሁሉም መልእክቶቹ ይሰረዛሉ። ይህን ድርጊት መመለስ አይቻልም።
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ሰርዝ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              አዎ፣ ሰርዝ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
