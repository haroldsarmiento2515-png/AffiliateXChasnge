import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function CompanyOfferCreate() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    productUrl: "",
    commissionType: "per_sale" as const,
    commissionRate: "",
    commissionAmount: "",
    status: "draft" as const,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to create offers",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const createOfferMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/offers", "POST", {
        ...data,
        commissionRate: data.commissionRate ? parseFloat(data.commissionRate) : null,
        commissionAmount: data.commissionAmount ? parseFloat(data.commissionAmount) : null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Offer Created",
        description: "Your offer has been created successfully",
      });
      setLocation("/company/offers");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create offer",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an offer title",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an offer description",
        variant: "destructive",
      });
      return;
    }

    if (!formData.productUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a product URL",
        variant: "destructive",
      });
      return;
    }

    if (formData.commissionType === "per_sale" && !formData.commissionRate) {
      toast({
        title: "Validation Error",
        description: "Please enter a commission rate for per-sale offers",
        variant: "destructive",
      });
      return;
    }

    if (formData.commissionType !== "per_sale" && !formData.commissionAmount) {
      toast({
        title: "Validation Error",
        description: "Please enter a commission amount",
        variant: "destructive",
      });
      return;
    }

    createOfferMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/company/offers">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Offer</h1>
          <p className="text-muted-foreground mt-1">
            Set up an affiliate offer for creators to promote
          </p>
        </div>
      </div>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle>Offer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Offer Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Premium Fitness App Affiliate Program"
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your offer, target audience, and what makes it special..."
                rows={5}
                data-testid="input-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productUrl">Product URL *</Label>
              <Input
                id="productUrl"
                type="url"
                value={formData.productUrl}
                onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
                placeholder="https://yourproduct.com"
                data-testid="input-product-url"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commissionType">Commission Type *</Label>
                <Select
                  value={formData.commissionType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, commissionType: value })
                  }
                >
                  <SelectTrigger id="commissionType" data-testid="select-commission-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_sale">Per Sale (Percentage)</SelectItem>
                    <SelectItem value="per_lead">Per Lead (Flat Rate)</SelectItem>
                    <SelectItem value="per_click">Per Click (CPC)</SelectItem>
                    <SelectItem value="monthly_retainer">Monthly Retainer</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.commissionType === "per_sale" ? (
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Commission Rate (%) *</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commissionRate}
                    onChange={(e) =>
                      setFormData({ ...formData, commissionRate: e.target.value })
                    }
                    placeholder="e.g., 10"
                    data-testid="input-commission-rate"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="commissionAmount">Commission Amount ($) *</Label>
                  <Input
                    id="commissionAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.commissionAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, commissionAmount: e.target.value })
                    }
                    placeholder="e.g., 50.00"
                    data-testid="input-commission-amount"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Draft offers are not visible to creators
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={createOfferMutation.isPending}
                data-testid="button-create-offer"
              >
                {createOfferMutation.isPending ? "Creating..." : "Create Offer"}
              </Button>
              <Link href="/company/offers">
                <Button type="button" variant="outline" data-testid="button-cancel">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-card-border bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> After creating your offer, you'll need to upload 6-12
            promotional videos before it can go live. You can do this from the offer details page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
