import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import CopyField from "./CopyField";

const WORDS = { copyLabel: "Copy", copiedLabel: "Copied.", failedLabel: "Could not copy — select the text instead." };
const FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
const PGN = '[Event "Casual"]\n[White "Carlsen"]\n[Black "Nakamura"]\n\n1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *';

const gallery: GalleryModule = {
  section: "forms",
  title: "CopyField",
  demos: [
    { name: "A FEN", render: () => <Box sx={{ maxWidth: 360 }}><CopyField label="FEN" value={FEN} {...WORDS} testId="gallery-copy-fen" /></Box> },
    { name: "A PGN — several lines", render: () => <Box sx={{ maxWidth: 360 }}><CopyField label="PGN" value={PGN} {...WORDS} testId="gallery-copy-pgn" /></Box> },
    {
      name: "Copy off, with its reason",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <CopyField label="FEN" value="8/8/8/8/8/8/8/8 w - - 0 1" disabled disabledHint="The position is not legal yet." {...WORDS} testId="gallery-copy-off" />
        </Box>
      ),
    },
  ],
};

export default gallery;
