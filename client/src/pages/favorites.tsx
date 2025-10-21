import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, Play } from "lucide-react";
import { Link } from "wouter";

export default function Favorites() {
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
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: favorites } = useQuery<any[]>({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg">Loading...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Favorite Offers</h1>
        <p className="text-muted-foreground mt-1">Your saved offers for later</p>
      </div>

      {/* Favorites Grid */}
      {!favorites || favorites.length === 0 ? (
        <Card className="border-card-border">
          <CardContent className="p-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No favorites yet</h3>
            <p className="text-muted-foreground">Save offers by clicking the heart icon</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((favorite: any) => {
            const offer = favorite.offer;
            return (
              <Link key={favorite.id} href={`/offers/${offer.id}`}>
                <Card className="hover-elevate cursor-pointer border-card-border h-full" data-testid={`favorite-${offer.id}`}>
                  <div className="aspect-video relative bg-muted rounded-t-lg overflow-hidden">
                    {offer.featuredImageUrl ? (
                      <img src={offer.featuredImageUrl} alt={offer.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    {offer.isPriority && (
                      <Badge className="absolute top-2 right-2 bg-primary">
                        Featured
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold line-clamp-1">{offer.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{offer.shortDescription}</p>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">{offer.primaryNiche}</Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        <span>{offer.company?.averageRating?.toFixed(1) || '5.0'}</span>
                      </div>
                      <div className="font-mono font-semibold text-primary">
                        ${offer.commissionAmount || offer.commissionPercentage + '%'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
