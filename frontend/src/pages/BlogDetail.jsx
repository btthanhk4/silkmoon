import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { blogApi } from "../services/api";
import BlogLayout from "../component/blog/BlogLayouts";
import BlogComments from "../component/blog/BlogComments";
export default function BlogDetail() {
  const { id } = useParams(),
    [post, setPost] = useState(null),
    [category, setCategory] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    Promise.all([blogApi.getPost(id), blogApi.getCategories()])
      .then(([data, categories]) => {
        setPost(data);
        setCategory(categories.find((c) => c._id === data.categoryId));
      })
      .finally(() => setLoading(false));
  }, [id]);
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center">
        Đang tải bài viết…
      </div>
    );
  if (!post)
    return (
      <div className="min-h-screen grid place-items-center">
        Bài viết không tồn tại.
      </div>
    );
  return (
    <main className="pt-28 pb-20 bg-white min-h-screen">
      <BlogLayout post={post} category={category} />
      <BlogComments postId={post._id || post.id} />
    </main>
  );
}
