import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground">Manage and moderate projects</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Project moderation tools will appear here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
