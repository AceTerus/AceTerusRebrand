import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileUpload } from '@/components/FileUpload';
import { fetchMutualFollowIds } from '@/hooks/useMutualFollow';
import { useToast } from '@/hooks/use-toast';
import {
  FileText, Download, Trash2, User, Eye, File,
  FileSpreadsheet, Image as ImageIcon, Monitor,
} from 'lucide-react';
import { UploadLikeButton } from '@/components/UploadLikeButton';
import { UploadCommentSection } from '@/components/UploadCommentSection';
import { cn } from '@/lib/utils';

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

// ── File type helpers ─────────────────────────────────────────────────────────

type FileInfo = {
  label: string;
  color: string;
  bg: string;
  Icon: React.ElementType;
  canPreview: boolean;
  previewType: 'image' | 'pdf' | 'none';
};

const getFileInfo = (mimeType: string): FileInfo => {
  if (!mimeType) return { label: 'File', color: '#6b7280', bg: '#f3f4f6', Icon: File, canPreview: false, previewType: 'none' };

  if (mimeType === 'application/pdf')
    return { label: 'PDF', color: '#ef4444', bg: '#fef2f2', Icon: FileText, canPreview: true, previewType: 'pdf' };

  if (mimeType.includes('word') || mimeType === 'application/msword')
    return { label: 'Word', color: '#2563eb', bg: '#eff6ff', Icon: FileText, canPreview: false, previewType: 'none' };

  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return { label: 'PowerPoint', color: '#f97316', bg: '#fff7ed', Icon: Monitor, canPreview: false, previewType: 'none' };

  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return { label: 'Excel', color: '#16a34a', bg: '#f0fdf4', Icon: FileSpreadsheet, canPreview: false, previewType: 'none' };

  if (mimeType.startsWith('image/'))
    return { label: mimeType.split('/')[1].toUpperCase(), color: '#7c3aed', bg: '#f5f3ff', Icon: ImageIcon, canPreview: true, previewType: 'image' };

  if (mimeType === 'text/plain')
    return { label: 'Text', color: '#6b7280', bg: '#f9fafb', Icon: FileText, canPreview: false, previewType: 'none' };

  // Fallback: capitalise whatever comes after the slash
  const ext = mimeType.split('/')[1]?.toUpperCase() ?? 'File';
  return { label: ext, color: '#6b7280', bg: '#f3f4f6', Icon: File, canPreview: false, previewType: 'none' };
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// ── File type icon badge ───────────────────────────────────────────────────────

const FileTypeBadge = ({ mimeType }: { mimeType: string }) => {
  const { label, color, bg, Icon } = getFileInfo(mimeType);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, backgroundColor: bg }}
    >
      <Icon style={{ color }} className="h-3 w-3" />
      {label}
    </span>
  );
};

// ── Preview thumbnail inside the card ─────────────────────────────────────────

const InlinePreview = ({ upload, onPreview }: { upload: Upload; onPreview: () => void }) => {
  const { previewType, color, bg, Icon, label } = getFileInfo(upload.file_type);

  if (previewType === 'image') {
    return (
      <div className="overflow-hidden rounded-t-xl border-b bg-muted/30">
        <img
          src={upload.file_url}
          alt={upload.title}
          className="w-full max-h-44 object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  if (previewType === 'pdf') {
    return (
      <button
        onClick={onPreview}
        className="w-full flex flex-col items-center justify-center gap-2 py-7 border-b bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
      >
        <div
          className="flex items-center justify-center rounded-xl w-14 h-14 shadow-sm"
          style={{ backgroundColor: bg }}
        >
          <Icon className="h-7 w-7" style={{ color }} />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label} · click to preview</span>
      </button>
    );
  }

  // Non-previewable types: show a muted icon strip
  return (
    <div className="w-full flex items-center justify-center gap-2 py-6 border-b bg-muted/10">
      <div
        className="flex items-center justify-center rounded-xl w-12 h-12 shadow-sm"
        style={{ backgroundColor: bg }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
    </div>
  );
};

// ── Full-screen preview dialog ─────────────────────────────────────────────────

const PreviewDialog = ({
  upload,
  open,
  onClose,
}: {
  upload: Upload;
  open: boolean;
  onClose: () => void;
}) => {
  const { previewType, label } = getFileInfo(upload.file_type);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-base font-semibold truncate">{upload.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {previewType === 'pdf' && (
            <iframe
              src={upload.file_url}
              title={upload.title}
              className="w-full h-full border-0"
            />
          )}
          {previewType === 'image' && (
            <div className="flex items-center justify-center h-full bg-muted/20 p-4">
              <img
                src={upload.file_url}
                alt={upload.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow"
              />
            </div>
          )}
          {previewType === 'none' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <File className="h-12 w-12 opacity-40" />
              <p className="text-sm">No preview available for {label} files</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export const Materials = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [previewUpload, setPreviewUpload] = useState<Upload | null>(null);

  useEffect(() => {
    fetchUploads();
  }, [user, showOnlyMine]);

  const fetchUploads = async () => {
    try {
      setIsLoading(true);

      // Build allowed user ID list: self + mutual follows
      let allowedIds: string[] = user ? [user.id] : [];
      if (user && !showOnlyMine) {
        const mutualIds = await fetchMutualFollowIds(user.id);
        allowedIds = [user.id, ...mutualIds];
      }

      let query = supabase
        .from('uploads')
        .select('*')
        .order('created_at', { ascending: false });

      if (showOnlyMine && user) {
        query = query.eq('user_id', user.id);
      } else if (allowedIds.length > 0) {
        query = query.in('user_id', allowedIds);
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

      const userIds = [...new Set(uploadsData.map(u => u.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      setUploads(uploadsData.map(upload => ({
        ...upload,
        profiles: profilesMap.get(upload.user_id) || null,
      })));
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase.from('uploads').delete().eq('id', uploadId);
      if (error) throw error;

      setUploads(prev => prev.filter(u => u.id !== uploadId));
      toast({ title: 'Material deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete material', variant: 'destructive' });
    }
  };

  const handleLikeChange = (uploadId: string, newCount: number) => {
    setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, likes_count: newCount } : u));
  };

  const handleCommentChange = (uploadId: string, newCount: number) => {
    setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, comments_count: newCount } : u));
  };

  const extractStoragePath = (fileUrl: string) => {
    try {
      const url = new URL(fileUrl);
      const prefix = '/storage/v1/object/public/user-uploads/';
      const idx = url.pathname.indexOf(prefix);
      if (idx === -1) return null;
      return decodeURIComponent(url.pathname.substring(idx + prefix.length));
    } catch {
      return null;
    }
  };

  const handleDownload = async (upload: Upload) => {
    try {
      const storagePath = extractStoragePath(upload.file_url);
      let blob: Blob | null = null;

      if (storagePath) {
        const { data, error } = await supabase.storage.from('user-uploads').download(storagePath);
        if (error || !data) throw error || new Error('Unable to download file');
        blob = data;
      } else {
        const response = await fetch(upload.file_url);
        if (!response.ok) throw new Error('Download failed');
        blob = await response.blob();
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const originalFileName = storagePath?.split('/').pop() || upload.file_url.split('/').pop() || upload.title;
      const fileName = originalFileName?.includes('_')
        ? originalFileName.substring(originalFileName.indexOf('_') + 1)
        : originalFileName;
      const extension = upload.file_type?.split('/')[1] || 'file';
      link.download = fileName || `${upload.title}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      await supabase
        .from('uploads')
        .update({ download_count: (upload.download_count || 0) + 1 })
        .eq('id', upload.id);

      setUploads(prev =>
        prev.map(u => u.id === upload.id ? { ...u, download_count: (u.download_count || 0) + 1 } : u)
      );

      toast({ title: 'Download started', description: `Downloading ${upload.title}` });
    } catch {
      toast({ title: 'Download failed', description: 'Unable to download the file. Please try again.', variant: 'destructive' });
    }
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
      <div className="container mx-auto px-4 pt-8 pb-20 lg:pb-8 max-w-5xl">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-1">Materials</h1>
          <p className="text-muted-foreground">Share and discover study materials with your community</p>
        </div>

        <div className="space-y-6">
          <FileUpload onUploadCreated={fetchUploads} />

          {/* Filter toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={showOnlyMine ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlyMine(!showOnlyMine)}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              {showOnlyMine ? 'Showing your materials' : 'Your Materials'}
            </Button>
            {showOnlyMine && (
              <Button variant="ghost" size="sm" onClick={() => setShowOnlyMine(false)}>
                Show all
              </Button>
            )}
          </div>

          {/* Materials grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {showOnlyMine ? 'Your Materials' : 'All Materials'}
                {!isLoading && (
                  <Badge variant="secondary" className="ml-auto font-normal">
                    {uploads.length} {uploads.length === 1 ? 'file' : 'files'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : uploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <div className="rounded-full bg-muted p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">No materials yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {showOnlyMine
                        ? 'Upload your first file using the panel above!'
                        : 'Materials are only visible from people who follow you back.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uploads.map((upload) => {
                    const fileInfo = getFileInfo(upload.file_type);
                    const sizeLabel = formatFileSize(upload.file_size);
                    const isOwner = user && upload.user_id === user.id;

                    return (
                      <Card
                        key={upload.id}
                        className="flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 border"
                      >
                        {/* Inline preview */}
                        <InlinePreview upload={upload} onPreview={() => setPreviewUpload(upload)} />

                        <div className="flex flex-col flex-1 p-4">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm leading-snug truncate mb-1">
                                {upload.title}
                              </h3>
                              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                <span>
                                  by{' '}
                                  <Link
                                    to={`/profile/${upload.user_id}`}
                                    className="hover:underline font-medium text-foreground"
                                  >
                                    {upload.profiles?.username || 'Anonymous'}
                                  </Link>
                                </span>
                                <span className="text-border">·</span>
                                <span>{formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}</span>
                              </div>
                            </div>

                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteUpload(upload.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>

                          {/* File type + size */}
                          <div className="flex items-center gap-2 mb-3">
                            <FileTypeBadge mimeType={upload.file_type} />
                            {sizeLabel && (
                              <span className="text-[11px] text-muted-foreground">{sizeLabel}</span>
                            )}
                          </div>

                          {/* Description */}
                          {upload.description && (
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                              {upload.description}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                            <div className="flex items-center gap-1">
                              <UploadLikeButton
                                uploadId={upload.id}
                                likesCount={upload.likes_count || 0}
                                onLikeChange={(n) => handleLikeChange(upload.id, n)}
                              />
                              <UploadCommentSection
                                uploadId={upload.id}
                                commentsCount={upload.comments_count || 0}
                                onCommentChange={(n) => handleCommentChange(upload.id, n)}
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              {fileInfo.canPreview && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs gap-1 px-2"
                                  onClick={() => setPreviewUpload(upload)}
                                >
                                  <Eye className="h-3 w-3" />
                                  Preview
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 px-2"
                                onClick={() => handleDownload(upload)}
                              >
                                <Download className="h-3 w-3" />
                                {upload.download_count > 0
                                  ? `Download (${upload.download_count})`
                                  : 'Download'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full-screen preview dialog */}
      {previewUpload && (
        <PreviewDialog
          upload={previewUpload}
          open={!!previewUpload}
          onClose={() => setPreviewUpload(null)}
        />
      )}
    </div>
  );
};

export default Materials;
