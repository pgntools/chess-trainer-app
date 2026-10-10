import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import EnginePresetForm from "./EnginePresetForm";
import { BROWSER_DEEP_ROWS, BROWSER_DEFAULT_ROWS, PRESETS, SERVER_DEEP_ROWS, SERVER_DEFAULT_ROWS } from "./fixtures";

const noop = () => {};

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "EnginePresetForm",
  demos: [
    {
      name: "The browser build on Default — every option at its default, the boards' own read-only",
      render: () => (
        <WithState initial="default">
          {(selectedId, setSelectedId) => (
            <EnginePresetForm
              engineName="Stockfish 19 Lite (single-thread)"
              presets={PRESETS}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCreate={noop}
              onRename={noop}
              onDuplicate={noop}
              onDelete={noop}
              rows={BROWSER_DEFAULT_ROWS}
              onChange={noop}
              groups={{}}
              onGroupChange={noop}
              testId="gallery-preset-default"
            />
          )}
        </WithState>
      ),
    },
    {
      name: "A preset on the browser build — set values, an option it does not declare",
      render: () => (
        <EnginePresetForm
          engineName="Stockfish 19 Lite (single-thread)"
          presets={PRESETS}
          selectedId="deep"
          onSelect={noop}
          onCreate={noop}
          onRename={noop}
          onDuplicate={noop}
          onDelete={noop}
          rows={BROWSER_DEEP_ROWS}
          onChange={noop}
          groups={{}}
          onGroupChange={noop}
          testId="gallery-preset-browser"
        />
      ),
    },
    {
      name: "The same preset on the engine server — file paths and a combo editable",
      render: () => (
        <WithState<Record<string, boolean>> initial={{ syzygy: true }}>
          {(groups, setGroups) => (
            <EnginePresetForm
              engineName="Stockfish 19 (native)"
              presets={PRESETS}
              selectedId="deep"
              onSelect={noop}
              onCreate={noop}
              onRename={noop}
              onDuplicate={noop}
              onDelete={noop}
              rows={SERVER_DEEP_ROWS}
              onChange={noop}
              groups={groups}
              onGroupChange={(group, on) => setGroups((was) => ({ ...was, [group]: on }))}
              testId="gallery-preset-server"
            />
          )}
        </WithState>
      ),
    },
    {
      name: "The engine server on Default — the Elo off until UCI_LimitStrength is, the Syzygy tablebases switched off",
      render: () => (
        <WithState<Record<string, boolean>> initial={{}}>
          {(groups, setGroups) => (
            <EnginePresetForm
              engineName="Stockfish 19 (native)"
              presets={PRESETS}
              selectedId="default"
              onSelect={noop}
              onCreate={noop}
              onRename={noop}
              onDuplicate={noop}
              onDelete={noop}
              rows={SERVER_DEFAULT_ROWS}
              onChange={noop}
              groups={groups}
              onGroupChange={(group, on) => setGroups((was) => ({ ...was, [group]: on }))}
              testId="gallery-preset-server-default"
            />
          )}
        </WithState>
      ),
    },
    {
      name: "Reading the engine's options",
      render: () => (
        <EnginePresetForm
          engineName="Stockfish 19 Lite (multi-thread)"
          presets={PRESETS.slice(0, 1)}
          selectedId="default"
          onSelect={noop}
          onCreate={noop}
          onRename={noop}
          onDuplicate={noop}
          onDelete={noop}
          rows={undefined}
          onChange={noop}
          groups={{}}
          onGroupChange={noop}
          testId="gallery-preset-reading"
        />
      ),
    },
  ],
};

export default gallery;
