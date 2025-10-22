import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, Users, Eye, Calendar, Upload, Trash2, Video, AlertCircle } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CompanyOfferDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, params] = useRoute("/company/offers/:id");
  const offerId = params?.id;

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

  const { data: offer, isLoading: offerLoading } = useQuery<any>({
    queryKey: [`/api/offers/${offerId}`],
    enabled: !!offerId && isAuthenticated,
  });

  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["/api/company/applications"],
    enabled: isAuthenticated,
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery<any[]>({
    queryKey: [`/api/offers/${offerId}/videos`],
    enabled: !!offerId && isAuthenticated,
  });

  // Filter applications for this offer
  const offerApplications = applications.filter((app: any) => app.offerId === offerId);

  // Video upload state
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [creatorCredit, setCreatorCredit] = useState("");
  const [originalPlatform, setOriginalPlatform] = useState("");

  const createVideoMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/offers/${offerId}/videos`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offerId}/videos`] });
      setShowVideoDialog(false);
      setVideoUrl("");
      setVideoTitle("");
      setVideoDescription("");
      setCreatorCredit("");
      setOriginalPlatform("");
      toast({
        title: "Success",
        description: "Video added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add video",
        variant: "destructive",
      });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      return await apiRequest("DELETE", `/api/offer-videos/${videoId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offerId}/videos`] });
      toast({
        title: "Success",
        description: "Video deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete video",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadUrl = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful[0]) {
      const uploadedUrl = result.successful[0].uploadURL.split("?")[0];
      setVideoUrl(uploadedUrl);
    }
  };

  const handleSubmitVideo = () => {
    if (!videoUrl || !videoTitle) {
      toast({
        title: "Error",
        description: "Video URL and title are required",
        variant: "destructive",
      });
      return;
    }

    createVideoMutation.mutate({
      videoUrl,
      title: videoTitle,
      description: videoDescription,
      creatorCredit,
      originalPlatform,
    });
  };

  const videoCount = videos.length;
  const canAddMoreVideos = videoCount < 12;
  const hasMinimumVideos = videoCount >= 6;

  if (isLoading || offerLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-2xl font-bold">Offer not found</h2>
        <Link href="/company/offers">
          <Button>Back to My Offers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/company/offers">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{offer.title}</h1>
          <p className="text-muted-foreground mt-1">{offer.productName}</p>
        </div>
        <Badge
          variant={offer.status === 'approved' ? 'default' : 'secondary'}
          data-testid="badge-status"
        >
          {offer.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offerApplications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">View Count</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offer.viewCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offer.commissionPercentage ? `${offer.commissionPercentage}%` : 
               offer.commissionAmount ? `$${offer.commissionAmount}` : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {new Date(offer.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Offer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Short Description</h3>
            <p className="text-muted-foreground">{offer.shortDescription}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Full Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{offer.fullDescription}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Primary Niche</h3>
              <Badge variant="outline">{offer.primaryNiche}</Badge>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Commission Type</h3>
              <Badge variant="outline">{offer.commissionType?.replace(/_/g, ' ')}</Badge>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Product URL</h3>
            <a 
              href={offer.productUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {offer.productUrl}
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Promotional Videos
          </CardTitle>
          <CardDescription>
            Upload 6-12 videos showcasing your product. Videos help creators understand and promote your offer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasMinimumVideos && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need at least 6 videos to publish this offer. Currently: {videoCount}/6
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {videoCount} of 12 videos uploaded
            </div>
            <Button
              onClick={() => setShowVideoDialog(true)}
              disabled={!canAddMoreVideos || createVideoMutation.isPending}
              data-testid="button-add-video"
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </div>

          {videosLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading videos...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No videos uploaded yet. Add your first video to get started.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video: any) => (
                <Card key={video.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                      <Video className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm line-clamp-1" data-testid={`text-video-title-${video.id}`}>
                        {video.title}
                      </h4>
                      {video.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      {video.creatorCredit && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Credit: {video.creatorCredit}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteVideoMutation.mutate(video.id)}
                      disabled={deleteVideoMutation.isPending}
                      data-testid={`button-delete-video-${video.id}`}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Promotional Video</DialogTitle>
            <DialogDescription>
              Upload a video that showcases your product or service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Video File</Label>
              <div className="mt-2">
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={524288000}
                  onGetUploadParameters={handleGetUploadUrl}
                  onComplete={handleUploadComplete}
                >
                  {videoUrl ? "Video Uploaded ✓" : "Upload Video"}
                </ObjectUploader>
              </div>
              {videoUrl && (
                <p className="text-xs text-muted-foreground mt-1">
                  Video uploaded successfully
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="video-title">Title *</Label>
              <Input
                id="video-title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g., Product Demo"
                data-testid="input-video-title"
              />
            </div>

            <div>
              <Label htmlFor="video-description">Description</Label>
              <Textarea
                id="video-description"
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="Brief description of the video"
                rows={3}
                data-testid="input-video-description"
              />
            </div>

            <div>
              <Label htmlFor="creator-credit">Creator Credit</Label>
              <Input
                id="creator-credit"
                value={creatorCredit}
                onChange={(e) => setCreatorCredit(e.target.value)}
                placeholder="e.g., @username"
                data-testid="input-creator-credit"
              />
            </div>

            <div>
              <Label htmlFor="original-platform">Original Platform</Label>
              <Input
                id="original-platform"
                value={originalPlatform}
                onChange={(e) => setOriginalPlatform(e.target.value)}
                placeholder="e.g., TikTok, Instagram, YouTube"
                data-testid="input-original-platform"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowVideoDialog(false)}
              data-testid="button-cancel-video"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitVideo}
              disabled={!videoUrl || !videoTitle || createVideoMutation.isPending}
              data-testid="button-submit-video"
            >
              {createVideoMutation.isPending ? "Adding..." : "Add Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {offerApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {offerApplications.slice(0, 5).map((app: any) => (
                <div key={app.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div>
                    <p className="font-medium">{app.creatorName || 'Creator'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={app.status === 'approved' ? 'default' : 'secondary'}>
                    {app.status}
                  </Badge>
                </div>
              ))}
            </div>
            {offerApplications.length > 5 && (
              <Link href="/company/applications">
                <Button variant="outline" className="w-full mt-4" data-testid="button-view-all">
                  View All Applications
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
