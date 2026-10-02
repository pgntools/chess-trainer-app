import Box from "@mui/material/Box";

import BlogIndex from "./BlogIndex";

/** Layout-only wrapper, as on every other screen. */
const BlogIndexMain = () => (
  <Box data-testid="blog-index-wrapper" sx={{ height: "100%" }}>
    <BlogIndex />
  </Box>
);

export default BlogIndexMain;
