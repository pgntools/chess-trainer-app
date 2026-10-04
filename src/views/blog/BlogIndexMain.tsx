import Box from "@mui/material/Box";

import BlogIndex from "./BlogIndex";

/** Layout-only wrapper, as on every other screen — the shell centres and scrolls the article (CTA-130). */
const BlogIndexMain = () => (
  <Box data-testid="blog-index-wrapper">
    <BlogIndex />
  </Box>
);

export default BlogIndexMain;
