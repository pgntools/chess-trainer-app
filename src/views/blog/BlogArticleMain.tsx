import Box from "@mui/material/Box";

import BlogArticle from "./BlogArticle";

/** Layout-only wrapper, as on every other screen — the shell centres and scrolls the article (CTA-130). */
const BlogArticleMain = () => (
  <Box data-testid="blog-article-wrapper">
    <BlogArticle />
  </Box>
);

export default BlogArticleMain;
