import Box from "@mui/material/Box";

import BlogPage from "./BlogPage";

/** Layout-only wrapper, as on every other screen — the shell centres and scrolls the article (CTA-130). */
const BlogMain = () => (
  <Box data-testid="blog-wrapper">
    <BlogPage />
  </Box>
);

export default BlogMain;
