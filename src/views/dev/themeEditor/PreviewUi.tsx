import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import { InlineAlert } from "../../../design-system/components/feedback";
import { CheckboxField, SelectField, SliderField, SwitchField, TextInputField } from "../../../design-system/components/forms";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";

/** The table sample's rows — a few players, a number column and a missing value among them. */
type Player = { id: string; name: string; rating?: number; games: number };
const PLAYERS: readonly Player[] = [
  { id: "p1", name: "Ada Lovelace", rating: 2210, games: 48 },
  { id: "p2", name: "Alan Turing", rating: 2345, games: 112 },
  { id: "p3", name: "Grace Hopper", games: 7 },
  { id: "p4", name: "Barbara Liskov", rating: 1980, games: 23 },
];
const PLAYER_COLUMNS: readonly DataTableColumn<Player, "name" | "rating" | "games">[] = [
  { id: "name", header: "Player", render: (player) => player.name, dir: "auto" },
  { id: "rating", header: "Rating", align: "end", dir: "ltr", render: (player) => player.rating ?? "—" },
  { id: "games", header: "Games", align: "end", dir: "ltr", render: (player) => player.games },
];

/** A labelled group of the sample. */
function Sample({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/**
 * **The UI sample** (CTA-115) — what the palette, type, shape and focus
 * ring are drawn on: headings, text and a link; buttons and a chip; a form;
 * the four alerts; a dialog's body; the selected nav row; a data table; and
 * a control with the keyboard's focus.
 * Its headings are paragraphs in heading styles — the page has one `h1`.
 */
export function UiPreview() {
  const [name, setName] = useState("Ocean");
  const [side, setSide] = useState("white");
  const [checked, setChecked] = useState(true);
  const [depth, setDepth] = useState(12);
  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Sample title="Type">
        <Typography variant="h1" component="p">
          Heading one
        </Typography>
        <Typography variant="h2" component="p">
          Heading two
        </Typography>
        <Typography variant="h3" component="p">
          Heading three
        </Typography>
        <Typography>
          Body text on the page. <Link component="button" type="button">A link</Link> inside it.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Secondary text — a caption, a hint, a count.
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Disabled text.
        </Typography>
      </Sample>

      <Sample title="Buttons">
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          <Button variant="contained">Contained</Button>
          <Button variant="outlined">Outlined</Button>
          <Button>Text</Button>
          <Button variant="contained" color="error">
            Delete
          </Button>
          <Button variant="contained" color="success">
            Save
          </Button>
          <Button variant="contained" disabled>
            Disabled
          </Button>
          <Chip label="A chip" />
          <Chip label="Primary" color="primary" />
        </Box>
      </Sample>

      <Sample title="The keyboard's focus">
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", p: 1 }}>
          {/* MUI's own class for a keyboard focus, set by hand: the ring as the theme draws it. */}
          <Button variant="outlined" className="Mui-focusVisible">
            A focused button
          </Button>
          <Typography variant="body2" color="text.secondary">
            The focus ring, in its colour and width.
          </Typography>
        </Box>
      </Sample>

      <Sample title="A form">
        <Box sx={{ display: "grid", gap: 2, maxWidth: 360 }}>
          <TextInputField label="Name" value={name} onChange={setName} helperText="What the theme is called." testId="theme-editor-sample-name" />
          <SelectField
            label="Side"
            value={side}
            onChange={setSide}
            options={[
              { value: "white", label: "White" },
              { value: "black", label: "Black" },
            ]}
            testId="theme-editor-sample-side"
          />
          <CheckboxField label="Show coordinates" checked={checked} onChange={setChecked} testId="theme-editor-sample-check" />
          <SwitchField label="Engine" checked={checked} onChange={setChecked} testId="theme-editor-sample-switch" />
          <SliderField label="Depth" value={depth} onChange={setDepth} min={1} max={24} testId="theme-editor-sample-slider" />
        </Box>
      </Sample>

      <Sample title="Alerts">
        <Box sx={{ display: "grid", gap: 1 }}>
          <InlineAlert severity="info" testId="theme-editor-sample-info">
            The engine is thinking.
          </InlineAlert>
          <InlineAlert severity="success" testId="theme-editor-sample-success">
            Saved.
          </InlineAlert>
          <InlineAlert severity="warning" testId="theme-editor-sample-warning">
            Unsaved changes.
          </InlineAlert>
          <InlineAlert severity="error" testId="theme-editor-sample-error">
            The save failed.
          </InlineAlert>
        </Box>
      </Sample>

      <Sample title="A dialog's body">
        <Paper elevation={8} sx={{ p: 3, maxWidth: 400, display: "grid", gap: 2 }}>
          <Typography variant="h6" component="p">
            Delete this analysis?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            It goes from Saved analyses for good.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button>Cancel</Button>
            <Button variant="contained" color="error">
              Delete
            </Button>
          </Box>
        </Paper>
      </Sample>

      <Sample title="The sidebar">
        <Paper variant="outlined" sx={{ maxWidth: 280, bgcolor: "background.sunken" }}>
          <List dense component="div">
            <ListItemButton selected>
              <ListItemText primary="Analysis Board — the screen you are on" />
            </ListItemButton>
            <ListItemButton>
              <ListItemText primary="Openings" />
            </ListItemButton>
          </List>
        </Paper>
      </Sample>

      <Sample title="A data table">
        <DataTable
          columns={PLAYER_COLUMNS}
          rows={PLAYERS}
          rowId={(player) => player.id}
          ariaLabel="A sample table"
          emptyLabel="No players yet."
          stickyHeader={false}
          testId="theme-editor-sample-table"
        />
      </Sample>
    </Box>
  );
}
