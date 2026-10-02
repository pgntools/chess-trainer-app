import Box from "@mui/material/Box";

import BlogArticle from "./BlogArticle";

/** Layout-only wrapper, as on every other screen. */
const BlogArticleMain = () => (
  <Box data-testid="blog-article-wrapper" sx={{ height: "100%" }}>
    <BlogArticle />
  </Box>
);

export default BlogArticleMain;
