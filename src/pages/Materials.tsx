import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/FileUpload';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Star, Trash2, User } from 'lucide-react';
import { UploadLikeButton } from '@/components/UploadLikeButton';
import { UploadCommentSection } from '@/components/UploadCommentSection';

interface Upload {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  download_count: number;
  rating: number;
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export const Materials = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useEffect(() => {
    fetchUploads();
  }, [user, showOnlyMine]);

  const fetchUploads = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('uploads')
        .select('*')
        .order('created_at', { ascending: false });

      if (showOnlyMine && user) {
        query = query.eq('user_id', user.id);
      }

      const { data: uploadsData, error } = await query;

      if (error) {
        console.error('Error fetching uploads:', error);
        setIsLoading(false);
        return;
      }

      if (!uploadsData || uploadsData.length === 0) {
        setUploads([]);
        setIsLoading(false);
        return;
      }

      // Fetch profiles separately
      const userIds = [...new Set(uploadsData.map(u => u.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      const uploadsWithProfiles = uploadsData.map(upload => ({
        ...upload,
        profiles: profilesMap.get(upload.user_id) || null,
      }));

      setUploads(uploadsWithProfiles);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      setIsLoading(false);
    }
  };

  const deleteUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('uploads')
        .delete()
        .eq('id', uploadId);

      if (error) {
        console.error('Error deleting upload:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete material',
          variant: 'destructive',
        });
        return;
      }

      setUploads(uploads.filter(upload => upload.id !== uploadId));
      toast({
        title: 'Success',
        description: 'Material deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete material',
        variant: 'destructive',
      });
    }
  };

  const handleLikeChange = (uploadId: string, newCount: number) => {
    setUploads(uploads.map(upload => 
      upload.id === uploadId 
        ? { ...upload, likes_count: newCount }
        : upload
    ));
  };

  const handleCommentChange = (uploadId: string, newCount: number) => {
    setUploads(uploads.map(upload => 
      upload.id === uploadId 
        ? { ...upload, comments_count: newCount }
        : upload
    ));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <Card className="p-8">
          <CardContent>
            <p className="text-center text-muted-foreground">Please sign in to view materials.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Materials</h1>
          <p className="text-muted-foreground">Share and discover study materials</p>
        </div>

        <div className="space-y-6">
          <FileUpload onUploadCreated={fetchUploads} />
          
          <div className="flex gap-2">
            <Button
              variant={showOnlyMine ? "default" : "outline"}
              onClick={() => setShowOnlyMine(!showOnlyMine)}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              Your Materials
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {showOnlyMine ? 'Your Materials' : 'All Materials'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading materials...</p>
              ) : uploads.length === 0 ? (
                <p className="text-muted-foreground">
                  {showOnlyMine 
                    ? 'No materials yet. Upload your first file above!' 
                    : 'No materials available yet.'}
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {uploads.map((upload) => (
                    <Card key={upload.id} className="p-4 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{upload.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              by{' '}
                              <Link 
                                to={`/profile/${upload.user_id}`} 
                                className="hover:underline font-medium"
                              >
                                {upload.profiles?.username || 'Anonymous'}
                              </Link>
                            </span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        {user && upload.user_id === user.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUpload(upload.id)}
                            className="text-destructive hover:text-destructive h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      {upload.description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {upload.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span>{upload.file_type}</span>
                        {upload.file_size && (
                          <span>{(upload.file_size / 1024 / 1024).toFixed(1)} MB</span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UploadLikeButton
                              uploadId={upload.id}
                              likesCount={upload.likes_count || 0}
                              onLikeChange={(newCount) => handleLikeChange(upload.id, newCount)}
                            />
                            <UploadCommentSection
                              uploadId={upload.id}
                              commentsCount={upload.comments_count || 0}
                              onCommentChange={(newCount) => handleCommentChange(upload.id, newCount)}
                            />
                          </div>
                          
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                            <a href={upload.file_url} download>
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
