import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

export default function CompanyApplications() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: applications = [], isLoading: loadingApplications } = useQuery<any[]>({
    queryKey: ["/api/company/applications"],
    enabled: isAuthenticated,
  });

  const completeApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      return await apiRequest(`/api/applications/${applicationId}/complete`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/applications"] });
      toast({
        title: "Work Approved",
        description: "Creator work has been marked as complete.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark work as complete",
        variant: "destructive",
      });
    },
  });

  const handleMarkComplete = (applicationId: string, creatorName: string) => {
    if (confirm(`Mark work as complete for ${creatorName}? This action cannot be undone.`)) {
      completeApplicationMutation.mutate(applicationId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Applications</h1>
        <p className="text-muted-foreground mt-1">
          Review and manage creator applications for your offers
        </p>
      </div>

      {loadingApplications ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-lg text-muted-foreground">
            Loading applications...
          </div>
        </div>
      ) : applications.length === 0 ? (
        <Card className="border-card-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Creators will appear here when they apply to your offers
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app: any) => (
            <Card key={app.id} className="border-card-border" data-testid={`card-application-${app.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={app.creator?.profileImageUrl} />
                      <AvatarFallback>
                        {app.creator?.firstName?.[0] || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {app.creator?.firstName || 'Creator'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {app.offer?.title || 'Offer'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(app.status)}
                    <Badge 
                      variant={
                        app.status === 'approved' ? 'default' : 
                        app.status === 'pending' ? 'secondary' : 
                        'destructive'
                      }
                      data-testid={`badge-status-${app.id}`}
                    >
                      {app.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Applied</div>
                    <div className="font-medium">
                      {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Total Clicks</div>
                    <div className="font-medium">{app.clickCount || 0}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Conversions</div>
                    <div className="font-medium">{app.conversionCount || 0}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Earnings</div>
                    <div className="font-medium">${app.totalEarnings || '0.00'}</div>
                  </div>
                </div>

                {app.trackingLink && (
                  <div className="p-3 bg-muted/50 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Tracking Link</div>
                    <code className="text-xs break-all">{app.trackingLink}</code>
                  </div>
                )}

                {app.status === 'approved' && !app.completedAt && (
                  <Button
                    onClick={() => handleMarkComplete(app.id, app.creator?.firstName || 'this creator')}
                    variant="outline"
                    className="w-full"
                    disabled={completeApplicationMutation.isPending}
                    data-testid={`button-mark-complete-${app.id}`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {completeApplicationMutation.isPending ? 'Processing...' : 'Mark Work Complete'}
                  </Button>
                )}

                {app.completedAt && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      Work completed {formatDistanceToNow(new Date(app.completedAt), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
