import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminGroupsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Groups</h1>
        <p className="text-muted-foreground">Manage group conversations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Group moderation tools will appear here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
