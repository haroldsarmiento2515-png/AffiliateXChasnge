import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DollarSign,
  Video,
  Calendar,
  Check,
  X,
  ArrowLeft,
  ExternalLink,
  User,
  Play,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CompanyRetainerDetail() {
  const [, params] = useRoute("/company/retainers/:id");
  const { toast } = useToast();
  const contractId = params?.id;
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { data: contract, isLoading } = useQuery<any>({
    queryKey: ["/api/retainer-contracts", contractId],
    enabled: !!contractId,
  });

  const { data: applications } = useQuery<any[]>({
    queryKey: ["/api/retainer-contracts", contractId, "applications"],
    enabled: !!contractId,
  });

  const { data: deliverables } = useQuery<any[]>({
    queryKey: ["/api/retainer-contracts", contractId, "deliverables"],
    enabled: !!contractId,
  });

  const approveMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      return await apiRequest("POST", `/api/retainer-applications/${applicationId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retainer-contracts", contractId, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retainer-contracts", contractId] });
      toast({
        title: "Application Approved",
        description: "The creator has been assigned to this retainer contract.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      return await apiRequest("POST", `/api/retainer-applications/${applicationId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retainer-contracts", contractId, "applications"] });
      toast({
        title: "Application Rejected",
        description: "The application has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject application",
        variant: "destructive",
      });
    },
  });

  const approveDeliverableMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return await apiRequest("POST", `/api/retainer-deliverables/${id}/approve`, {
        reviewNotes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retainer-contracts", contractId, "deliverables"] });
      toast({
        title: "Deliverable Approved",
        description: "The video has been approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve deliverable",
        variant: "destructive",
      });
    },
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return await apiRequest("POST", `/api/retainer-deliverables/${id}/request-revision`, {
        reviewNotes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retainer-contracts", contractId, "deliverables"] });
      toast({
        title: "Revision Requested",
        description: "The creator has been notified to revise the video.",
      });
      setReviewNotes({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to request revision",
        variant: "destructive",
      });
    },
  });

  const rejectDeliverableMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return await apiRequest("POST", `/api/retainer-deliverables/${id}/reject`, {
        reviewNotes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retainer-contracts", contractId, "deliverables"] });
      toast({
        title: "Deliverable Rejected",
        description: "The video has been rejected.",
      });
      setReviewNotes({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject deliverable",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="space-y-6">Loading...</div>;
  }

  if (!contract) {
    return <div className="space-y-6">Contract not found</div>;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "open":
        return "default";
      case "in_progress":
        return "secondary";
      case "completed":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getApplicationStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "approved":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const pendingApplications = applications?.filter((app: any) => app.status === "pending") || [];
  const approvedApplications = applications?.filter((app: any) => app.status === "approved") || [];
  const rejectedApplications = applications?.filter((app: any) => app.status === "rejected") || [];

  const pendingDeliverables = deliverables?.filter((d: any) => d.status === "pending_review") || [];
  const approvedDeliverables = deliverables?.filter((d: any) => d.status === "approved") || [];
  const revisionDeliverables = deliverables?.filter((d: any) => d.status === "revision_requested") || [];
  const rejectedDeliverables = deliverables?.filter((d: any) => d.status === "rejected") || [];

  const getDeliverableStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending_review":
        return "default";
      case "approved":
        return "outline";
      case "revision_requested":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/company/retainers">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold" data-testid="heading-contract-title">
              {contract.title}
            </h1>
            <Badge variant={getStatusBadgeVariant(contract.status)}>
              {contract.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground">Retainer Contract Details</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div className="text-2xl font-bold">
                ${parseFloat(contract.monthlyAmount).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Videos Per Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Video className="h-8 w-8 text-primary" />
              <div className="text-2xl font-bold">{contract.videosPerMonth}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contract Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div className="text-2xl font-bold">{contract.durationMonths} months</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="applications" data-testid="tab-applications">
            Applications ({applications?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="deliverables" data-testid="tab-deliverables">
            Deliverables ({deliverables?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>Contract Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground">{contract.description}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h4 className="font-semibold mb-1">Required Platform</h4>
                  <p className="text-muted-foreground">{contract.requiredPlatform}</p>
                </div>
                {contract.minimumFollowers && (
                  <div>
                    <h4 className="font-semibold mb-1">Minimum Followers</h4>
                    <p className="text-muted-foreground">
                      {contract.minimumFollowers.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {contract.platformAccountDetails && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Platform Account Details</h4>
                  <p className="text-muted-foreground">{contract.platformAccountDetails}</p>
                </div>
              )}

              {contract.contentGuidelines && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Content Guidelines</h4>
                  <p className="text-muted-foreground">{contract.contentGuidelines}</p>
                </div>
              )}

              {contract.brandSafetyRequirements && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Brand Safety Requirements</h4>
                  <p className="text-muted-foreground">{contract.brandSafetyRequirements}</p>
                </div>
              )}

              {contract.niches && contract.niches.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Target Niches</h4>
                  <div className="flex gap-2 flex-wrap">
                    {contract.niches.map((niche: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {niche}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          {pendingApplications.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Pending Applications ({pendingApplications.length})</h3>
              {pendingApplications.map((app: any) => (
                <Card key={app.id} className="border-card-border" data-testid={`application-card-${app.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={app.creator?.avatarUrl} />
                          <AvatarFallback>
                            {app.creator?.username?.[0]?.toUpperCase() || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">
                            {app.creator?.username || "Unknown Creator"}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Applied {format(new Date(app.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getApplicationStatusBadgeVariant(app.status)}>
                        {app.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Message</h4>
                      <p className="text-sm text-muted-foreground">{app.message}</p>
                    </div>

                    {app.portfolioLinks && app.portfolioLinks.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Portfolio Links</h4>
                        <div className="flex flex-col gap-1">
                          {app.portfolioLinks.map((link: string, index: number) => (
                            <a
                              key={index}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {link}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {app.proposedStartDate && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Proposed Start Date</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(app.proposedStartDate), "MMMM d, yyyy")}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="default"
                            className="flex-1"
                            data-testid={`button-approve-${app.id}`}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Application?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will assign {app.creator?.username} to the retainer contract and change the status to "In Progress".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => approveMutation.mutate(app.id)}>
                              Approve
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1"
                            data-testid={`button-reject-${app.id}`}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Application?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will reject the application from {app.creator?.username}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => rejectMutation.mutate(app.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {approvedApplications.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Approved ({approvedApplications.length})</h3>
              {approvedApplications.map((app: any) => (
                <Card key={app.id} className="border-card-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={app.creator?.avatarUrl} />
                          <AvatarFallback>
                            {app.creator?.username?.[0]?.toUpperCase() || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{app.creator?.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Approved {format(new Date(app.updatedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Approved</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {rejectedApplications.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-muted-foreground">
                Rejected ({rejectedApplications.length})
              </h3>
              {rejectedApplications.map((app: any) => (
                <Card key={app.id} className="border-card-border opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={app.creator?.avatarUrl} />
                          <AvatarFallback>
                            {app.creator?.username?.[0]?.toUpperCase() || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{app.creator?.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Rejected {format(new Date(app.updatedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">Rejected</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!applications || applications.length === 0 && (
            <Card className="border-card-border">
              <CardContent className="p-12 text-center">
                <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No applications received yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deliverables" className="space-y-6">
          {pendingDeliverables.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Pending Review ({pendingDeliverables.length})</h3>
              {pendingDeliverables.map((deliverable: any) => (
                <Card key={deliverable.id} className="border-card-border" data-testid={`deliverable-card-${deliverable.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-base">{deliverable.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Month {deliverable.monthNumber} - Video #{deliverable.videoNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {format(new Date(deliverable.submittedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant={getDeliverableStatusBadgeVariant(deliverable.status)}>
                        Pending Review
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {deliverable.description && (
                      <p className="text-sm text-muted-foreground">{deliverable.description}</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(deliverable.videoUrl, "_blank")}
                        data-testid={`button-view-video-${deliverable.id}`}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        View Video
                      </Button>
                      {deliverable.platformUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(deliverable.platformUrl, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View on Platform
                        </Button>
                      )}
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <label className="text-sm font-semibold">Review Notes (Optional)</label>
                      <Textarea
                        placeholder="Add feedback or notes about this video..."
                        rows={2}
                        value={reviewNotes[deliverable.id] || ""}
                        onChange={(e) =>
                          setReviewNotes({ ...reviewNotes, [deliverable.id]: e.target.value })
                        }
                        data-testid={`input-review-notes-${deliverable.id}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            approveDeliverableMutation.mutate({
                              id: deliverable.id,
                              notes: reviewNotes[deliverable.id],
                            })
                          }
                          data-testid={`button-approve-deliverable-${deliverable.id}`}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!reviewNotes[deliverable.id]) {
                              toast({
                                title: "Notes Required",
                                description: "Please add notes explaining what needs to be revised.",
                                variant: "destructive",
                              });
                              return;
                            }
                            requestRevisionMutation.mutate({
                              id: deliverable.id,
                              notes: reviewNotes[deliverable.id],
                            });
                          }}
                          data-testid={`button-request-revision-${deliverable.id}`}
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Request Revision
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!reviewNotes[deliverable.id]) {
                              toast({
                                title: "Notes Required",
                                description: "Please add notes explaining why this is being rejected.",
                                variant: "destructive",
                              });
                              return;
                            }
                            rejectDeliverableMutation.mutate({
                              id: deliverable.id,
                              notes: reviewNotes[deliverable.id],
                            });
                          }}
                          data-testid={`button-reject-deliverable-${deliverable.id}`}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {approvedDeliverables.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Approved ({approvedDeliverables.length})</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {approvedDeliverables.map((deliverable: any) => (
                  <Card key={deliverable.id} className="border-card-border">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm line-clamp-1">{deliverable.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Month {deliverable.monthNumber} - Video #{deliverable.videoNumber}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">Approved</Badge>
                      </div>
                      {deliverable.reviewedAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(deliverable.reviewedAt), "MMM d, yyyy")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {revisionDeliverables.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Revision Requested ({revisionDeliverables.length})</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {revisionDeliverables.map((deliverable: any) => (
                  <Card key={deliverable.id} className="border-card-border">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm line-clamp-1">{deliverable.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Month {deliverable.monthNumber} - Video #{deliverable.videoNumber}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">Revision</Badge>
                      </div>
                      {deliverable.reviewNotes && (
                        <p className="text-xs text-muted-foreground">{deliverable.reviewNotes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!deliverables || deliverables.length === 0 && (
            <Card className="border-card-border">
              <CardContent className="p-12 text-center">
                <Video className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No deliverables submitted yet
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
