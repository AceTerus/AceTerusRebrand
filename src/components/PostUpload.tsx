import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Camera, X, Plus, Film } from "lucide-react";

interface PostUploadProps {
  onPostCreated: () => void;
}

export const PostUpload = ({ onPostCreated }: PostUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const oversized = files.find((file) => file.size > 30 * 1024 * 1024);
    if (oversized) {
      toast({
        title: "File too large",
        description: "Each image must be under 30MB",
        variant: "destructive",
      });
      return;
    }

    // Clear any selected video when images are chosen
    setSelectedVideo(null);
    setVideoPreview(null);
    setSelectedImages(files);

    // Generate previews for all selected images
    const readers: Promise<string>[] = files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string) || "");
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((results) => setImagePreviews(results));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 300 * 1024 * 1024) {
      toast({
        title: "Video too large",
        description: "Reels must be under 300MB",
        variant: "destructive",
      });
      return;
    }

    // Clear any selected images when a video is chosen
    setSelectedImages([]);
    setImagePreviews([]);
    setSelectedVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your post",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create posts",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const mediaUrls: string[] = [];

      // Upload all selected images (if any)
      for (const file of selectedImages) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-images")
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("profile-images").getPublicUrl(fileName);
        mediaUrls.push(publicUrl);
      }

      // Upload video if selected
      if (selectedVideo) {
        const fileName = `${user.id}/${Date.now()}_${selectedVideo.name}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-images")
          .upload(fileName, selectedVideo);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("profile-images").getPublicUrl(fileName);
        mediaUrls.push(publicUrl);
      }

      // Create post (store first media as legacy image_url for compatibility)
      const { data: newPost, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: content.trim(),
          image_url: mediaUrls[0] || null,
          tags: tags,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Store all media in post_images for gallery/reel display
      if (newPost && mediaUrls.length > 0) {
        const payload = mediaUrls.map((url, index) => ({
          post_id: newPost.id,
          file_url: url,
          position: index,
        }));
        const { error: imagesError } = await supabase.from("post_images").insert(payload);
        if (imagesError) throw imagesError;
      }

      toast({
        title: "Post created!",
        description: "Your post has been shared successfully",
      });

      // Reset form
      setContent("");
      setTags([]);
      setSelectedImages([]);
      setImagePreviews([]);
      setSelectedVideo(null);
      setVideoPreview(null);
      setIsOpen(false);
      onPostCreated();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-4">
          <Button
            onClick={() => setIsOpen(true)}
            className="w-full bg-gradient-primary text-primary-foreground font-semibold rounded-xl shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4 mr-2" />
            Share a new post
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 rounded-2xl border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none"
          />

          {/* Media Upload Buttons */}
          <div className="flex items-center gap-4">
            <label htmlFor="image-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Camera className="w-4 h-4" />
                Add Photos
              </div>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
            <label htmlFor="video-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Film className="w-4 h-4" />
                Add Reel
              </div>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="relative">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                {imagePreviews.map((src, idx) => (
                  <img key={idx} src={src} alt={`Preview ${idx + 1}`} className="h-24 w-full object-cover rounded-lg" />
                ))}
              </div>
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => { setSelectedImages([]); setImagePreviews([]); }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Video Preview */}
          {videoPreview && (
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                src={videoPreview}
                controls
                className="w-full max-h-52 object-contain"
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => { setSelectedVideo(null); setVideoPreview(null); }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleAddTag} size="sm" variant="outline">
                Add
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUploading || !content.trim()}
            >
              {isUploading ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};