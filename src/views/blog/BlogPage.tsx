import { Navigate, useLocation } from "react-router";

import { blogPageOf, blogPathOf } from "./articles";
import BlogArticle from "./BlogArticle";
import BlogIndex from "./BlogIndex";

/**
 * **Every page of the Blog** (CTA-135) — what its one route, `/blog/*`,
 * renders for the address: an article; a folder, or the Blog's own index;
 * an old address an article lists in its `redirectFrom`, which moves on to
 * the article; anything else, the article page's "no such article". Nothing
 * here is per article, so an article is a file and nothing more.
 */
function BlogPage() {
  const { pathname, search, hash } = useLocation();
  const page = blogPageOf(blogPathOf(pathname));
  if (page.kind === "redirect") return <Navigate to={{ pathname: `/blog/${page.to.path}`, search, hash }} replace />;
  return page.kind === "folder" ? <BlogIndex /> : <BlogArticle />;
}

export default BlogPage;
