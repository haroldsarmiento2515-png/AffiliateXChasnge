import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CompanyReviews() {
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

  const { data: offers = [] } = useQuery<any[]>({
    queryKey: ["/api/offers"],
    enabled: isAuthenticated,
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery<any[]>({
    queryKey: ["/api/reviews"],
    enabled: isAuthenticated,
  });

  // Filter reviews for this company's offers
  const companyReviews = reviews.filter((review: any) => 
    offers.some((offer: any) => offer.id === review.offerId)
  );

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  const averageRating = companyReviews.length > 0
    ? (companyReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / companyReviews.length).toFixed(1)
    : '0.0';

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
        <h1 className="text-3xl font-bold">Reviews</h1>
        <p className="text-muted-foreground mt-1">
          See what creators are saying about your offers
        </p>
      </div>

      {companyReviews.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageRating}</div>
              <div className="flex gap-1 mt-2">
                {renderStars(Math.round(parseFloat(averageRating)))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companyReviews.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {offers.length} {offers.length === 1 ? 'offer' : 'offers'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">5-Star Reviews</CardTitle>
              <Star className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companyReviews.filter((r: any) => r.rating === 5).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {companyReviews.length > 0
                  ? `${Math.round((companyReviews.filter((r: any) => r.rating === 5).length / companyReviews.length) * 100)}%`
                  : '0%'} of total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {loadingReviews ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-lg text-muted-foreground">
            Loading reviews...
          </div>
        </div>
      ) : companyReviews.length === 0 ? (
        <Card className="border-card-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Star className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Reviews from creators will appear here once they complete campaigns
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {companyReviews.map((review: any) => (
            <Card key={review.id} className="border-card-border" data-testid={`card-review-${review.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.creator?.profileImageUrl} />
                      <AvatarFallback>
                        {review.creator?.firstName?.[0] || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {review.creator?.firstName || 'Creator'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {review.offer?.title || 'Offer'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {renderStars(review.rating)}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{review.comment}</p>
                
                {review.response && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-md">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      Your Response
                    </div>
                    <p className="text-sm">{review.response}</p>
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
