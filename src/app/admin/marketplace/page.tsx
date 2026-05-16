import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminMarketplacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground">Moderate listings and seller applications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marketplace Moderation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Listing moderation and seller approval tools will appear here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
