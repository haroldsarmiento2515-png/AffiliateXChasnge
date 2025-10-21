import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Plus, Trash2 } from "lucide-react";

export default function PaymentSettings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [payoutMethod, setPayoutMethod] = useState("etransfer");
  const [payoutEmail, setPayoutEmail] = useState("");

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

  const { data: paymentMethods } = useQuery<any[]>({
    queryKey: ["/api/payment-settings"],
    enabled: isAuthenticated,
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/payment-settings", {
        payoutMethod,
        payoutEmail,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-settings"] });
      toast({
        title: "Success",
        description: "Payment method added successfully",
      });
      setPayoutEmail("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add payment method",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg">Loading...</div>
    </div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Payment Settings</h1>
        <p className="text-muted-foreground mt-1">Configure how you receive payments</p>
      </div>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle>Saved Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {!paymentMethods || paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No payment methods yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add a payment method to receive payouts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method: any) => (
                <Card key={method.id} className="border-card-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium capitalize">{method.payoutMethod.replace('_', ' ')}</div>
                          <div className="text-sm text-muted-foreground">{method.payoutEmail}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.isDefault && <Badge>Default</Badge>}
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle>Add Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="method">Payout Method</Label>
            <Select value={payoutMethod} onValueChange={setPayoutMethod}>
              <SelectTrigger id="method" data-testid="select-payout-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="etransfer">E-Transfer</SelectItem>
                <SelectItem value="wire">Wire/ACH</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={payoutEmail}
              onChange={(e) => setPayoutEmail(e.target.value)}
              data-testid="input-payout-email"
            />
          </div>

          <Button
            onClick={() => addPaymentMethodMutation.mutate()}
            disabled={!payoutEmail || addPaymentMethodMutation.isPending}
            className="gap-2"
            data-testid="button-add-payment"
          >
            <Plus className="h-4 w-4" />
            {addPaymentMethodMutation.isPending ? "Adding..." : "Add Payment Method"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
