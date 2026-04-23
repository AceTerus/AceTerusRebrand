import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Camera, X, Plus, Film, Tag } from "lucide-react";

const C = {
  cyan: '#3BD6F5', blue: '#2F7CFF', indigo: '#2E2BE5',
  ink: '#0F172A', skySoft: '#DDF3FF', indigoSoft: '#D6D4FF',
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const CARD = 'border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white overflow-hidden';
const BTN_PRIMARY = `inline-flex items-center justify-center gap-2 ${DISPLAY} font-extrabold text-sm border-[2.5px] border-[#0F172A] rounded-full px-5 py-2.5 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all text-white cursor-pointer disabled:opacity-50 disabled:pointer-events-none`;
const BTN_OUTLINE = `inline-flex items-center justify-center gap-2 ${DISPLAY} font-extrabold text-sm border-[2.5px] border-[#0F172A] rounded-full px-5 py-2.5 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all bg-white text-[#0F172A] cursor-pointer disabled:opacity-50 disabled:pointer-events-none`;

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
    const oversized = files.find((f) => f.size > 30 * 1024 * 1024);
    if (oversized) {
      toast({ title: "File too large", description: "Each image must be under 30MB", variant: "destructive" });
      return;
    }
    setSelectedVideo(null); setVideoPreview(null);
    setSelectedImages(files);
    const readers: Promise<string>[] = files.map(
      (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target?.result as string) || "");
        reader.readAsDataURL(file);
      })
    );
    Promise.all(readers).then(setImagePreviews);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024 * 1024) {
      toast({ title: "Video too large", description: "Reels must be under 300MB", variant: "destructive" });
      return;
    }
    setSelectedImages([]); setImagePreviews([]);
    setSelectedVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleAddTag = () => {
    const t = currentTag.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setCurrentTag(""); }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({ title: "Content required", description: "Please enter some content for your post", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to create posts", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const mediaUrls: string[] = [];
      for (const file of selectedImages) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("profile-images").upload(fileName, file);
        if (uploadError) throw uploadError;
        mediaUrls.push(supabase.storage.from("profile-images").getPublicUrl(fileName).data.publicUrl);
      }
      if (selectedVideo) {
        const fileName = `${user.id}/${Date.now()}_${selectedVideo.name}`;
        const { error: uploadError } = await supabase.storage.from("profile-images").upload(fileName, selectedVideo);
        if (uploadError) throw uploadError;
        mediaUrls.push(supabase.storage.from("profile-images").getPublicUrl(fileName).data.publicUrl);
      }
      const { data: newPost, error } = await supabase.from("posts").insert({
        user_id: user.id, content: content.trim(), image_url: mediaUrls[0] || null, tags,
      }).select("id").single();
      if (error) throw error;
      if (newPost && mediaUrls.length > 0) {
        const { error: imagesError } = await supabase.from("post_images").insert(
          mediaUrls.map((url, index) => ({ post_id: newPost.id, file_url: url, position: index }))
        );
        if (imagesError) throw imagesError;
      }
      toast({ title: "Post created!", description: "Your post has been shared successfully" });
      setContent(""); setTags([]); setSelectedImages([]); setImagePreviews([]);
      setSelectedVideo(null); setVideoPreview(null); setIsOpen(false);
      onPostCreated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create post", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className={CARD}>
        <div className="p-4">
          <button
            onClick={() => setIsOpen(true)}
            className={`${BTN_PRIMARY} w-full`}
            style={{ background: C.indigo }}
          >
            <Plus className="w-4 h-4" />
            Share a new post
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={CARD}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b-[2.5px] border-[#0F172A]" style={{ background: C.indigoSoft }}>
        <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.indigo }}>
          <Plus className="w-4 h-4 text-white" />
        </div>
        <p className={`${DISPLAY} font-extrabold text-lg`}>New Post</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Textarea */}
        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className={`w-full px-4 py-3 text-sm font-semibold border-[2px] border-[#0F172A] rounded-[14px] shadow-[1px_1px_0_0_#0F172A] bg-white outline-none focus:shadow-[2px_2px_0_0_#0F172A] transition-shadow placeholder:text-slate-400 resize-none`}
        />

        {/* Media buttons */}
        <div className="flex items-center gap-3">
          <label htmlFor="image-upload" className="cursor-pointer">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-[2px] border-[#0F172A] bg-white shadow-[2px_2px_0_0_#0F172A] text-xs font-extrabold font-['Baloo_2'] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all">
              <Camera className="w-3.5 h-3.5" /> Add Photos
            </div>
            <input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          </label>
          <label htmlFor="video-upload" className="cursor-pointer">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-[2px] border-[#0F172A] bg-white shadow-[2px_2px_0_0_#0F172A] text-xs font-extrabold font-['Baloo_2'] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] transition-all">
              <Film className="w-3.5 h-3.5" /> Add Reel
            </div>
            <input id="video-upload" type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
          </label>
        </div>

        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="relative border-[2px] border-[#0F172A] rounded-[14px] overflow-hidden shadow-[2px_2px_0_0_#0F172A]">
            <div className="grid grid-cols-3 gap-1 p-1 max-h-44 overflow-y-auto">
              {imagePreviews.map((src, idx) => (
                <img key={idx} src={src} alt={`Preview ${idx + 1}`} className="aspect-square w-full object-cover rounded-[10px]" />
              ))}
            </div>
            <button
              onClick={() => { setSelectedImages([]); setImagePreviews([]); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border-[2px] border-[#0F172A] flex items-center justify-center shadow-[1px_1px_0_0_#0F172A]"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Video preview */}
        {videoPreview && (
          <div className="relative border-[2px] border-[#0F172A] rounded-[14px] overflow-hidden shadow-[2px_2px_0_0_#0F172A] bg-black">
            <video src={videoPreview} controls className="w-full max-h-52 object-contain" />
            <button
              onClick={() => { setSelectedVideo(null); setVideoPreview(null); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border-[2px] border-[#0F172A] flex items-center justify-center shadow-[1px_1px_0_0_#0F172A]"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                placeholder="Add a tag…"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold border-[2px] border-[#0F172A] rounded-full shadow-[1px_1px_0_0_#0F172A] bg-white outline-none focus:shadow-[2px_2px_0_0_#0F172A] transition-shadow placeholder:text-slate-400"
              />
            </div>
            <button onClick={handleAddTag} className={BTN_OUTLINE} style={{ padding: '0.5rem 1rem' }}>Add</button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full border-[2px] border-[#0F172A] bg-white text-xs font-bold shadow-[1px_1px_0_0_#0F172A]">
                  #{tag}
                  <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button className={BTN_OUTLINE} onClick={() => setIsOpen(false)} disabled={isUploading}>Cancel</button>
          <button className={BTN_PRIMARY} style={{ background: C.indigo }} onClick={handleSubmit} disabled={isUploading || !content.trim()}>
            {isUploading ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
};
