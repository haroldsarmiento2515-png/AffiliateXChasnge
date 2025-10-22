import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, Users, Eye, Calendar } from "lucide-react";

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

  // Filter applications for this offer
  const offerApplications = applications.filter((app: any) => app.offerId === offerId);

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
