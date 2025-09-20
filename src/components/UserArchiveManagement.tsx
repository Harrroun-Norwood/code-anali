import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ArchivedUser {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  archived_at: string;
  archived_by: string;
}

export const UserArchiveManagement = () => {
  const [archivedUsers, setArchivedUsers] = useState<ArchivedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchArchivedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, role, updated_at')
        .eq('is_active', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setArchivedUsers(data?.map(user => ({
        ...user,
        archived_at: user.updated_at,
        archived_by: 'Admin'
      })) || []);
    } catch (error) {
      console.error('Error fetching archived users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch archived users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User account restored successfully"
      });

      fetchArchivedUsers();
    } catch (error) {
      console.error('Error restoring user:', error);
      toast({
        title: "Error",
        description: "Failed to restore user account",
        variant: "destructive"
      });
    }
  };

  const permanentDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User account permanently deleted"
      });

      fetchArchivedUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to permanently delete user",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchArchivedUsers();
  }, []);

  const filteredUsers = archivedUsers.filter(user =>
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8">Loading archived users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Archived Users</CardTitle>
        <CardDescription>
          Manage archived user accounts - restore or permanently delete
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search archived users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <Alert>
            <AlertDescription>
              {searchTerm ? "No archived users match your search." : "No archived users found."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">
                      {user.first_name} {user.last_name}
                    </h3>
                    <Badge variant="secondary">{user.role}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Archived: {new Date(user.archived_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreUser(user.user_id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => permanentDelete(user.user_id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};