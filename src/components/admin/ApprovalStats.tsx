import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";

export function ApprovalStats() {
  const { data: stats } = useQuery({
    queryKey: ["approval-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_approval_queue")
        .select("status");

      if (error) throw error;

      const pending = data.filter((item) => item.status === "pending").length;
      const approved = data.filter((item) => item.status === "approved").length;
      const rejected = data.filter((item) => item.status === "rejected").length;
      const total = data.length;
      const approvalRate = total > 0 ? (approved / total) * 100 : 0;

      return { pending, approved, rejected, total, approvalRate };
    },
  });

  const statCards = [
    {
      title: "Pending Review",
      value: stats?.pending || 0,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Approved",
      value: stats?.approved || 0,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Rejected",
      value: stats?.rejected || 0,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Approval Rate",
      value: `${stats?.approvalRate.toFixed(1) || 0}%`,
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
            <div className={`${stat.bgColor} p-3 rounded-lg`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
